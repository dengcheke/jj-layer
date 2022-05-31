import {createVersionChecker, doubleToTwoFloats, getRenderTarget, id2RGBA, RGBA2Id, versionErrCatch} from "@src/utils";
import {
    BufferGeometry,
    CustomBlending,
    Float32BufferAttribute,
    MathUtils,
    Matrix3,
    Mesh,
    NoBlending,
    OneMinusSrcAlphaFactor,
    OrthographicCamera,
    RawShaderMaterial,
    SrcAlphaFactor,
    Uint8ClampedBufferAttribute,
    Vector2,
    Vector4,
    WebGLRenderer,
    WebGLRenderTarget
} from 'three'
import {FlowLineFragShader, FlowLineVertexShader} from "@src/layer/glsl/FlowLine.glsl";
import {buildModule} from "@src/builder";
import {WORKER_PATH} from "@src/layer/commom";
import {loadModules} from "esri-loader";


const DEFAULT_CONFIG = {
    color: "#ff0000",
    width: 8,
    minAlpha: 0.1,
    speed: 0.2,
    length: 0.35,
    cycle: 0.5,
}
const _mat3 = new Matrix3();
const Flags = Object.freeze({
    data: 'data',
    appear: 'appear'
})

async function FlowingLineLayerBuilder() {
    const [
        Color, Accessor, watchUtils, GraphicsLayer,
        BaseLayerViewGL2D, Extent, workers, kernel
    ] = await loadModules([
        "esri/Color",
        "esri/core/Accessor",
        "esri/core/watchUtils",
        "esri/layers/GraphicsLayer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/geometry/Extent",
        "esri/core/workers",
        "esri/kernel"
    ]);

    const ARCGIS_VERSION = parseFloat(kernel.version);
    const Trail = Accessor.createSubclass({
        declaredClass: 'custom.trail',
        constructor: function () {
            this.minAlpha = DEFAULT_CONFIG.minAlpha;
            this.speed = DEFAULT_CONFIG.speed;
            this.length = DEFAULT_CONFIG.length;
            this.cycle = DEFAULT_CONFIG.cycle;
        },
        properties: {
            minAlpha: {},
            length: {},
            speed: {},
            cycle: {},
        }
    });
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];

            this.fullExtent = null;
            this.meshes = null;

            this.defaultColor = new Color(DEFAULT_CONFIG.color);
            this.defaultWidth = DEFAULT_CONFIG.width;

            this.updateFlags = new Set();
        },

        attach: function () {
            const self = this;
            this.renderer = new WebGLRenderer({
                canvas: this.context.canvas,
                gl: this.context,
            });
            this.renderer.autoClear = false;
            this.camera = new OrthographicCamera();
            this.camera.position.set(0, 0, 1000);
            this.camera.updateProjectionMatrix();

            const material = new RawShaderMaterial({
                blending: CustomBlending,
                blendSrc: SrcAlphaFactor,
                blendDst: OneMinusSrcAlphaFactor,
                uniforms: {
                    u_transform: {value: new Matrix3()},
                    u_rotation: {value: new Matrix3()},
                    u_display: {value: new Matrix3()},
                    u_center: {value: new Vector4()},
                    u_resolution: {value: this.view.state.resolution},
                    u_offsetScale: {value: new Vector2(1, 1)},
                    u_trail: {
                        value: {
                            speed: 0.2,
                            length: 0.35,
                            cycle: 0.5,
                            minAlpha: 0.1
                        }
                    },
                    u_time: {value: performance.now()},
                    u_isPick: {value: false}
                },
                vertexShader: FlowLineVertexShader,
                fragmentShader: FlowLineFragShader,
            });
            this.lineMesh = new Mesh(new BufferGeometry(), material);
            this.lineMesh.frustumCulled = false;

            const pickRT = new WebGLRenderTarget(1, 1);
            const pixelBuffer = new Uint8Array(4);
            this.pickObj = {pickRT, pixelBuffer}

            let visibleWatcher = null;
            const check = createVersionChecker('graphics');
            const meshCache = new WeakMap();
            const projExtentCache = new WeakMap();
            const handleDataChange = async () => {
                if (this.destroyed) return;
                const graphics = this.layer.graphics.items;
                const viewSR = this.view.spatialReference;
                {
                    //this.layer.fullExtent = null;
                    this.fullExtent = null;
                    this.updateFlags.clear();
                    this.meshes = null;
                    visibleWatcher?.remove();
                    visibleWatcher = null;
                }
                if (!graphics.length) {
                    this.requestRender();
                    return;
                }

                check(async () => {
                    let fullExtent = null;
                    const connect = await workers.open(WORKER_PATH);
                    const task = graphics.map(async (g, idx) => {
                        if (!meshCache.has(g.geometry)) {
                            const {mesh, extent} = await connect.invoke(
                                'tessellateFlowLine',
                                JSON.stringify({
                                    sr: viewSR.toJSON(),
                                    geometry: g.geometry.toJSON()
                                })
                            );
                            meshCache.set(g.geometry, mesh);
                            projExtentCache.set(g.geometry, new Extent(extent));
                        }
                        const mesh = meshCache.get(g.geometry);
                        const extent = projExtentCache.get(g.geometry);
                        if (!fullExtent) {
                            fullExtent = extent.clone();
                        } else {
                            fullExtent.union(extent);
                        }
                        return {
                            mesh,
                            attributes: g.attributes || {},
                            pickId: idx + 1,
                            graphic: g
                        }
                    });
                    const meshes = await Promise.all(task);
                    return {meshes, fullExtent}
                }).then(({fullExtent, meshes}) => {
                    this.meshes = meshes;
                    {
                        let vertexCount = 0, indexCount = 0;
                        for (let i = 0; i < meshes.length; i++) {
                            const mesh = meshes[i].mesh;
                            for (let j = 0; j < mesh.length; j++) {
                                const {vertices, indices} = mesh[j];
                                vertexCount += vertices.length;
                                indexCount += indices.length;
                            }
                        }
                        this.meshes.vertexCount = vertexCount;
                        this.meshes.indexCount = indexCount;
                    }
                    this.layer.fullExtent = this.fullExtent = fullExtent;
                    visibleWatcher = createVisibleWatcher(graphics);
                    this.updateFlags.add(Flags.data);
                    this.requestRender();
                }).catch(versionErrCatch)
            };
            this._handlers.push(watchUtils.on(this,
                "layer.graphics", "change",
                handleDataChange, handleDataChange
            ));
            this._handlers.push(this.layer.renderOpts.watch(["minAlpha", "length", "speed", "cycle"], () => this.requestRender()))
            this._handlers.push({
                remove: () => {
                    visibleWatcher?.remove();
                    material.dispose();
                    this.lineMesh.geometry.dispose();
                    pickRT.dispose();
                    this.renderer.dispose();

                    this.pickObj = null;
                    this.lineMesh = null;
                    this.camera = null;
                    this.renderer = null;
                }
            })

            function createVisibleWatcher(graphics) {
                const offs = graphics.map(g => g.watch('visible', () => {
                    self.updateFlags.add(Flags.appear);
                    self.requestRender();
                }))
                return {
                    remove: () => {
                        offs.forEach(h => h.remove())
                    }
                }
            }
        },

        detach: function () {
            this._handlers.forEach(i => i.remove());
            this._handlers = [];
        },

        render: function ({state}) {
            if (this.destroyed) return;
            const {layer, meshes, fullExtent} = this;
            if (!meshes?.vertexCount
                || !layer.visible
                || !fullExtent
                || !state.extent.intersects(fullExtent)
            ) return;
            const hasShow = this.layer.graphics.find(g => g.visible);
            if (!hasShow) return;

            this.updateBufferData()
            this.updateRenderParams(state);

            const gl = this.context;
            const {renderer, lineMesh, camera} = this;
            const {framebuffer, viewport} = getRenderTarget.call(this, ARCGIS_VERSION);
            renderer.resetState();
            renderer.setViewport(viewport[0], viewport[1], viewport[2], viewport[3]);
            renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            renderer.render(lineMesh, camera);
            this.requestRender()
        },

        updateBufferData: function () {
            if (this.destroyed || !this.updateFlags.size) return;
            const {lineMesh} = this;

            const dataChange = this.updateFlags.has(Flags.data),
                appearChange = dataChange || this.updateFlags.has(Flags.appear);

            const {vertexCount, indexCount} = this.meshes;
            if (dataChange) {
                lineMesh.geometry.dispose();
                const geometry = lineMesh.geometry = new BufferGeometry();
                [
                    ['a_position', Float32BufferAttribute, Float32Array, 4, false],
                    ['a_offset', Float32BufferAttribute, Float32Array, 2, false],
                    ['a_distance', Float32BufferAttribute, Float32Array, 1, false],
                    ['a_totalDis', Float32BufferAttribute, Float32Array, 1, false],
                    ['a_distance_width_delta', Float32BufferAttribute, Float32Array, 1, false],
                    ['a_side', Float32BufferAttribute, Float32Array, 1, false],
                    ['a_width', Float32BufferAttribute, Float32Array, 1, false],
                    ['a_color', Uint8ClampedBufferAttribute, Uint8ClampedArray, 4, true],
                    ['a_pick_color', Uint8ClampedBufferAttribute, Uint8ClampedArray, 4, true],
                    ['a_visible', Uint8ClampedBufferAttribute, Uint8ClampedArray, 1, false],
                ].map(([name, ctor, typeArr, itemSize, normalized]) => {
                    geometry.setAttribute(
                        name,
                        new ctor(new typeArr(itemSize * vertexCount), itemSize, normalized)
                    );
                })
            }
            const geometry = lineMesh.geometry;
            const posBuf = geometry.getAttribute('a_position').array;
            const offsetBuf = geometry.getAttribute('a_offset').array;
            const disBuf = geometry.getAttribute('a_distance').array;
            const totalDisBuf = geometry.getAttribute('a_totalDis').array;
            const dwdBuf = geometry.getAttribute('a_distance_width_delta').array;
            const sideBuf = geometry.getAttribute('a_side').array;
            const widthBuf = geometry.getAttribute('a_width').array;
            const colorBuf = geometry.getAttribute('a_color').array;
            const visibleBuf = geometry.getAttribute('a_visible').array;
            const pickColorBuf = geometry.getAttribute('a_pick_color').array;

            const indexData = new Array(indexCount);

            let currentVertex = 0;
            let currentIndex = 0;

            //graphic
            for (let meshIndex = 0; meshIndex < this.meshes.length; ++meshIndex) {
                const item = this.meshes[meshIndex];
                const {mesh, attributes, pickId, graphic} = item,
                    pickColor = dataChange ? id2RGBA(pickId) : null;
                const visible = graphic.visible ? 1.0 : 0.0;
                const width = attributes.width || this.defaultWidth;
                const color = appearChange
                    ? new Color(attributes.color || this.defaultColor)
                    : null
                //subpath
                for (let pathIdx = 0; pathIdx < mesh.length; pathIdx++) {
                    const {indices, vertices, totalDis} = mesh[pathIdx];
                    if (dataChange) {
                        for (let i = 0; i < indices.length; ++i) {
                            let idx = indices[i];
                            indexData[currentIndex] = currentVertex + idx;
                            currentIndex++;
                        }
                    }
                    for (let i = 0; i < vertices.length; ++i) {
                        const c4 = currentVertex * 4,
                            c2 = currentVertex * 2,
                            c41 = c4 + 1,
                            c42 = c4 + 2,
                            c43 = c4 + 3;

                        if (dataChange) {
                            const v = vertices[i], {x, y} = v;
                            const [hx, lx] = doubleToTwoFloats(x);
                            const [hy, ly] = doubleToTwoFloats(y);
                            posBuf[c4] = hx;
                            posBuf[c41] = hy;
                            posBuf[c42] = lx;
                            posBuf[c43] = ly;

                            offsetBuf[c2] = v.xOffset;
                            offsetBuf[c2 + 1] = v.yOffset;

                            disBuf[currentVertex] = v.distance;
                            totalDisBuf[currentVertex] = totalDis;
                            dwdBuf[currentVertex] = v.disWidthDelta;
                            sideBuf[currentVertex] = v.side;
                            disBuf[currentVertex] = v.distance;

                            pickColorBuf[c4] = pickColor[0];
                            pickColorBuf[c41] = pickColor[1];
                            pickColorBuf[c42] = pickColor[2];
                            pickColorBuf[c43] = pickColor[3];
                        }

                        if (appearChange) {
                            widthBuf[currentVertex] = width;

                            colorBuf[c4] = color.r;
                            colorBuf[c41] = color.g;
                            colorBuf[c42] = color.b;
                            colorBuf[c43] = color.a * 255;

                            visibleBuf[currentVertex] = visible;
                        }

                        currentVertex++;
                    }
                }
            }

            if (dataChange) {
                for (let attr in geometry.attributes) {
                    geometry.getAttribute(attr).needsUpdate = true;
                }
            }
            if (appearChange) {
                ['a_width', 'a_color', 'a_visible'].map(name => {
                    geometry.getAttribute(name).needsUpdate = true;
                })
            }

            dataChange && geometry.setIndex(indexData);
            this.updateFlags.clear();
        },

        updateRenderParams(state) {
            const {lineMesh, layer} = this;
            const trail = layer.renderOpts;
            lineMesh.material.blending = CustomBlending;
            const uniform = lineMesh.material.uniforms;
            const rotate = (Math.PI * state.rotation) / 180;
            uniform.u_rotation.value.identity().rotate(-rotate);
            uniform.u_transform.value.identity()
                .premultiply(
                    _mat3.identity().scale(
                        1 / state.resolution,
                        -1 / state.resolution
                    )
                )
                .premultiply(
                    uniform.u_rotation.value
                )
                .premultiply(
                    _mat3.identity().translate(
                        state.size[0] / 2,
                        state.size[1] / 2
                    )
                );
            uniform.u_display.value.identity()
                .premultiply(
                    _mat3.identity().scale(
                        2 / state.size[0],
                        -2 / state.size[1]
                    )
                )
                .premultiply(
                    _mat3.identity().translate(-1, 1)
                )
            const [hx, lx] = doubleToTwoFloats(state.center[0]);
            const [hy, ly] = doubleToTwoFloats(state.center[1]);
            uniform.u_trail.value = {
                minAlpha: MathUtils.clamp(+trail.minAlpha, 0, 1),
                length: MathUtils.clamp(+trail.length, 0, 1),
                speed: MathUtils.clamp(+trail.speed, 0, 1),
                cycle: MathUtils.clamp(+trail.cycle, 0, 1),
            };
            uniform.u_center.value.set(hx, hy, lx, ly);
            uniform.u_offsetScale.value.set(1, 1);
            uniform.u_resolution.value = state.resolution;
            uniform.u_isPick.value = false;
            uniform.u_time.value = performance.now() / 1000;
        },

        updateHitTestRenderParams(state, point) {
            const {lineMesh} = this;
            lineMesh.material.blending = NoBlending;
            const uniform = lineMesh.material.uniforms;
            const rotate = (Math.PI * state.rotation) / 180;

            uniform.u_rotation.value.identity().rotate(-rotate);
            uniform.u_transform.value.identity()
                .premultiply(
                    _mat3.identity().scale(
                        state.size[0] / state.resolution,
                        -state.size[1] / state.resolution
                    )
                )
                .premultiply(
                    uniform.u_rotation.value
                )
                .premultiply(
                    _mat3.identity().translate(
                        state.size[0] / 2,
                        state.size[1] / 2
                    )
                );
            uniform.u_display.value.identity()
                .premultiply(
                    _mat3.identity().scale(
                        2 / state.size[0],
                        -2 / state.size[1]
                    )
                )
                .premultiply(
                    _mat3.identity().translate(-1, 1)
                )
            const [hx, lx] = doubleToTwoFloats(point.x);
            const [hy, ly] = doubleToTwoFloats(point.y);
            uniform.u_center.value.set(hx, hy, lx, ly);
            uniform.u_isPick.value = true;
            uniform.u_offsetScale.value.set(state.size[0], state.size[1]);
        },

        hitTest: function (...args) {
            let point;
            if (ARCGIS_VERSION <= 4.21) {
                // (x, y)
                const x = args[0], y = args[1];
                point = this.view.toMap({x: x, y: y});
            } else {
                // (_mapPoint, screenPoint)
                point = args[0];
            }
            if (!this.layer.visible
                || !this.view.stationary
                || !this.fullExtent
                || !this.fullExtent.contains(point)
            ) {
                return Promise.resolve(null);
            }
            const state = this.view.state;
            const {renderer, camera, lineMesh, pickObj} = this;
            const {pickRT, pixelBuffer} = pickObj;

            this.updateHitTestRenderParams(state, point);
            renderer.resetState();
            renderer.setRenderTarget(pickRT);
            renderer.clear();
            renderer.render(lineMesh, camera);
            renderer.readRenderTargetPixels(pickRT, 0, 0, 1, 1, pixelBuffer);
            const id = RGBA2Id(pixelBuffer);
            if (id > 0) {
                const pickNdx = id - 1;
                const g = this.layer.graphics.getItemAt(pickNdx);
                return Promise.resolve(g || null);
            } else {
                return Promise.resolve(null);
            }
        },

    });
    return GraphicsLayer.createSubclass({
        constructor: function () {
            Object.defineProperties(this, {
                _renderOpts: {
                    enumerable: false,
                    writable: false,
                    configurable: false,
                    value: new Trail()
                },
            });
        },
        properties: {
            renderOpts: {
                get() {
                    return this._renderOpts;
                },
                set(v) {
                    Object.assign(this._renderOpts, v || {});
                }
            },
        },
        createLayerView: function (view) {
            if (view.type === "2d") {
                const temp = new CustomLayerView2D({
                    view: view,
                    layer: this
                });
                this.layerView = temp;
                return temp;
            } else {
                throw new Error('暂不支持3d')
            }
        },
        updateStyle() {
            if (this.layerView) {
                this.layerView.updateFlags.add(Flags.appear);
                this.layerView.requestRender();
            }
        }
    });
}

export async function loadFlowingLineLayer(opts) {
    const ctor = await buildModule(FlowingLineLayerBuilder)
    return new ctor(opts);
}
