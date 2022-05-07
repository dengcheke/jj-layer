import * as esriLoader from "esri-loader"
import {doubleToTwoFloats, genColorRamp, getRenderTarget, near2PowMax, RGBA2Id} from "@src/utils";
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
    Uint32BufferAttribute,
    Vector2,
    Vector4,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import {buildModule} from "@src/builder";
import {DataSeriesTINFragShader, DataSeriesTINVertexShader} from "@src/layer/glsl/DataSeriesTIN.glsl";

const _mat3 = new Matrix3()
const DEFAULT_COLOR_STOPS = [
    {value: 0, color: 'yellow'},
    {value: 1, color: 'red'}
]

async function DataSeriesTINLayerBuilder() {
    let [watchUtils, Accessor, Layer, BaseLayerViewGL2D, geometryEngineAsync, Extent, projection, kernel]
        = await esriLoader.loadModules([
        "esri/core/watchUtils",
        "esri/core/Accessor",
        "esri/layers/Layer",
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
            this.bufferReady = false;
            this.fullExtent = null;

            this.texSize = null;
            this.beforeTime = null;
            this.afterTime = null;
            this.percent = 0;

            this.swap = false;
            this.needUpdateTimeTex = false;

            this.version = 0;
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
                    u_transform: {value: new Matrix3()},
                    u_rotation: {value: new Matrix3()},
                    u_display: {value: new Matrix3()},
                    u_extent: {value: new Vector4()},
                    u_percent: {value: 0},
                    u_texSize: {value: new Vector2()},
                    u_valueRange: {value: new Vector2()},
                    u_isPick: {value: false},
                    u_colorRamp: {value: null},
                    u_beforeTex: {value: new DataTexture()},
                    u_afterTex: {value: new DataTexture()},
                },
                side: DoubleSide,
                vertexShader: DataSeriesTINVertexShader,
                fragmentShader: DataSeriesTINFragShader
            });
            this.meshObj = new Mesh(new BufferGeometry(), material);
            const pickRT = new WebGLRenderTarget(1, 1);
            const pixelBuffer = new Uint8Array(4);
            this.pickObj = {pickRT, pixelBuffer}
            this._handlers.push({
                remove: () => {
                    this.meshObj.geometry.dispose();
                    material.uniforms.u_colorRamp.value?.dispose();
                    material.uniforms.u_beforeTex.value.dispose();
                    material.uniforms.u_afterTex.value.dispose();
                    this.meshObj = null;
                }
            });

            const layer = this.layer;
            const renderOpts = layer.renderOpts;
            this._handlers.push(layer.watch('tinMesh', () => {
                this.setTINMesh(this.layer.tinMesh);
            }));
            const extentHandle = async () => {
                const viewSR = this.view.spatialReference;
                const ext = layer?.fullExtent;
                if (!viewSR || !ext) {
                    this.fullExtent = null;
                    return;
                }
                if (!viewSR.equals(ext)) {
                    await projection.load();
                    this.fullExtent = projection.project(ext, viewSR);
                }
                material.uniforms.u_extent.value.set(
                    ext.xmin,
                    ext.ymin,
                    ext.xmax - ext.xmin,
                    ext.ymax - ext.ymin
                )
                this.requestRender();
            }
            this._handlers.push(layer.watch('fullExtent', extentHandle));
            const dataHandle = () => {
                if (this.destroyed) return;
                const data = layer.data;
                data.sort((a, b) => +a[0] - +b[0]);
                const times = data.map(item => +item[0]);
                const dataLen = data[0][1].length;
                const texSize = this.calcTexSize(dataLen);
                const totalLen = texSize[0] * texSize[1];
                const pixels = data.map(item => {
                    return alignData(item[1], totalLen);
                });
                const unpackAlign = texSize[0] % 8 === 0
                    ? 8
                    : (texSize[0] % 4 === 0
                            ? 4
                            : (texSize[0] % 2 === 0
                                    ? 2
                                    : 1
                            )
                    );
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

            layer.fullExtent && extentHandle();
            layer.tinMesh && this.setTINMesh(layer.tinMesh)
            layer.data && dataHandle();
            renderOpts.colorStops && colorStopsHandle();
        },

        detach: function () {
            this.version++;
            this._handlers.forEach(i => i.remove());
            this._handlers = [];
        },

        render: function (renderParameters) {
            if (this.destroyed) return;
            const state = renderParameters.state;
            if (!this.layer.visible
                || !this.layer.renderOpts.valueRange
                || !this.layer.fullExtent
                || !this.fullExtent
                //|| !state.extent.intersects(this.layer.fullExtent)
            ) return;
            if (!this.meshObj?.material.uniforms.u_colorRamp.value?.isReady) return;
            if (!this.bufferReady) return;
            //if (!this.layer.fullExtent) return;
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
            const {meshObj, layer, fullExtent, view} = this;
            meshObj.material.blending = CustomBlending;
            const uniform = meshObj.material.uniforms;
            const rotate = -(Math.PI * state.rotation) / 180;
            //extent左下角在屏幕上的坐标
            const point = view.toScreen({
                x: fullExtent.xmin,
                y: fullExtent.ymin,
                spatialReference: fullExtent.spatialReference
            });
            //extent对应的像素宽高
            const extentPixels = [
                fullExtent.width / state.resolution,
                fullExtent.height / state.resolution
            ]

            uniform.u_rotation.value.identity().rotate(rotate);
            //1.点转为相对于extent归一化坐标(in shader)
            uniform.u_transform.value.identity()
                // 2.转为相对于extent的坐标(y轴向上),(屏幕像素单位y轴向下),
                // extentPixels 是在非旋转情况下计算的,
                // resolution不受旋转影响,需要先转为像素坐标
                .premultiply(
                    _mat3.identity().scale(
                        extentPixels[0],
                        -extentPixels[1]
                    )
                )
                //3.应用旋转
                .premultiply(
                    uniform.u_rotation.value
                )
                //4.添加偏移,转为屏幕像素坐标
                .premultiply(
                    _mat3.identity().translate(point.x, point.y)
                )
            //屏幕转ndc
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

        setTINMesh({vertex, index}) {
            const {meshObj} = this;
            meshObj.geometry.dispose();
            const geometry = meshObj.geometry = new BufferGeometry();

            const indexCount = index.length;
            const tinCount = indexCount / 3;
            if ((tinCount >> 0) !== tinCount) throw new Error('tin 索引数目不对,无法被3整除');
            geometry.setAttribute('a_position', new Float32BufferAttribute(
                new Float32Array(vertex), 2, false));
            /*geometry.setAttribute('a_pickColor', new Uint8ClampedBufferAttribute(
                new Uint8ClampedArray(4 * indexCount)
            ), 4, true);
            geometry.setAttribute('a_dataIndex', new Float32BufferAttribute(
                new Float32Array(indexCount)
            ), 1, false);*/

            geometry.setIndex(new Uint32BufferAttribute(index, 1));
            this.bufferReady = true;
            this.requestRender();
        },

        hitTest: function (...args) {
            return null
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
    return Layer.createSubclass({
        constructor: function () {
            this.curTime = null;
            this.data = null;
            this.tinMesh = null;
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
            tinMesh: {},
            fullExtent: {},
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

export async function loadDataSeriesTINLayer(opts) {
    const ctor = await buildModule(DataSeriesTINLayerBuilder)
    return new ctor(opts);
}
