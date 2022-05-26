import {
    BufferGeometry,
    Color,
    CustomBlending,
    DataTexture,
    DoubleSide,
    Float32BufferAttribute,
    FloatType,
    LuminanceAlphaFormat,
    Matrix3,
    Mesh,
    OneMinusSrcAlphaFactor,
    OrthographicCamera,
    RawShaderMaterial,
    SrcAlphaFactor,
    WebGLRenderer
} from "three";
import {VectorFieldFragShader, VectorFieldVertexShader} from "@src/layer/glsl/VectorField.glsl";
import ArrowImg from '@src/assets/arrow-right.svg'
import {getOptimalUnpackAlign, getRenderTarget} from "@src/utils";
import {buildModule} from "@src/builder";
import {loadModules} from "esri-loader";
import {_checkTimeTexNeedUpdate, _updateTimeTex, createColorStopsHandle, createImageHandle} from "@src/layer/commom";

const _mat3 = new Matrix3()
const defaultColorStops = Object.freeze([
    {value: 0, color: 'green'},
    {value: 1, color: 'red'},
])

async function ClientVectorFieldLayerBuilder() {
    let [Accessor, Layer, BaseLayerViewGL2D, projection, kernel]
        = await loadModules([
        "esri/core/Accessor",
        "esri/layers/Layer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/geometry/projection",
        "esri/kernel"
    ]);
    await projection.load();
    const VFOpts = Accessor.createSubclass({
        declaredClass: 'custom.renderers.vectorField',
        constructor: function () {
            this.gridSize = 40;
            this.sizeRange = [20, 40 / 2 ** 0.5];
            this.showGrid = false;
            this.gridWidth = 2;
            this.gridColor = "rgb(128,128,128)";
            this.arrowImg = ArrowImg;
            this.colorStops = defaultColorStops;
            this.valueRange = null;
        },
        properties: {
            gridWidth: {},
            gridColor: {},
            gridSize: {},
            sizeRange: {},
            showGrid: {},
            arrowImg: {},
            colorStops: {},
            valueRange: {}
        },
    });
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];
            this.dataset = null;
            this.colorRampReady = false;
            this.arrowTexReady = false;

            this.fullExtent = null;
            this.needUpdatePosition = true;


            this.beforeTime = null;
            this.afterTime = null;
            this.percent = 0;
            this.timeTexStrategy = null;
            this.needUpdateTimeTex = true;
            this.forceUpdateTimeTex = false;

            this.gridInfo = {
                minSize: NaN,
                maxSize: NaN,
                gridSize: NaN,
                gridWidth: NaN,
                gridColor: null
            }
        },

        attach: function () {
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
                    u_matrix: {value: new Matrix3()},
                    u_rotate: {value: new Matrix3()},
                    u_extentCoords: {
                        value: {
                            xmin: NaN,
                            ymin: NaN,
                            width: NaN,
                            height: NaN
                        }
                    },
                    u_gridInfo: {
                        value: {
                            showGrid: false,
                            gridSize: NaN,
                            minSize: NaN,
                            maxSize: NaN,
                            gridWidth: NaN,
                            gridColor: new Color()
                        }
                    },
                    u_dataInfo: {
                        value: {
                            minVal: NaN,
                            maxVal: NaN,
                            noDataVal: -9999,
                        }
                    },
                    u_percent: {value: 0},
                    u_colorRamp: {value: null},
                    u_arrowTex: {value: null},
                    u_beforeTex: {value: new DataTexture()},
                    u_afterTex: {value: new DataTexture()},
                },
                side: DoubleSide,
                vertexShader: VectorFieldVertexShader,
                fragmentShader: VectorFieldFragShader
            });
            this.mesh = new Mesh(
                new BufferGeometry()
                    .setIndex([0, 1, 2, 1, 3, 2])
                    .setAttribute('a_position', new Float32BufferAttribute(
                        new Float32Array(8),
                        2)
                    ),
                material);
            this.mesh.frustumCulled = false;
            this._handlers.push({
                remove: () => {
                    this.mesh.geometry.dispose();
                    material.uniforms.u_colorRamp.value?.dispose();
                    material.uniforms.u_arrowTex.value?.dispose();
                    material.uniforms.u_beforeTex.value?.dispose();
                    material.uniforms.u_afterTex.value?.dispose();
                    material.dispose();
                    this.renderer.dispose();
                    this.mesh = this.camera = this.renderer = null;
                }
            });
            const {view, layer} = this;
            const renderOpts = layer.renderOpts;


            const colorStopsHandle = createColorStopsHandle(this, material);
            this._handlers.push(renderOpts.watch('colorStops', colorStopsHandle));

            const arrowImgHandle = createImageHandle(() => {
                this.arrowTexReady = false;
            }, (newTexture) => {
                material.uniforms.u_arrowTex.value?.dispose();
                material.uniforms.u_arrowTex.value = newTexture;
                this.arrowTexReady = true;
                this.requestRender();
            })
            this._handlers.push(renderOpts.watch('arrowImg', arrowImgHandle));

            this._handlers.push(renderOpts.watch(['showGrid', 'gridWidth', 'gridColor'], () => {
                this.gridInfo.showGrid = !!renderOpts.showGrid;
                this.gridInfo.gridWidth = renderOpts.gridWidth;
                this.gridInfo.gridColor = renderOpts.gridColor;
                this.requestRender();
            }))
            this._handlers.push(renderOpts.watch('valueRange', () => this.requestRender()));
            const checkGrid = () => {
                const limit = Math.max(renderOpts.gridSize / 2 ** 0.5, 1);
                let [_minSize, _maxSize] = renderOpts.sizeRange || [];
                if (!_minSize || !_maxSize || _minSize > _maxSize || _maxSize > limit) {
                    console.warn('the gridSize and sizeRange not satisfied: minSize <= maxSize <= gridSize/√2')
                    return;
                }
                this.gridInfo.minSize = _minSize;
                this.gridInfo.maxSize = _maxSize;
                this.gridInfo.gridSize = renderOpts.gridSize;
                this.requestRender();
            }
            this._handlers.push(renderOpts.watch(['gridSize', 'sizeRange'], checkGrid));

            const dataHandle = () => {
                if (this.destroyed) return;
                this.dataset = null;
                layer.fullExtent = null;
                this.fullExtent = null;

                let data = layer.data;
                if (!data) {
                    this.dataset = null;
                    return;
                }

                const {cols, rows, dataArr, noDataValue = -9999, extent, flipY = true} = data;
                if (!cols || !rows || !dataArr || !extent) throw new Error('invalid VectorField data');

                const _extent = projExtent(extent);
                const size = cols * rows * 2; // uv
                dataArr.sort((a, b) => +a[0] - (+b[0]));
                const times = dataArr.map(item => +item[0]);
                const pixels = dataArr.map(item => {
                    const arr = item[1];
                    if (arr.length !== size) throw new Error(`数据长度不匹配,length:${arr.length},cols:${cols},rows:${rows}`);
                    return new Float32Array(arr);
                });
                this.dataset = {
                    times: times,
                    pixels: pixels,
                    minTime: times[0],
                    maxTime: times[times.length - 1],
                    cols: cols,
                    rows: rows,
                    texSize: [cols, rows],
                    unpackAlignment: getOptimalUnpackAlign(cols),
                    flipY: flipY,
                    format: LuminanceAlphaFormat,
                    type: FloatType,
                    noDataValue,
                    getDataByTime(t) {
                        return pixels[times.indexOf(t)];
                    },
                }
                layer.fullExtent = this.fullExtent = _extent;
                this.forceUpdateTimeTex = true;
                this.requestRender();
            }
            const projExtent = extent => {
                if (!extent) return;
                const viewSR = this.view.spatialReference;
                if (!viewSR.equals(extent)) {
                    return projection.project(extent, this.view.spatialReference);
                }
                return extent;
            }
            this._handlers.push(layer.watch('data', dataHandle));
            this._handlers.push(layer.watch('curTime', () => this.requestRender()));
            this._handlers.push(view.watch('extent', () => {
                this.needUpdatePosition = true;
                this.requestRender();
            }));

            layer.data && dataHandle();
            renderOpts.colorStops && colorStopsHandle();
            renderOpts.arrowImg && arrowImgHandle(renderOpts.arrowImg);
            checkGrid();
        },

        detach: function () {
            this._handlers.forEach(i => i.remove?.())
            this._handlers = [];
        },

        render: function (renderParameters) {
            if (this.destroyed) return;
            const {layer, dataset, fullExtent, arrowTexReady, colorRampReady} = this;
            const {renderOpts} = layer;
            if (!colorRampReady
                || !arrowTexReady
                || !dataset
                || !layer.visible
                || !renderOpts.valueRange
                || !dataset
                || !fullExtent
                || !this.view.extent.intersects(fullExtent)
            ) return

            this.updatePosition();
            this.checkTimeTexNeedUpdate();
            this.updateRenderParams(renderParameters.state);

            const gl = this.context;
            const {renderer, mesh, camera} = this;
            const {framebuffer, viewport} = getRenderTarget.call(this, kernel.version);
            renderer.resetState();
            renderer.setViewport(viewport[0], viewport[1], viewport[2], viewport[3]);
            renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            renderer.render(mesh, camera);
        },

        updateRenderParams(state) {
            const {mesh, layer, view, dataset, gridInfo, fullExtent: extent} = this;
            const uniform = mesh.material.uniforms;
            const rotate = -(Math.PI * state.rotation) / 180;
            uniform.u_rotate.value = rotate;
            uniform.u_matrix.value.identity()
                .premultiply(
                    _mat3.identity().scale(
                        1 / state.resolution,
                        -1 / state.resolution
                    )
                )
                .premultiply(
                    _mat3.identity().rotate(rotate)
                )
                .premultiply(
                    _mat3.identity().translate(
                        state.size[0] / 2,
                        state.size[1] / 2
                    )
                )
                .premultiply(
                    _mat3.identity().scale(
                        2 / state.size[0],
                        -2 / state.size[1]
                    )
                )
                .premultiply(
                    _mat3.identity().translate(-1, 1)
                )

            let {x, y} = view.toScreen({
                spatialReference: extent.spatialReference,
                x: extent.xmin,
                y: extent.ymin
            });
            y = -y + state.size[1];
            const r = view.resolution, dpr = state.pixelRatio;
            uniform.u_extentCoords.value = {
                xmin: x * dpr,
                ymin: y * dpr,
                width: extent.width * dpr / r,
                height: extent.height * dpr / r
            }

            uniform.u_dataInfo.value = {
                minVal: layer.renderOpts.valueRange[0],
                maxVal: layer.renderOpts.valueRange[1],
                noDataVal: dataset.noDataValue,
            }

            uniform.u_gridInfo.value.showGrid = gridInfo.showGrid;
            uniform.u_gridInfo.value.gridSize = gridInfo.gridSize * dpr;
            uniform.u_gridInfo.value.minSize = gridInfo.minSize * dpr;
            uniform.u_gridInfo.value.maxSize = gridInfo.maxSize * dpr;
            uniform.u_gridInfo.value.gridWidth = gridInfo.gridWidth * dpr;
            uniform.u_gridInfo.value.gridColor.set(gridInfo.gridColor);

            uniform.u_percent.value = this.percent;

            //tex
            if (this.needUpdateTimeTex) {
                _updateTimeTex.call(this, uniform)
            }
        },
        updatePosition() {
            if (!this.needUpdatePosition) return;
            const extent = this.fullExtent;
            if (!extent) return;
            const center = this.view.state.center;
            const cx = center[0], cy = center[1];
            const vertices = new Float32Array([
                extent.xmin - cx, extent.ymax - cy,
                extent.xmin - cx, extent.ymin - cy,
                extent.xmax - cx, extent.ymax - cy,
                extent.xmax - cx, extent.ymin - cy
            ]);
            this.mesh.geometry.setAttribute(
                'a_position',
                new Float32BufferAttribute(vertices, 2)
            );
            this.needUpdatePosition = false;
        },
        checkTimeTexNeedUpdate() {
            _checkTimeTexNeedUpdate.call(this)
        },
    });
    return Layer.createSubclass({
        constructor: function () {
            this.curTime = null;
            this.data = null;
            Object.defineProperties(this, {
                _vf: {
                    enumerable: false,
                    writable: false,
                    configurable: false,
                    value: new VFOpts()
                },
            });
        },
        properties: {
            curTime: {},
            data: {},
            renderOpts: {
                get() {
                    return this._vf;
                },
                set(v) {
                    Object.assign(this._vf, v || {});
                }
            },
            blendMode: {},
            effect: {}
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

export async function loadClientVectorFieldLayer(opts) {
    const ctor = await buildModule(ClientVectorFieldLayerBuilder)
    return new ctor(opts);
}
