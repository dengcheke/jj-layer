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
    OneMinusSrcAlphaFactor,
    OrthographicCamera,
    RawShaderMaterial,
    SrcAlphaFactor,
    TextureLoader,
    Vector2,
    WebGLRenderer
} from "three";
import {ClientRasterFragShader, ClientRasterVertexShader} from "@src/layer/glsl/RasterColormap.glsl";
import {genColorRamp, getOptimalUnpackAlign, getRenderTarget, isFloat32Array} from "@src/utils";
import {buildModule} from "@src/builder";
import {loadModules} from "esri-loader";
import {_checkTimeTexNeedUpdate, _updateTimeTex, createColorStopsHandle, valueRangeValidate} from "@src/layer/commom";

const _mat3 = new Matrix3();
const defaultColorStops = Object.freeze([
    {value: 0, color: 'green'},
    {value: 1, color: 'red'},
])

async function ClientRasterColormapLayerBuilder() {
    const [Accessor, Layer, BaseLayerViewGL2D, projection, kernel]
        = await loadModules([
        "esri/core/Accessor",
        "esri/layers/Layer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/geometry/projection",
        "esri/kernel"
    ]);
    await projection.load();

    const RenderOpts = Accessor.createSubclass({
        constructor: function () {
            this.filterRange = null;
            this.colorStops = defaultColorStops;
            this.valueRange = null;
        },
        properties: {
            filterRange: {},
            colorStops: {},
            valueRange: {}
        }
    });
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];
            this.dataset = null;
            this.colorRampReady = false;
            this.fullExtent = null;

            this.needUpdatePosition = true;
            this.beforeTime = null;
            this.afterTime = null;
            this.percent = 0;

            this.needUpdateTimeTex = true;
            this.forceUpdateTimeTex = false;
            this.timeTexStrategy = null;
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
                    u_dataInfo: {
                        value: {
                            minVal: NaN,
                            maxVal: NaN,
                            noDataVal: -9999,
                            cols: NaN,
                            rows: NaN,
                        }
                    },
                    u_percent: {value: 0},
                    u_filterRange: {value: new Vector2()},
                    u_colorRamp: {value: null},
                    u_beforeTex: {value: new DataTexture()},
                    u_afterTex: {value: new DataTexture()},
                },
                side: DoubleSide,
                vertexShader: ClientRasterVertexShader,
                fragmentShader: ClientRasterFragShader
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
                    material.uniforms.u_beforeTex.value.dispose();
                    material.uniforms.u_afterTex.value.dispose();
                    this.mesh = null;
                }
            })

            const {view, layer} = this;
            const renderOpts = layer.renderOpts;

            const dataHandle = () => {
                if (this.destroyed) return;

                this.fullExtent = null;
                layer.fullExtent = null;
                this.dataset = null;

                let data = layer.data;
                if (!data) {
                    this.dataset = null;
                    return;
                }
                const {cols, rows, dataArr, noDataValue = -9999, extent, flipY = true} = data;
                const _extent = projExtent(extent);

                const size = cols * rows;
                dataArr.sort((a, b) => +a[0] - (+b[0]));
                const times = dataArr.map(item => +item[0]);
                const pixels = dataArr.map(item => {
                    const arr = item[1];
                    if (arr.length !== size) throw new Error(`data length mismatch,length:${arr.length},cols:${cols},rows:${rows}`);
                    if(isFloat32Array(arr)){
                        return arr
                    }else{
                        return new Float32Array(arr);
                    }
                });

                this.dataset = {
                    times: times,
                    pixels: pixels,
                    minTime: times[0],
                    maxTime: times[times.length - 1],
                    texSize:[cols, rows],//width, height
                    unpackAlignment: getOptimalUnpackAlign(cols),
                    flipY: flipY,
                    format: AlphaFormat,
                    type:FloatType,
                    noDataValue,
                    getDataByTime(t) {
                        return pixels[times.indexOf(t)];
                    }
                }
                this.fullExtent = layer.fullExtent = _extent;
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

            this._handlers.push(renderOpts.watch(['valueRange','filterRange'], () => this.requestRender()));

            const colorStopsHandle = createColorStopsHandle(this,material)
            this._handlers.push(renderOpts.watch('colorStops', colorStopsHandle));

            this._handlers.push(view.watch('extent', () => {
                this.needUpdatePosition = true;
                this.requestRender();
            }));

            layer.data && dataHandle();
            renderOpts.colorStops && colorStopsHandle();
        },

        detach: function () {
            this._handlers.forEach(i => i.remove?.())
            this._handlers = [];
        },

        render: function ({state}) {
            if (this.destroyed) return;
            const {layer, dataset,fullExtent, colorRampReady} = this;
            const {renderOpts} = layer;
            if (!colorRampReady
                || !layer.visible
                || !renderOpts.valueRange
                || !dataset
                || !fullExtent
                || !this.view.extent.intersects(fullExtent)
            ) return

            this.updateBufferData();
            this.checkTimeTexNeedUpdate();
            this.updateRenderParams(state);

            const gl = this.context;
            const {renderer, mesh, camera} = this;
            const {framebuffer, viewport} = getRenderTarget.call(this, kernel.version);
            renderer.resetState();
            renderer.setViewport(viewport[0], viewport[1], viewport[2], viewport[3]);
            renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            renderer.render(mesh, camera);
        },

        //更新变换
        updateRenderParams(state) {
            const {mesh, layer, view, dataset, fullExtent:extent} = this;
            const uniform = mesh.material.uniforms;
            const rotate = -(Math.PI * state.rotation) / 180;
            uniform.u_rotate.value.identity().rotate(rotate);
            uniform.u_matrix.value.identity()
                .premultiply(
                    _mat3.identity().scale(
                        1 / state.resolution,
                        -1 / state.resolution
                    )
                )
                .premultiply(
                    uniform.u_rotate.value
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
            const renderOpts = layer.renderOpts;
            const texSize = dataset.texSize;
            uniform.u_dataInfo.value = {
                minVal: renderOpts.valueRange[0],
                maxVal: renderOpts.valueRange[1],
                noDataVal: dataset.noDataValue,
                cols: texSize[0],
                rows: texSize[1],
            }
            uniform.u_percent.value = this.percent;
            const fr = renderOpts.filterRange || renderOpts.valueRange;
            uniform.u_filterRange.value.set(fr[0], fr[1]);
            //tex
            if (this.needUpdateTimeTex) {
                _updateTimeTex.call(this, uniform);
            }
        },

        updateBufferData() {
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
                _cm: {
                    enumerable: false,
                    writable: false,
                    configurable: false,
                    value: new RenderOpts()
                },
            });
        },
        properties: {
            curTime: {},
            data: {},
            renderOpts: {
                get() {
                    return this._cm;
                },
                set(v) {
                    Object.assign(this._cm, v || {});
                }
            },
            effect: {},
            blendMode: {}
        },
        createLayerView: function (view) {
            if (view.type !== "2d") throw new Error('不支持3d')
            return new CustomLayerView2D({
                view: view,
                layer: this
            });
        },
    });
}

export async function loadClientRasterColormapLayer(opts) {
    const ctor = await buildModule(ClientRasterColormapLayerBuilder)
    return new ctor(opts);
}
