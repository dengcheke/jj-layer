import {
    createVersionChecker,
    genColorRamp,
    getOptimalUnpackAlign,
    getRenderTarget,
    isFloat32Array,
    near2PowG,
    nextTick,
    RGBA2Id,
    VersionNotMatch
} from "@src/utils";
import {
    AlphaFormat,
    BufferGeometry,
    Color,
    CustomBlending,
    DataTexture,
    DoubleSide,
    Float32BufferAttribute,
    FloatType,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    InstancedInterleavedBuffer,
    InterleavedBufferAttribute,
    Matrix3,
    Mesh,
    NoBlending,
    OneMinusSrcAlphaFactor,
    OrthographicCamera,
    RawShaderMaterial,
    SrcAlphaFactor,
    TextureLoader,
    Vector2,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import {buildModule} from "@src/builder";
import {DataSeriesTINFragShader, DataSeriesTINVertexShader} from "@src/layer/glsl/DataSeriesTIN.glsl";
import {WORKER_PATH} from "@src/layer/commom";
import {loadModules} from "esri-loader";

const _mat3 = new Matrix3()
const DEFAULT_COLOR_STOPS = [
    {value: 0, color: 'yellow'},
    {value: 1, color: 'red'}
]

function createNewGeometry() {
    const geo = new InstancedBufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ], 3, false,));
    geo.setIndex([0, 1, 2]);
    return geo;
}

async function DataSeriesTINLayerBuilder() {
    let [Accessor, Graphic, Layer, workers, SpatialReference,
        BaseLayerViewGL2D, Extent, projection, kernel]
        = await loadModules([
        "esri/core/Accessor",
        "esri/Graphic",
        "esri/layers/Layer",
        "esri/core/workers",
        "esri/geometry/SpatialReference",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/geometry/Extent",
        "esri/geometry/projection",
        "esri/kernel"
    ]);
    const ARCGIS_VERSION = parseFloat(kernel.version);
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];
            //pixel data
            this.dataset = null;

            //geometry
            this.geometryReady = false;
            this.fullExtent = null;
            this.center = null; //extent 中心

            //tex
            this.colorRampReady = false;

            this.texSize = null;
            this.beforeTime = null;
            this.afterTime = null;
            this.percent = 0;

            this.needUpdateTimeTex = false;
            this.timeTexStrategy = null; //更新策略 'swap-forward', 'swap-backward'
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
                    u_transform: {value: new Matrix3()},
                    u_display: {value: new Matrix3()},
                    u_offset: {value: new Vector2()},
                    u_percent: {value: 0},
                    u_texSize: {value: new Vector2()},
                    u_valueRange: {value: new Vector2()},
                    u_isPick: {value: false},
                    u_colorRamp: {value: null},
                    u_beforeTex: {value: new DataTexture()},
                    u_afterTex: {value: new DataTexture()},
                    u_showMesh: {value: false},
                    u_meshColor: {value: new Color(0, 0, 0)}
                },
                side: DoubleSide,
                vertexShader: DataSeriesTINVertexShader,
                fragmentShader: DataSeriesTINFragShader
            });
            this.meshObj = new Mesh(new BufferGeometry(), material);
            this.meshObj.frustumCulled = false;
            const pickRT = new WebGLRenderTarget(1, 1);
            const pixelBuffer = new Uint8Array(4);
            this.pickObj = {pickRT, pixelBuffer}
            this._handlers.push({
                remove: () => {
                    this.meshObj.geometry?.dispose();
                    material.uniforms.u_colorRamp.value?.dispose();
                    material.uniforms.u_beforeTex.value?.dispose();
                    material.uniforms.u_afterTex.value?.dispose();
                    pickRT.dispose();
                    this.renderer.dispose();
                    this.meshObj = this.renderer = this.camera = this.pickObj = null;
                }
            });

            const layer = this.layer;
            const renderOpts = layer.renderOpts;

            const vCheck = createVersionChecker();
            //geometry
            const geometryHandle = () => {
                this.geometryReady = false;
                vCheck(this.processTINMesh(this.layer.tinMesh))
                    .then(result => {
                        this.updateGeometry(result);
                        this.requestRender();
                    }).catch(e => {
                    if (e.message !== VersionNotMatch) throw e;
                });
            }
            this._handlers.push(layer.watch('tinMesh', geometryHandle));

            const dataHandle = () => {
                if (this.destroyed) return;
                const data = layer.data;
                data.sort((a, b) => +a[0] - +b[0]);
                const times = data.map(item => +item[0]);
                const dataLen = data[0][1].length;
                const texSize = this.calcTexSize(dataLen);
                const totalLen = texSize[0] * texSize[1];
                const pixels = data.map(item => {
                    const obj = {
                        needAlign: true,
                        data: null,
                    }
                    obj.align = () => {
                        obj.data = alignData(item[1], totalLen);
                        obj.needAlign = false;
                        obj.align = null;
                    }
                    return obj;
                });
                const unpackAlign = getOptimalUnpackAlign(texSize[0]);
                this.dataset = {
                    times: times,
                    pixels: pixels,
                    minTime: times[0],
                    maxTime: times[times.length - 1],
                    texSize,
                    unpackAlignment: unpackAlign,
                    flipY: false, //must be false
                    getDataByTime(t) {
                        const item = pixels[times.indexOf(t)];
                        if (item.needAlign) {
                            item.align();
                        }
                        return item.data;
                    }
                }
                this.needUpdateTimeTex = true;
                this.requestRender();

                function alignData(data, totalLen) {
                    if (isFloat32Array(data) && data.length === totalLen) {
                        return data
                    }
                    const arr = new Float32Array(totalLen);
                    arr.set(data);
                    return arr;
                }
            }
            this._handlers.push(layer.watch('data', dataHandle));

            //watch uniforms
            this._handlers.push(layer.watch('curTime', () => this.requestRender()));
            this._handlers.push(renderOpts.watch('valueRange', () => this.requestRender()));
            this._handlers.push(renderOpts.watch('showMesh', () => this.requestRender()));
            this._handlers.push(renderOpts.watch('meshColor', () => {
                renderOpts.showMesh && this.requestRender();
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
                this.colorRampReady = false;
                new TextureLoader().load(v, (newTexture) => {
                    material.uniforms.u_colorRamp.value?.dispose();
                    material.uniforms.u_colorRamp.value = newTexture;
                    this.colorRampReady = true;
                    this.requestRender();
                })
            }
            this._handlers.push(renderOpts.watch('colorStops', colorStopsHandle));

            layer.tinMesh && geometryHandle();
            layer.data && dataHandle();
            renderOpts.colorStops && colorStopsHandle();
        },

        detach: function () {
            this._handlers.forEach(i => i.remove());
            this._handlers = [];
        },

        render: function (renderParameters) {
            if (this.destroyed) return;
            if (!this.colorRampReady || !this.geometryReady) return;
            const state = renderParameters.state;
            if (!this.layer.visible
                || !this.layer.renderOpts.valueRange
                || !this.fullExtent
                || !state.extent.intersects(this.fullExtent)
            ) return;
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
            uniform.u_transform.value.identity()
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

            uniform.u_offset.value.set(
                this.center[0] - state.center[0],
                this.center[1] - state.center[1],
            );
            uniform.u_isPick.value = false;
            uniform.u_percent.value = this.percent;
            const renderOpts = layer.renderOpts;
            uniform.u_valueRange.value.set(
                renderOpts.valueRange[0],
                renderOpts.valueRange[1]
            );
            const {flipY, texSize} = this.dataset;
            uniform.u_texSize.value.set(texSize[0], texSize[1]);
            uniform.u_showMesh.value = !!renderOpts.showMesh;
            uniform.u_meshColor.value.set(renderOpts.meshColor);
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
                if (this.timeTexStrategy === 'swap-forward') {
                    [beforeTex, afterTex] = [afterTex, beforeTex];
                    uniform.u_beforeTex.value = beforeTex;
                    uniform.u_afterTex.value = afterTex;
                    afterTex.image = {
                        data: this.dataset.getDataByTime(afterTime),
                        width: texSize[0],
                        height: texSize[1]
                    }
                    afterTex.needsUpdate = true;
                } else if (this.timeTexStrategy === 'swap-backward') {
                    [beforeTex, afterTex] = [afterTex, beforeTex];
                    uniform.u_beforeTex.value = beforeTex;
                    uniform.u_afterTex.value = afterTex;
                    beforeTex.image = {
                        data: this.dataset.getDataByTime(beforeTime),
                        width: texSize[0],
                        height: texSize[1]
                    }
                    beforeTex.needsUpdate = true;
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
                this.timeTexStrategy = null;
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
            if (times.length > 1
                && oldBefore !== null
                && oldAfter !== null
                && curTime >= oldBefore
                && curTime <= oldAfter
            ) {
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
                if (oldAfter === this.beforeTime) {
                    this.timeTexStrategy = 'swap-forward'
                } else if (oldBefore === this.afterTime) {
                    this.timeTexStrategy = 'swap-backward'
                } else {
                    this.timeTexStrategy = null;
                }
            }
        },
        calcTexSize: function (len) {
            if (!len) {
                return null;
            } else {
                const length = near2PowG(len);
                const l = Math.log2(length);
                const cols = Math.ceil(l / 2);
                const rows = l - cols;
                return [2 ** cols, 2 ** rows];
            }
        },

        _getTriangleByPickIndex: null,

        async processTINMesh({vertex, spatialReference}) {
            const {view} = this;
            const tinCount = vertex.length / 6; //三角形数目
            if ((tinCount >> 0) !== tinCount) throw new Error('tin三角网顶点数组无法被6整除');
            const targetSR = {wkid: view.spatialReference.wkid}
            return this._processTINMesh(
                new Float64Array(vertex),
                {wkid: spatialReference.wkid},
                targetSR
            );
        },
        async _processTINMesh(vertex, sourceSr, targetSr) {
            let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
            for (let i = 0; i < vertex.length; i += 2) {
                xmin = Math.min(xmin, vertex[i]);
                xmax = Math.max(xmax, vertex[i]);
                ymin = Math.min(ymin, vertex[i + 1]);
                ymax = Math.max(ymax, vertex[i + 1]);
            }
            let fullExtent = {
                xmin, ymin, xmax, ymax,
                spatialReference: sourceSr
            };

            if (!new SpatialReference(targetSr).equals(sourceSr)) {
                await projection.load();
                fullExtent = projection.project(fullExtent, targetSr);
            } else {
                fullExtent = new Extent(fullExtent)
            }

            const center = [
                (fullExtent.xmin + fullExtent.xmax) / 2,
                (fullExtent.ymin + fullExtent.ymax) / 2
            ];
            const tinCount = vertex.length / 6;
            const partCount = 20000;
            const vertexPartStripe = partCount * 6;
            const pickPartStripe = partCount * 4;

            //split task
            const tasks = new Array(Math.ceil(tinCount / partCount))
                .fill(0)
                .map((v, idx, arr) => {
                    const start = idx * vertexPartStripe;
                    const end = start + vertexPartStripe;
                    return {
                        idx,
                        vertex: vertex.slice(start, end),
                        pickIndexOffset: idx * partCount
                    }
                });

            const connect = await workers.open(WORKER_PATH);
            try {
                const allTask = [];
                for (let i = 0; i < tasks.length; i++) {
                    //connect.invoke 会查找当前空闲线程, 在微队列中插入待执行任务(尚未执行,线程状态也未改变),
                    //所以需要等待微队列中上一个任务的执行(刷新线程状态),
                    //否则, 所有任务会推入到同一个线程中(线程状态未刷新, 查找空闲线程会命中同一个),
                    await nextTick();
                    const {vertex, pickIndexOffset, idx} = tasks[i];
                    allTask.push(connect.invoke('processTINMeshPart', {
                        data: vertex.buffer,
                        sourceSR: sourceSr,
                        targetSR: targetSr,
                        pickIndexOffset,
                        offsetCenter: center,
                    }, {
                        transferList: [vertex.buffer]
                    }).then(res => {
                        return {
                            result: {
                                vertex: new Float32Array(res.vertexBuffer),
                                pick: new Uint8ClampedArray(res.pickBuffer),
                            },
                            idx,
                        }
                    }));
                }
                const result = await Promise.all(allTask);
                //merge result
                const {vBuffer, pBuffer} = result.reduce((res, cur) => {
                    const {vBuffer, pBuffer} = res;
                    const {idx, result} = cur;
                    vBuffer.set(result.vertex, idx * vertexPartStripe);
                    pBuffer.set(result.pick, idx * pickPartStripe);
                    return res;
                }, {
                    vBuffer: new Float32Array(vertex.length),
                    pBuffer: new Uint8ClampedArray(tinCount * 4)
                });
                const indexBuffer = new Float32Array(tinCount);
                for (let i = 0; i < tinCount; i++) indexBuffer[i] = i;
                return {
                    vertex: vBuffer,
                    pickColor: pBuffer,
                    index: indexBuffer,
                    center: center,
                    extent: fullExtent
                };
            } finally {
                connect.close();
            }
        },
        updateGeometry(calcData) {
            const {
                vertex: offsetVertexBuffer,
                pickColor, index,
                extent, center
            } = calcData;
            const {meshObj, view} = this;
            meshObj.geometry.dispose();
            const geometry = meshObj.geometry = createNewGeometry();
            [
                ['instance_p0', 0],
                ['instance_p1', 2],
                ['instance_p2', 4],
            ].forEach(([name, offset]) => {
                geometry.setAttribute(name,
                    new InterleavedBufferAttribute(
                        new InstancedInterleavedBuffer(offsetVertexBuffer, 6),
                        2, offset, false
                    ))
            })
            geometry.setAttribute('instance_pickColor',
                new InstancedBufferAttribute(pickColor, 4, true)
            )
            geometry.setAttribute('instance_dataIndex',
                new InstancedBufferAttribute(index, 1, false)
            )
            this.layer.fullExtent = this.fullExtent = extent;
            this.center = center;
            this.geometryReady = true;
            this._getTriangleByPickIndex = (index) => {
                const arr = offsetVertexBuffer;
                const i = index * 6;

                const p0 = [arr[i] + center[0], arr[i + 1] + center[1]];
                const p1 = [arr[i + 2] + center[0], arr[i + 3] + center[1]];
                const p2 = [arr[i + 4] + center[0], arr[i + 5] + center[1]];

                const g = new Graphic({
                    geometry: {
                        type: 'polygon',
                        rings: [[p0, p1, p2, p0]],
                        spatialReference: {wkid: view.spatialReference.wkid}
                    },
                    sourceLayer: this.layer,
                    layer: this.layer
                });
                g._valIndex = index;
                return g;
            }
        },

        hitTest: function (...args) {
            if (!this._getTriangleByPickIndex) return Promise.resolve(null);
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
                return Promise.resolve(this._getTriangleByPickIndex(id - 1) || null);
            } else {
                return Promise.resolve(null);
            }
        },
        updateHitTestRenderParams(state, point) {
            const {meshObj} = this;
            meshObj.material.blending = NoBlending;
            const uniform = meshObj.material.uniforms;
            const rotate = -(Math.PI * state.rotation) / 180;
            uniform.u_transform.value.identity()
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

            uniform.u_offset.value.set(
                this.center[0] - point.x,
                this.center[1] - point.y,
            );

            uniform.u_isPick.value = true;
        },
    });
    const Opts = Accessor.createSubclass({
        constructor: function () {
            this.valueRange = null;
            this.colorStops = DEFAULT_COLOR_STOPS;
            this.showMesh = false;
            this.meshColor = null;
        },
        properties: {
            valueRange: {},
            colorStops: {},
            showMesh: {},
            meshColor: {},
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

export async function loadDataSeriesTINMeshLayer(opts) {
    const ctor = await buildModule(DataSeriesTINLayerBuilder)
    return new ctor(opts);
}
