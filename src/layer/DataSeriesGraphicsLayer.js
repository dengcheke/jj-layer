import * as esriLoader from "esri-loader"
import {
    doubleToTwoFloats,
    genColorRamp,
    getRenderTarget,
    id2RGBA,
    near2PowMax,
    RGBA2Id
} from "@src/utils";
import {
    AlphaFormat,
    BufferGeometry,
    CustomBlending,
    DataTexture,
    DoubleSide,
    Float32BufferAttribute,
    FloatType,
    Matrix3,
    Mesh,
    NoBlending,
    OneMinusSrcAlphaFactor,
    OrthographicCamera,
    RawShaderMaterial,
    SrcAlphaFactor,
    TextureLoader,
    Uint8ClampedBufferAttribute,
    Vector2,
    Vector4,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import {DataSeriesGraphicFragShader, DataSeriesGraphicVertexShader} from "@src/layer/glsl/DataSeries.glsl";
import {buildModule} from "@src/builder";

const _mat3 = new Matrix3()
const DEFAULT_COLOR_STOPS = [
    {value: 0, color: 'yellow'},
    {value: 1, color: 'red'}
]
const Flags = Object.freeze({
    data: 'data',
    appear: 'appear'
})

async function DataSeriesGraphicsLayerBuilder() {
    let [watchUtils, Accessor, GraphicsLayer, BaseLayerViewGL2D, geometryEngineAsync, Extent, projection, kernel]
        = await esriLoader.loadModules([
        "esri/core/watchUtils",
        "esri/core/Accessor",
        "esri/layers/GraphicsLayer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/geometry/geometryEngineAsync",
        "esri/geometry/Extent",
        "esri/geometry/projection",
        "esri/kernel"
    ]);
    const ARCGIS_VERSION = parseFloat(kernel.version);
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];
            this.dataset = null;


            this.updateFlags = new Set();

            this.texSize = null;
            this.beforeTime = null;
            this.afterTime = null;
            this.percent = 0;

            this.swap = false;
            this.needUpdateTimeTex = false;

            this.version = 0;
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
            const loader = new TextureLoader();
            const material = new RawShaderMaterial({
                blending: CustomBlending,
                blendSrc: SrcAlphaFactor,
                blendDst: OneMinusSrcAlphaFactor,
                uniforms: {
                    u_transform: {value: new Matrix3()},
                    u_rotation: {value: new Matrix3()},
                    u_display: {value: new Matrix3()},
                    u_center: {value: new Vector4()},
                    u_offsetScale: {value: new Vector2()},
                    u_percent: {value: performance.now()},
                    u_texSize: {value: new Vector2()},
                    u_valueRange: {value: new Vector2()},
                    u_isPick: {value: false},
                    u_colorRamp: {value: null},
                    u_beforeTex: {value: new DataTexture()},
                    u_afterTex: {value: new DataTexture()},
                },
                side: DoubleSide,
                vertexShader: DataSeriesGraphicVertexShader,
                fragmentShader: DataSeriesGraphicFragShader
            });
            this.meshObj = new Mesh(new BufferGeometry(), material);
            const pickRT = new WebGLRenderTarget(1, 1);
            const pixelBuffer = new Uint8Array(4);
            this.pickObj = {pickRT, pixelBuffer}
            this._handlers.push({
                remove: () => {
                    visibleWatcher?.remove();
                    this.meshObj.geometry.dispose();
                    material.uniforms.u_colorRamp.value?.dispose();
                    material.uniforms.u_beforeTex.value.dispose();
                    material.uniforms.u_afterTex.value.dispose();
                    this.meshObj = null;
                }
            });

            const layer = this.layer;
            const renderOpts = layer.renderOpts;
            let visibleWatcher = null;
            const handleGraphicChanged = async () => {
                if(this.destroyed) return;
                {
                    this.layer.fullExtent = null;
                    visibleWatcher?.remove();
                    visibleWatcher = null;
                    this.meshes = null;
                }
                const __version = ++this.version;
                const viewSR = this.view.spatialReference;
                let fullExtent = null;
                const graphics = this.layer.graphics;
                const task = graphics.map(async (g, idx) => {
                    if(g.geometry.cache.mesh){
                        return {
                            mesh: g.geometry.cache.mesh,
                            graphic: g,
                            index: idx,
                            pickIdx: idx + 1,//0表示没有选中
                        }
                    }else{
                        let geo = await geometryEngineAsync.simplify(g.geometry);
                        if (!viewSR.equals(geo.spatialReference)) {
                            await projection.load();
                            geo = projection.project(geo, viewSR);
                        }
                        let extent;
                        if (geo.type === 'point') {
                            extent = new Extent({
                                spatialReference: viewSR,
                                xmin: geo.x,
                                ymin: geo.y,
                                xmax: geo.x,
                                ymax: geo.y
                            })
                        } else {
                            extent = geo.extent;
                        }
                        if (!fullExtent) {
                            fullExtent = extent.clone();
                        } else {
                            fullExtent.union(extent);
                        }
                        const mesh = await this.processGraphic(geo, g.attributes || {});
                        g.geometry.cache.mesh = mesh;
                        g._valIndex = idx;
                        return {
                            mesh: mesh,
                            graphic: g,
                            index: idx,
                            pickIdx: idx + 1,
                        }
                    }
                })
                const meshes = await Promise.all(task._items);

                if(this.destroyed) return;
                if (__version !== this.version) return;
                this.meshes = meshes;
                meshes.version = __version;
                meshes.vertexCount = this.meshes.reduce(function (vertexCount, item) {
                    return vertexCount + item.mesh.vertices.length;
                }, 0);
                meshes.indexCount = this.meshes.reduce(function (indexCount, item) {
                    return indexCount + item.mesh.indices.length;
                }, 0);
                this.layer.fullExtent = fullExtent;
                visibleWatcher = createVisibleWatcher(graphics);
                this.updateFlags.add(Flags.data);
                this.requestRender();
            };
            const dataHandle = () => {
                if(this.destroyed) return;
                const data = layer.data;
                data.sort((a, b) => +a[0] - +b[0]);
                const times = data.map(item => +item[0]);
                const dataLen = data[0][1].length;
                const texSize = this.calcTexSize(dataLen);
                const totalLen = texSize[0] * texSize[1];
                const pixels = data.map(item => {
                    return alignData(item[1], totalLen);
                });
                const unpackAlign = texSize[0] % 8 === 0 ? 8 : (texSize[0] % 4 === 0 ? 4 : (texSize[0] % 2 === 0 ? 2 : 1));
                this.dataset = {
                    times: times,
                    pixels: pixels,
                    minTime: times[0],
                    maxTime: times[times.length - 1],
                    texSize,
                    unpackAlignment: unpackAlign,
                    flipY: false,
                    getDataByTime(t) {
                        return pixels[times.indexOf(t)];
                    }
                }
                this.needUpdateTimeTex = true;
                this.requestRender();

                function alignData(data, totalLen) {
                    let arr = new Float32Array(totalLen);
                    for (let i = 0; i < data.length; i++) arr[i] = data[i];
                    return arr;
                }
            }
            this._handlers.push(watchUtils.on(this, "layer.graphics", "change", handleGraphicChanged, handleGraphicChanged));
            this._handlers.push(layer.watch('curTime', () => {
                this.needUpdateTimeTex = true;
                this.requestRender();
            }));
            this._handlers.push(layer.watch('data', dataHandle));
            this._handlers.push(renderOpts.watch('valueRange', () => {
                this.requestRender();
            }));
            const colorStopsHandle = () => {
                let v = renderOpts.colorStops;
                if (!v) {
                    console.warn('colorStops is empty')
                    return
                }
                if (Array.isArray(v)) {
                    v = genColorRamp(v, 128, 1);
                }
                loader.load(v, (newTexture) => {
                    material.uniforms.u_colorRamp.value?.dispose();
                    material.uniforms.u_colorRamp.value = newTexture;
                    newTexture.isReady = true;
                    this.requestRender();
                })
            }
            this._handlers.push(renderOpts.watch('colorStops', colorStopsHandle));

            layer.data && dataHandle();
            renderOpts.colorStops && colorStopsHandle();

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
            this.version++;
            this._handlers.forEach(i => i.remove());
            this._handlers = [];
        },

        render: function (renderParameters) {
            if(this.destroyed) return;
            const state = renderParameters.state;
            if (!this.layer.visible
                || !this.layer.renderOpts.valueRange
                || !this.dataset
                || !this.layer.graphics.length
                || !this.layer.fullExtent
                || !state.extent.intersects(this.layer.fullExtent)
            ) return;
            if (!this.meshObj?.material.uniforms.u_colorRamp.value?.isReady) return;

            const hasShow = this.layer.graphics.find(g => g.visible);
            if (!hasShow) return;

            this.updateBufferData();
            this.checkTimeTexNeedUpdate();
            this.updateRenderParams(state);

            const gl = this.context;
            const {renderer, meshObj, camera} = this;
            const {framebuffer, viewport} = getRenderTarget.call(this,ARCGIS_VERSION);
            renderer.resetState();
            renderer.setViewport(viewport[0], viewport[1], viewport[2], viewport[3]);
            renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            renderer.render(meshObj, camera);
        },

        updateRenderParams: function (state) {
            const {meshObj, layer} = this;
            meshObj.material.blending = CustomBlending;
            const uniform = meshObj.material.uniforms;
            const rotate = -(Math.PI * state.rotation) / 180;
            {
                uniform.u_rotation.value.identity().rotate(rotate);
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
            }
            const [hx, lx] = doubleToTwoFloats(state.center[0]);
            const [hy, ly] = doubleToTwoFloats(state.center[1]);

            uniform.u_center.value.set(hx, hy, lx, ly);
            uniform.u_offsetScale.value.set(1, 1);
            uniform.u_isPick.value = false;
            uniform.u_percent.value = this.percent;
            const renderOpts = layer.renderOpts;
            uniform.u_valueRange.value.set(
                renderOpts.valueRange[0],
                renderOpts.valueRange[1]
            );
            const {flipY, texSize} = this.dataset;
            uniform.u_texSize.value.set(texSize[0], texSize[1]);
            if (this.needUpdateTimeTex) {
                const {beforeTime, afterTime} = this;
                let beforeTex = uniform.u_beforeTex.value;
                let afterTex = uniform.u_afterTex.value;
                [beforeTex, afterTex].forEach(tex => {
                    tex.format = AlphaFormat;
                    tex.type = FloatType;
                    tex.flipY = flipY;
                    tex.unpackAlignment = this.dataset.unpackAlignment
                })
                if (this.swap) {
                    [beforeTex, afterTex] = [afterTex, beforeTex];
                    uniform.u_beforeTex.value = beforeTex;
                    uniform.u_afterTex.value = afterTex;
                    afterTex.image = {
                        data: this.dataset.getDataByTime(afterTime),
                        width: texSize[0],
                        height: texSize[1]
                    }
                    afterTex.needsUpdate = true;
                } else {
                    beforeTex.image = {
                        data: this.dataset.getDataByTime(beforeTime),
                        width: texSize[0],
                        height: texSize[1]
                    };
                    afterTex.image = {
                        data: this.dataset.getDataByTime(afterTime),
                        width: texSize[0],
                        height: texSize[1]
                    };
                    beforeTex.needsUpdate = true;
                    afterTex.needsUpdate = true;
                }
                this.swap = false;
                this.needUpdateTimeTex = false
            }
        },
        checkTimeTexNeedUpdate() {
            const {layer, dataset} = this,
                {times} = dataset,
                curTime = layer.curTime,
                oldBefore = this.beforeTime,
                oldAfter = this.afterTime;
            const {maxTime, minTime} = dataset;
            if (oldBefore !== null && oldAfter !== null && curTime >= oldBefore && curTime <= oldAfter) {
                this.percent = (curTime - this.beforeTime) / (this.afterTime - this.beforeTime)
                return;
            }
            if (times.length === 1 || curTime < minTime) {
                this.beforeTime = this.afterTime = times[0] || 0;
                this.percent = 0;
            } else {
                if (curTime >= maxTime) {
                    this.afterTime = maxTime;
                    this.beforeTime = times[times.length - 2];
                    this.percent = 1;
                } else {
                    for (let i = 1; i < times.length; i++) {
                        if (curTime < times[i]) {
                            this.afterTime = times[i];
                            this.beforeTime = times[i - 1];
                            if (this.afterTime === this.beforeTime) {
                                this.percent = 0;
                            } else {
                                this.percent = (curTime - this.beforeTime) / (this.afterTime - this.beforeTime) || 0
                            }
                            break;
                        }
                    }
                }
            }
            if (oldBefore !== this.beforeTime || oldAfter !== this.afterTime) {
                this.needUpdateTimeTex = true;
                this.swap = oldAfter === this.beforeTime;
            }
        },
        calcTexSize: function (len) {
            if (!len) {
                return null;
            } else {
                const length = near2PowMax(len);
                const l = Math.log2(length);
                const cols = Math.ceil(l / 2);
                const rows = l - cols;
                return [2 ** cols, 2 ** rows];
            }
        },
        updateBufferData: function () {
            if (this.destroyed || !this.updateFlags.size) return;
            if (this.meshes?.version !== this.version) return;
            const {meshObj, meshes} = this;
            const {vertexCount, indexCount} = meshes;

            const dataChange = this.updateFlags.has(Flags.data),
                appearChange = dataChange || this.updateFlags.has(Flags.appear);

            if (dataChange) {
                meshObj.geometry.dispose();
                const geometry = meshObj.geometry = new BufferGeometry();
                [
                    ['a_position', Float32BufferAttribute, Float32Array, 4, false],
                    ['a_offset', Float32BufferAttribute, Float32Array, 2, false],
                    ['a_upright', Uint8ClampedBufferAttribute, Uint8ClampedArray, 1, false],
                    ['a_dataIndex', Float32BufferAttribute, Float32Array, 1, false],
                    ['a_pickColor', Uint8ClampedBufferAttribute, Uint8ClampedArray, 4, true],
                    ['a_visible', Uint8ClampedBufferAttribute, Uint8ClampedArray, 1, false],
                ].map(([name, ctor, typeArr, itemSize, normalized]) => {
                    geometry.setAttribute(
                        name,
                        new ctor(new typeArr(itemSize * vertexCount), itemSize, normalized)
                    );
                })
            }

            const geometry = meshObj.geometry;
            const posBuf = geometry.getAttribute('a_position').array;
            const offsetBuf = geometry.getAttribute('a_offset').array;
            const uprightBuf = geometry.getAttribute('a_upright').array;
            const indexBuf = geometry.getAttribute('a_dataIndex').array;
            const visibleBuf = geometry.getAttribute('a_visible').array;
            const pickColorBuf = geometry.getAttribute('a_pickColor').array;

            const indexData = new Array(indexCount);

            let currentVertex = 0;
            let currentIndex = 0;

            for (let meshIndex = 0; meshIndex < this.meshes.length; ++meshIndex) {
                const item = this.meshes[meshIndex];
                const {mesh, graphic, index} = item;

                const pickColor = id2RGBA(item.pickIdx);
                const visible = graphic.visible ? 1 : 0;
                const upright = graphic.attributes?.upright ? 1 : 0;
                for (let i = 0; i < mesh.indices.length; ++i) {
                    let idx = mesh.indices[i];
                    indexData[currentIndex] = currentVertex + idx;
                    currentIndex++;
                }

                for (let i = 0; i < mesh.vertices.length; ++i) {
                    if (dataChange) {
                        const v = mesh.vertices[i], {x, y} = v;
                        const [hx, lx] = doubleToTwoFloats(x);
                        const [hy, ly] = doubleToTwoFloats(y);
                        posBuf[currentVertex * 4] = hx;
                        posBuf[currentVertex * 4 + 1] = hy;
                        posBuf[currentVertex * 4 + 2] = lx;
                        posBuf[currentVertex * 4 + 3] = ly;

                        offsetBuf[currentVertex * 2] = v.xOffset;
                        offsetBuf[currentVertex * 2 + 1] = v.yOffset;

                        uprightBuf[currentVertex] = upright;

                        indexBuf[currentVertex] = index;

                        pickColorBuf[currentVertex * 4] = pickColor[0];
                        pickColorBuf[currentVertex * 4 + 1] = pickColor[1];
                        pickColorBuf[currentVertex * 4 + 2] = pickColor[2];
                        pickColorBuf[currentVertex * 4 + 3] = pickColor[3];

                    }
                    if (appearChange) {
                        visibleBuf[currentVertex] = visible;
                    }

                    currentVertex++;
                }
            }
            if (dataChange) {
                for (let attr in geometry.attributes) {
                    geometry.getAttribute(attr).needsUpdate = true;
                }
            }
            if (appearChange) {
                geometry.getAttribute('a_visible').needsUpdate = true;
            }
            dataChange && geometry.setIndex(indexData);
            this.updateFlags.clear();
        },
        processGraphic: function (geo, attr) {
            let size, x, y;
            switch (geo.type) {
                case "extent":
                    return this.tessellateExtent(geo);
                case "point":
                    size = attr.size || 6;
                    x = attr.x || -(size / 2);
                    y = attr.y || -(size / 2);
                    return this.tessellatePoint(geo, {
                        x: x,
                        y: y,
                        width: size,
                        height: size
                    })
                case "multipoint":
                    size = attr.size || 6;
                    x = attr.x || -(size / 2);
                    y = attr.y || -(size / 2);
                    return this.tessellateMultipoint(geo, {
                        x: x,
                        y: y,
                        width: size,
                        height: size
                    })
                case "polyline":
                    return this.tessellatePolyline(geo, attr.width || 6);
                case "polygon":
                    return this.tessellatePolygon(geo)
            }
        },

        hitTest: function (...args) {
            let point;
            if(ARCGIS_VERSION <= 4.21){
                // (x, y)
                const x = args[0], y = args[1];
                point = this.view.toMap({x: x, y: y});
            }else{
                // (_mapPoint, screenPoint)
                point = args[0];
            }

            if (!this.layer.visible
                || !this.layer.fullExtent
                || !this.layer.fullExtent.contains(point)
            ) return Promise.resolve(null);

            const state = this.view.state;
            const {renderer, camera, meshObj, pickObj} = this;
            const {pickRT, pixelBuffer} = pickObj;

            this.updateHitTestRenderParams(state, point);

            renderer.resetState();
            renderer.setRenderTarget(pickRT);
            renderer.clear();
            renderer.render(meshObj, camera);
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
        updateHitTestRenderParams(state, point) {
            const {meshObj} = this;
            meshObj.material.blending = NoBlending;
            const uniform = meshObj.material.uniforms;
            const rotate = -(Math.PI * state.rotation) / 180;

            uniform.u_rotation.value.identity().rotate(rotate);
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
    });
    const Opts = Accessor.createSubclass({
        constructor: function () {
            this.valueRange = null;
            this.colorStops = DEFAULT_COLOR_STOPS;
        },
        properties: {
            valueRange: {},
            colorStops: {},
        },
    });
    return GraphicsLayer.createSubclass({
        constructor: function () {
            this.curTime = null;
            this.data = null;
            Object.defineProperties(this, {
                _renderOpts: {
                    enumerable: false,
                    writable: false,
                    configurable: false,
                    value: new Opts()
                }
            });
        },
        properties: {
            curTime: {},
            data: {},
            renderOpts: {
                get() {
                    return this._renderOpts
                },
                set(v) {
                    Object.assign(this._renderOpts, v || {});
                }
            }
        },
        getDataByIndex(valIndex) {
            const sData = this.data;
            if (!sData) return null;
            const data = [];
            for (let i = 0; i < sData.length; i++) {
                data.push([
                    sData[i]?.[0],
                    sData[i]?.[1]?.[valIndex]
                ]);
            }
            return data;
        },

        createLayerView: function (view) {
            if (view.type !== "2d") throw new Error('不支持3d')
            return new CustomLayerView2D({
                view: view,
                layer: this
            });
        }
    });
}

export async function loadDataSeriesGraphicsLayer(opts) {
    const ctor = await buildModule(DataSeriesGraphicsLayerBuilder)
    return new ctor(opts);
}
