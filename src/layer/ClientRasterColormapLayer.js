import * as esriLoader from "esri-loader"
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
import {genColorRamp, getRenderTarget} from "@src/utils";
import {buildModule} from "@src/builder";

const _mat3 = new Matrix3();
const defaultColorStops = Object.freeze([
    {value: 0, color: 'green'},
    {value: 1, color: 'red'},
])
async function ClientRasterColormapLayerBuilder() {
    const [Accessor, Layer, BaseLayerViewGL2D, projection,kernel]
        = await esriLoader.loadModules([
        "esri/core/Accessor",
        "esri/layers/Layer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/geometry/projection",
        "esri/kernel"
    ]);
    await projection.load();

    const CMOpts = Accessor.createSubclass({
        constructor: function () {
            this.filterRange = null;
            this.colorStops = defaultColorStops;
            this.valueRange = null;
        },
        properties: {
            filterRange: {},
            colorStops: {},
            valueRange:{}
        }
    });
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];
            this.dataset = null;

            this.needUpdatePosition = false;
            this.needUpdateTimeTex = false;
            this.beforeTime = null;
            this.afterTime = null;
            this.swap = false;
            this.percent = 0;
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
            const loader = new TextureLoader();
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
            this._handlers.push({
                remove:()=>{
                    this.mesh.geometry.dispose();
                    material.uniforms.u_colorRamp.value?.dispose();
                    material.uniforms.u_beforeTex.value.dispose();
                    material.uniforms.u_afterTex.value.dispose();
                    this.mesh = null;
                }
            })
            const {view, layer} = this;
            const renderOpts = layer.renderOpts;
            let version = 1;
            const dataHandle = () => {
                if(this.destroyed) return;
                let data = layer.data;
                if (!data) {
                    this.dataset = null;
                    return;
                }
                const __version = ++version;
                const {cols, rows, dataArr, noDataValue = -9999, extent, flipY = true} = data;
                const _extent = projExtent(extent);
                if (__version !== version) return;

                const size = cols * rows;
                dataArr.sort((a, b) => +a[0] - (+b[0]));
                const times = dataArr.map(item => +item[0]);
                const pixels = dataArr.map(item => {
                    const arr = item[1];
                    if (arr.length !== size) throw new Error(`数据长度不匹配,length:${arr.length},cols:${cols},rows:${rows}`);
                    return new Float32Array(arr);
                });
                const unpackAlign = cols % 8 === 0 ? 8 : (cols % 4 === 0 ? 4 : (cols % 2 === 0 ? 2 : 1));

                this.dataset = {
                    times: times,
                    pixels: pixels,
                    minTime: times[0],
                    maxTime: times[times.length - 1],
                    cols: cols,
                    rows: rows,
                    unpackAlignment: unpackAlign,
                    flipY: flipY,
                    noDataValue,
                    getDataByTime(t) {
                        return pixels[times.indexOf(t)];
                    },
                    extent: _extent
                }
                layer.fullExtent = _extent;
                this.needUpdateTimeTex = true;
                this.needUpdatePosition = true;
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
            this._handlers.push(layer.watch('data', dataHandle));
            this._handlers.push(layer.watch('curTime', ()=>{
                this.requestRender();
            }));
            this._handlers.push(renderOpts.watch('valueRange', () => {
                const vv = renderOpts.valueRange;
                if (vv[1] < vv[0]) {
                    console.warn('maxVal must be >= minVal');
                    return;
                }
                this.requestRender();
            }));
            this._handlers.push(renderOpts.watch('colorStops', colorStopsHandle));
            this._handlers.push(renderOpts.watch('filterRange', ()=>{
                this.requestRender();
            }));
            this._handlers.push(view.watch('extent', () => {
                this.needUpdatePosition = true;
                this.requestRender();
            }));

            layer.data && dataHandle();
            renderOpts.colorStops && colorStopsHandle();
            this.requestRender();
        },

        detach: function () {
            this._handlers.forEach(i => i.remove?.())
            this._handlers = [];
        },

        render: function (renderParameters) {
            if(this.destroyed) return;
            if (!this.layer.visible
                || !this.layer.renderOpts.valueRange
                || !this.dataset
                || !this.dataset.extent
                || !this.view.extent.intersects(this.dataset.extent)
            ) return
            if (!this.mesh?.material.uniforms.u_colorRamp.value?.isReady) return;

            this.updatePosition();
            this.checkTimeTexNeedUpdate();
            this.updateRenderParams(renderParameters.state);

            const gl = this.context;
            const {renderer, mesh, camera} = this;
            const {framebuffer, viewport} = getRenderTarget.call(this,kernel.version);
            renderer.resetState();
            renderer.setViewport(viewport[0], viewport[1], viewport[2], viewport[3]);
            renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            renderer.render(mesh, camera);
        },

        //更新变换
        updateRenderParams(state) {
            const {mesh, layer, view, dataset} = this;
            const extent = dataset.extent;
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
            uniform.u_dataInfo.value = {
                minVal: renderOpts.valueRange[0],
                maxVal: renderOpts.valueRange[1],
                noDataVal: dataset.noDataValue,
                cols: dataset.cols,
                rows: dataset.rows,
            }
            uniform.u_percent.value = this.percent;
            const fr = renderOpts.filterRange || renderOpts.valueRange
            uniform.u_filterRange.value.set(fr[0],fr[1]);
            //tex
            if (this.needUpdateTimeTex) {
                const {beforeTime, afterTime} = this;
                const {cols, rows, flipY} = this.dataset;

                let beforeTex = uniform.u_beforeTex.value;
                let afterTex = uniform.u_afterTex.value;
                [beforeTex, afterTex].forEach(tex => {
                    tex.format = AlphaFormat;
                    tex.type = FloatType;
                    tex.flipY = !!flipY;
                    tex.unpackAlignment = this.dataset.unpackAlignment
                })
                if(this.swap){
                    [beforeTex,afterTex] = [afterTex,beforeTex];
                    uniform.u_beforeTex.value = beforeTex;
                    uniform.u_afterTex.value = afterTex;
                    afterTex.image = {
                        data:this.dataset.getDataByTime(afterTime),
                        width:cols,
                        height:rows
                    }
                    afterTex.needsUpdate = true;
                }else{
                    beforeTex.image = {
                        data: this.dataset.getDataByTime(beforeTime),
                        width:cols,
                        height:rows
                    };
                    afterTex.image = {
                        data:this.dataset.getDataByTime(afterTime),
                        width:cols,
                        height:rows
                    };
                    beforeTex.needsUpdate = true;
                    afterTex.needsUpdate = true;
                }
                this.swap = false;
                this.needUpdateTimeTex = false
            }
        },

        updatePosition() {
            if(!this.needUpdatePosition) return;
            const extent = this.dataset.extent;
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
    });
    return Layer.createSubclass({
        declaredClass: 'custom.clientRasterColormapLayer',
        constructor: function () {
            this.curTime = null;
            this.data = null;
            this.valueRange = null;
            Object.defineProperties(this, {
                _cm: {
                    enumerable: false,
                    writable: false,
                    configurable: false,
                    value: new CMOpts()
                },
            });
        },
        properties: {
            curTime: {},
            data:{},
            valueRange:{},
            renderOpts: {
                get() {
                    return this._cm;
                },
                set(v) {
                    Object.assign(this._cm, v || {});
                }
            },
            effect:{},
            blendMode:{}
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
