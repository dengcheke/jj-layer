import {createVersionChecker, doubleToTwoFloats, getRenderTarget, id2RGBA, RGBA2Id, versionErrCatch} from "@src/utils";
import {
    BufferGeometry,
    CustomBlending,
    DataTexture,
    DoubleSide,
    Float32BufferAttribute,
    Matrix3,
    Mesh,
    NoBlending,
    OneMinusSrcAlphaFactor,
    OrthographicCamera,
    RawShaderMaterial,
    SrcAlphaFactor,
    Uint16BufferAttribute,
    Uint32BufferAttribute,
    Uint8ClampedBufferAttribute,
    Vector2,
    Vector4,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import {DataSeriesGraphicFragShader, DataSeriesGraphicVertexShader} from "@src/layer/glsl/DataSeries.glsl";
import {buildModule} from "@src/builder";
import {loadModules} from "esri-loader";
import {
    _checkTimeTexNeedUpdate,
    _dataHandle_updateDataTexture,
    _updateTimeTex,
    createColorStopsHandle
} from "@src/layer/commom";

const _mat3 = new Matrix3()
const DEFAULT_COLOR_STOPS = [
    {value: 0, color: 'yellow'},
    {value: 1, color: 'red'}
]
const Flags = Object.freeze({
    data: 'data',
    appear: 'appear',
    indexKey: 'indexKey'
})

export async function DataSeriesGraphicsLayerBuilder() {
    let [watchUtils, Accessor, GraphicsLayer, BaseLayerViewGL2D, geometryEngineAsync, Extent, projection, kernel]
        = await loadModules([
        "esri/core/watchUtils",
        "esri/core/Accessor",
        "esri/layers/GraphicsLayer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/geometry/geometryEngineAsync",
        "esri/geometry/Extent",
        "esri/geometry/projection",
        "esri/kernel"
    ]);
    await projection.load();
    const ARCGIS_VERSION = parseFloat(kernel.version);
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];
            this.fullExtent = null;
            this.dataset = null;
            this.indexKey = null;
            this.colorRampReady = false;

            this.meshes = null;
            this.updateFlags = new Set();

            this.texSize = null;
            this.beforeTime = null;
            this.afterTime = null;
            this.percent = 0;

            this.timeTexStrategy = null;
            this.forceUpdateTimeTex = false;
            this.needUpdateTimeTex = false;
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
                fragmentShader: DataSeriesGraphicFragShader,
            });
            this.meshObj = new Mesh(new BufferGeometry(), material);
            this.meshObj.frustumCulled = false;
            const pickRT = new WebGLRenderTarget(1, 1);
            const pixelBuffer = new Uint8Array(4);
            this.pickObj = {pickRT, pixelBuffer}
            this._handlers.push({
                remove: () => {
                    visibleWatcher?.remove();
                    this.meshObj.geometry?.dispose();
                    material.uniforms.u_colorRamp.value?.dispose();
                    material.uniforms.u_beforeTex.value?.dispose();
                    material.uniforms.u_afterTex.value?.dispose();
                    pickRT.dispose();
                    material.dispose();
                    this.renderer.dispose();
                    this.meshObj = this.renderer = this.camera = this.pickObj = null;
                }
            });

            const layer = this.layer;
            const renderOpts = layer.renderOpts;

            let visibleWatcher = null;
            const check1 = createVersionChecker('graphics');
            const meshCache = new WeakMap();
            const projGeoCache = new WeakMap();
            const _updateIndexKey = () => {
                const v = layer.indexKey;
                this.indexKey = (() => {
                    if (!v) return null;
                    if (v instanceof Function) return v;
                    if (typeof v === 'string') return g => g?.attributes?.[v];
                    throw new Error('invalid dataSeriesLayer indexKey,')
                })()
            }
            const _updateMeshIndex = () => {
                if (this.meshes) {
                    const indexKey = this.indexKey;
                    this.meshes.forEach(meshItem => {
                        meshItem.index = indexKey ? indexKey(meshItem.graphic) : meshItem.pickIdx - 1;
                        meshItem.graphic._valIndex = meshItem.index;
                    })
                    this.updateFlags.add(Flags.indexKey);
                    this.requestRender();
                }
            }
            const handleGraphicChanged = async () => {
                if (this.destroyed) return;
                const graphics = this.layer.graphics.items;
                const viewSR = this.view.spatialReference;
                {
                    this.fullExtent = null;
                    this.meshes = null;
                    this.updateFlags.clear();
                    visibleWatcher?.remove();
                    visibleWatcher = null;
                }
                if (!graphics.length) {
                    this.requestRender();
                    return;
                }
                return check1(async () => {
                    let fullExtent = null;
                    const task = graphics.map(async (g, idx) => {
                        if (!meshCache.has(g.geometry)) {
                            let geo = await geometryEngineAsync.simplify(g.geometry);
                            if (!viewSR.equals(geo.spatialReference)) {
                                geo = projection.project(geo, viewSR);
                            }
                            projGeoCache.set(g.geometry, geo);
                            const mesh = await this.processGraphic(geo, g.attributes || {});
                            meshCache.set(g.geometry, mesh)
                        }
                        const mesh = meshCache.get(g.geometry)
                        const projGeo = projGeoCache.get(g.geometry);
                        unionExtent(projGeo);
                        return {
                            mesh,
                            graphic: g,
                            pickIdx: idx + 1,
                        }
                    })
                    const meshes = await Promise.all(task);
                    return {meshes, fullExtent}

                    function unionExtent(geo) {
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
                    }
                }).then(({meshes, fullExtent}) => {
                    this.meshes = meshes;
                    _updateMeshIndex();
                    meshes.vertexCount = this.meshes.reduce(function (vertexCount, item) {
                        return vertexCount + item.mesh.vertices.length;
                    }, 0);
                    meshes.indexCount = this.meshes.reduce(function (indexCount, item) {
                        return indexCount + item.mesh.indices.length;
                    }, 0);
                    this.layer.fullExtent = this.fullExtent = fullExtent;
                    visibleWatcher = createVisibleWatcher(graphics);
                    this.updateFlags.add(Flags.data);
                    this.requestRender();
                }).catch(versionErrCatch);

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
            };
            this._handlers.push(layer.watch('indexKey', () => {
                _updateIndexKey();
                _updateMeshIndex();
            }))
            this._handlers.push(watchUtils.on(this, "layer.graphics", "change", handleGraphicChanged, handleGraphicChanged));

            const dataHandle = () => _dataHandle_updateDataTexture.call(this);
            this._handlers.push(layer.watch('data', dataHandle));

            this._handlers.push(renderOpts.watch('valueRange', () => this.requestRender()));
            this._handlers.push(layer.watch('curTime', () => this.requestRender()));

            const colorStopsHandle = createColorStopsHandle(this, material);
            this._handlers.push(renderOpts.watch('colorStops', colorStopsHandle));

            layer.indexKey && _updateIndexKey()
            layer.data && dataHandle();
            renderOpts.colorStops && colorStopsHandle();
        },

        detach: function () {
            this._handlers.forEach(i => i.remove());
            this._handlers = [];
        },

        render: function ({state}) {
            if (this.destroyed) return;
            const {layer, dataset, meshes, colorRampReady, fullExtent} = this;
            const {renderOpts} = layer;
            if (!colorRampReady
                || !layer.visible
                || !renderOpts.valueRange
                || !dataset
                || !meshes?.vertexCount
                || !fullExtent
                || !state.extent.intersects(fullExtent)
            ) return;

            const hasShow = this.layer.graphics.find(g => g.visible);
            if (!hasShow) return;

            this.updateBufferData();
            this.checkTimeTexNeedUpdate();
            this.updateRenderParams(state);

            const gl = this.context;
            const {renderer, meshObj, camera} = this;
            const {framebuffer, viewport} = getRenderTarget.call(this, ARCGIS_VERSION);
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
            uniform.u_valueRange.value.set(renderOpts.valueRange[0], renderOpts.valueRange[1]);
            const {texSize} = this.dataset;
            uniform.u_texSize.value.set(texSize[0], texSize[1]);

            if (this.needUpdateTimeTex) {
                _updateTimeTex.call(this, uniform);
            }
        },
        checkTimeTexNeedUpdate() {
            _checkTimeTexNeedUpdate.call(this)
        },
        updateBufferData: function () {
            if (this.destroyed || !this.updateFlags.size) return;
            const {meshObj, meshes} = this;
            const {vertexCount, indexCount} = meshes;
            if (!meshes || !vertexCount) return;

            const dataChange = this.updateFlags.has(Flags.data),
                indexKeyChange = dataChange || this.updateFlags.has(Flags.indexKey),
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
                });
                geometry.index = vertexCount > 65535
                    ? new Uint32BufferAttribute(new Uint32Array(indexCount), 1)
                    : new Uint16BufferAttribute(new Uint16Array(indexCount), 1);
            }

            dataChange ? dataChangeUpdateFn(meshes, meshObj.geometry)
                : appearUpdateFn(meshes, meshObj.geometry)

            this.updateFlags.clear();

            function dataChangeUpdateFn(meshes, geometry) {
                for (let meshIndex = meshes.length,
                         vertexCursor = 0,
                         indexCursor = 0,
                         indexData = geometry.index.array,
                         posBuf = geometry.getAttribute('a_position').array,
                         offsetBuf = geometry.getAttribute('a_offset').array,
                         uprightBuf = geometry.getAttribute('a_upright').array,
                         indexBuf = geometry.getAttribute('a_dataIndex').array,
                         visibleBuf = geometry.getAttribute('a_visible').array,
                         pickColorBuf = geometry.getAttribute('a_pickColor').array
                    ; meshIndex--;) {
                    const item = meshes[meshIndex];
                    //update index
                    for (let i = 0,
                             arr = item.mesh.indices,
                             len = arr.length
                        ; i < len; ++i) {
                        indexData[indexCursor] = vertexCursor + arr[i];
                        indexCursor++;
                    }

                    const pickColor = id2RGBA(item.pickIdx);
                    const visible = item.graphic.visible ? 1 : 0;
                    const upright = item.graphic.attributes?.upright ? 1 : 0;

                    for (let i = 0,
                             vertices = item.mesh.vertices,
                             len = vertices.length,
                             curVertex = null
                        ; i < len; ++i) {

                        curVertex = vertices[i];

                        const c2 = vertexCursor * 2,
                            c4 = vertexCursor * 4,
                            c41 = c4 + 1,
                            c42 = c4 + 2,
                            c43 = c4 + 3;

                        const [hx, lx] = doubleToTwoFloats(curVertex.x);
                        const [hy, ly] = doubleToTwoFloats(curVertex.y);
                        posBuf[c4] = hx;
                        posBuf[c41] = hy;
                        posBuf[c42] = lx;
                        posBuf[c43] = ly;

                        offsetBuf[c2] = curVertex.xOffset;
                        offsetBuf[c2 + 1] = curVertex.yOffset;

                        uprightBuf[vertexCursor] = upright;

                        pickColorBuf[c4] = pickColor[0];
                        pickColorBuf[c41] = pickColor[1];
                        pickColorBuf[c42] = pickColor[2];
                        pickColorBuf[c43] = pickColor[3];

                        indexBuf[vertexCursor] = item.index;
                        visibleBuf[vertexCursor] = visible;
                        vertexCursor++;
                    }
                }
            }

            function appearUpdateFn(meshes, geometry) {
                for (let meshIndex = meshes.length,
                         vertexCursor = 0,
                         indexBuf = geometry.getAttribute('a_dataIndex').array,
                         visibleBuf = geometry.getAttribute('a_visible').array
                    ; meshIndex--;) {
                    const item = meshes[meshIndex];
                    const visible = item.graphic.visible ? 1 : 0;
                    for (let i = 0,
                             vertices = item.mesh.vertices,
                             len = vertices.length
                        ; i < len; ++i) {

                        indexBuf[vertexCursor] = item.index;
                        visibleBuf[vertexCursor] = visible;
                        vertexCursor++;
                    }
                }
                geometry.getAttribute('a_dataIndex').needsUpdate = true;
                geometry.getAttribute('a_visible').needsUpdate = true;
            }
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
            effect: {},
            blendMode: {}
        },
    });
    return GraphicsLayer.createSubclass({
        constructor: function () {
            this.curTime = null;
            this.data = null;
            this.indexKey = null;
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
            indexKey: {},
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
            if (view.type !== "2d") throw new Error('?????????3d')
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
