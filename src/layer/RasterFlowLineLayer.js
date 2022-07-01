import {
    createVersionChecker,
    genColorRamp,
    getRenderTarget,
    joinChecker,
    rotateExtentCoverOld,
    versionErrCatch
} from "@src/utils";
import {debounce} from 'lodash'
import {
    AdditiveBlending,
    Color,
    DoubleSide,
    InstancedBufferAttribute,
    MathUtils,
    Matrix3,
    OrthographicCamera,
    RawShaderMaterial,
    ShaderMaterial,
    TextureLoader,
    UniformsUtils,
    Vector2,
    WebGLRenderer,
} from 'three'
import {buildModule} from "@src/builder";
import {RasterFlowLineFragShader, RasterFlowLineVertexShader} from "@src/layer/glsl/RasterFlowLine.glsl";
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2'
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry'
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {FullScreenQuad} from "three/examples/jsm/postprocessing/Pass";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {CopyShader} from "three/examples/jsm/shaders/CopyShader";
import {WORKER_PATH} from "@src/layer/commom";
import {loadModules} from "esri-loader";

const _mat3 = new Matrix3();

export async function RasterFlowLineLayerBuilder() {
    const [
        Accessor, Layer, BaseLayerViewGL2D,
        workers, projection, Extent, kernel
    ] = await loadModules([
        "esri/core/Accessor",
        "esri/layers/Layer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/core/workers",
        "esri/geometry/projection",
        "esri/geometry/Extent",
        "esri/kernel"
    ]);

    await projection.load();
    const apiVersion = parseFloat(kernel.version);
    const FlowStyle = Accessor.createSubclass({
        constructor: function () {
            this.density = 1;
            this.fadeDuration = 100;
            this.lineColor = "white";
            this.lineLength = 200; //像素单位
            this.lineSpeed = 10;
            this.lineWidth = 4;
            this.velocityScale = 1;
            this.colorStops = null;
            this.speedRange = null;
        },
        properties: {
            density: {},
            fadeDuration: {},
            lineColor: {},
            lineLength: {},
            lineSpeed: {},
            lineWidth: {},
            velocityScale: {},
            colorStops: {},
            speedRange: {},
            bloom: {
                set() {
                    console.warn('ClientRasterFlowLineLayer: renderOpts.bloom has been deprecated. Use layer.effect instead.')
                }
            }
        }
    });
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];
            this.rasterData = null;
            this.hasData = false;

            //for <= 4.18
            this.useBloom = false;
            this.useColorStops = false;

            this.connect = null;

            this.curSetting = null;
        },

        attach: function () {
            //init
            const renderer = this.renderer = new WebGLRenderer({
                canvas: this.context.canvas,
                gl: this.context,
            });
            this.renderer.autoClear = false;
            this.camera = new OrthographicCamera();
            this.camera.position.set(0, 0, 1000);
            this.camera.updateProjectionMatrix();

            const material = new RawShaderMaterial({
                blending: AdditiveBlending,
                uniforms: {
                    u_transform: {value: new Matrix3()},
                    u_rotation: {value: new Matrix3()},
                    u_display: {value: new Matrix3()},
                    u_time: {value: performance.now() / 1000},
                    u_fadeDuration: {value: 100},
                    u_lineSpeed: {value: 5},
                    u_lineColor: {value: new Color()},
                    u_lineWidth: {value: 4},
                    u_colorRamp: {value: null},
                    u_speedRange: {value: new Vector2()}
                },
                side: DoubleSide,
                vertexShader: RasterFlowLineVertexShader,
                fragmentShader: RasterFlowLineFragShader
            });
            const mesh = this.lineMesh = new LineSegments2(new LineSegmentsGeometry(), material);
            this._handlers.push({
                remove: () => {
                    material.uniforms.u_colorRamp.value?.dispose();
                    material.dispose();
                    mesh.geometry.dispose();
                    renderer.dispose();
                    this.lineMesh = null;
                    this.camera = null;
                    this.renderer = null;
                    this.rasterData = null;
                    this.composer = null;
                }
            });

            //when <=4.18 The layer.effect does not take effect, use custom bloom composer,
            if (apiVersion <= 4.18) {
                const bloomPass = new UnrealBloomPass(new Vector2(1, 1), 1.5, 1, 0);
                const renderScene = new RenderPass(mesh, this.camera);
                const composer = this.composer = new EffectComposer(renderer);
                composer.renderToScreen = false;
                composer.size = [this.context.drawingBufferWidth, this.context.drawingBufferHeight];
                composer.setSize(composer.size[0], composer.size[1]);
                composer.addPass(renderScene);
                composer.addPass(bloomPass);
                const fs = new FullScreenQuad(new ShaderMaterial({
                    uniforms: UniformsUtils.clone(CopyShader.uniforms),
                    vertexShader: CopyShader.vertexShader,
                    fragmentShader: CopyShader.fragmentShader,
                    blending: AdditiveBlending,
                    depthTest: false,
                    depthWrite: false,
                    transparent: true
                }));
                this.bloomRelatives = {
                    bloomPass, composer, fs
                }

                let _animTimer = 0;
                const DISABLE_BLOOM = Object.freeze({
                    strength: 0,
                    radius: 0,
                    threshold: 0
                })
                const parseBloom = (str) => {
                    if (!str) return DISABLE_BLOOM;
                    const matches = str.match(/bloom\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)px\s*,\s*(\d+(?:\.\d+)?)\s*\)/);
                    if (!matches) return DISABLE_BLOOM;
                    const [_, strength, radius, threshold] = matches;
                    const res = {
                        strength: Math.max(strength, 0),
                        radius: Math.max(radius, 0),
                        threshold: Math.max(threshold, 0),
                    }
                    res.enable = !!res.strength;
                    return res;
                }
                const setBloom = (p) => {
                    bloomPass.strength = p.strength;
                    bloomPass.threshold = p.threshold;
                    bloomPass.radius = p.radius;
                    this.useBloom = !!p.strength;
                    this.requestRender();
                }
                const handleBloomChange = (curv, oldv) => {
                    const old = parseBloom(oldv);
                    const cur = parseBloom(curv);
                    if (old.enable !== cur.enable) {
                        anim(old, cur, 166)
                    } else {
                        cancelAnimationFrame(_animTimer);
                        setBloom(cur);
                    }
                }
                const anim = (from, to, dur) => {
                    cancelAnimationFrame(_animTimer);
                    let walkTime = 0, curTime = performance.now();
                    _animTimer = requestAnimationFrame(function step() {
                        const now = performance.now()
                        walkTime += now - curTime;
                        curTime = now;
                        const per = Math.min(walkTime / dur, 1);
                        if (per === 1) {
                            setBloom(to);
                        } else {
                            setBloom({
                                strength: MathUtils.lerp(from.strength, to.strength, per),
                                radius: MathUtils.lerp(from.radius, to.radius, per),
                                threshold: to.threshold
                            });
                            _animTimer = requestAnimationFrame(step)
                        }
                    })
                }
                this._handlers.push(this.layer.watch('effect', handleBloomChange));
                this._handlers.push({
                    remove: () => {
                        cancelAnimationFrame(_animTimer);
                        fs.dispose();
                        bloomPass.dispose();
                        this.bloomRelatives = null;
                    }
                });
                handleBloomChange(this.layer.effect, null);
            }

            //bind event
            const {layer} = this;
            const renderOpts = layer.renderOpts;

            const check1 = createVersionChecker('数据源');
            const check2 = createVersionChecker('其他');
            const joinCheck = joinChecker(check1, check2);

            /*
            *  1.在矢量栅格上放置若干个点作为路径起始点.
            *  2.从每个起点开始, 延伸出一条路径.
            */
            const getSetting = () => {
                const lineWidth = renderOpts.lineWidth || 1;
                const {extent, width, height} = this.rasterData;
                // cell = 矢量栅格单元(像素)
                const disPerCell = extent.width / width; //一个栅格像素距离
                const pixelPerCell = disPerCell / this.view.state.resolution;//一个栅格像素等于多少个屏幕像素
                const rotate = this.view.state.rotation;


                // 动态路径种子放置间距,
                const spacing = 10 / pixelPerCell;
                const lineCellWidth = (lineWidth + 2) / pixelPerCell;//线宽对应多少个栅格像素

                //获取view 和 矢量栅格的交集部分, 排除不在视野内的路径种子
                let limitExtent = this.view.state.extent.clone();
                const intersect = limitExtent.intersection(extent);
                if (!intersect) return false;
                if (rotate !== 0) {
                    limitExtent = new Extent(rotateExtentCoverOld(limitExtent, rotate));
                }
                limitExtent.expand(1.2);//种子不在视野内不代表路径不会流经视野内, 适当扩大可视范围
                limitExtent.intersection(extent);
                const xmin = MathUtils.clamp((limitExtent.xmin - extent.xmin) / disPerCell, 0, width);
                const xmax = MathUtils.clamp((limitExtent.xmax - extent.xmin) / disPerCell, 0, width);
                const ymin = MathUtils.clamp((extent.ymax - limitExtent.ymax) / disPerCell, 0, height);
                const ymax = MathUtils.clamp((extent.ymax - limitExtent.ymin) / disPerCell, 0, height);
                if (xmax === xmin || ymax === ymin) return false;
                const segmentLength = 10 / Math.max(pixelPerCell, 1); //每次步进长度为屏幕上10个像素
                return {
                    density: Math.max(renderOpts.density || 0.01), //线密度
                    fadeDuration: renderOpts.fadeDuration, //消失时间
                    lineCollisionWidth: lineCellWidth, //线碰撞半径(栅格)
                    lineSpacing: spacing, //间距(栅格)
                    lineSpeed: renderOpts.lineSpeed, //线速度
                    segmentLength,
                    verticesPerLine: Math.round(renderOpts.lineLength / 10) + 2, //线最大顶点数

                    velocityScale: renderOpts.velocityScale || 1, //速度的真实缩放, 用户提供
                    renderVScale: 1 / Math.max(pixelPerCell, 1), //放大时渲染速度的缩放
                    maxTurnAngle: 120 / 180 * Math.PI, //最大转角弧度
                    mergeLines: true, //合并线条
                    minSpeedThreshold: 0.001, //最小速度阈值

                    limitRange: [xmin, xmax, ymin, ymax], //网格坐标系, x向右, y向上
                    limitExtent,
                }
            }
            const processData = () => {
                const data = this.layer.data;
                if (!data) return false;
                const viewSR = this.view.spatialReference;
                let extent = data.extent;
                if (!viewSR.equals(extent)) {
                    extent = projection.project(extent, viewSR);
                }
                this.rasterData = {
                    data: data.data,
                    width: data.cols,
                    height: data.rows,
                    extent: extent,
                    noDataValue: data.noDataValue || undefined,
                    cacheId: null,
                }
                this.layer.fullExtent = extent;
                return true;
            }
            const computeBufferData = async setting => {
                return this.asyncCreateRasterFlowLineMesh({
                    data: this.rasterData,
                    setting: setting
                });
                /*return this.syncCreateRasterFlowLineMesh({
                    data: this.rasterData,
                    setting: setting
                });*/
            }
            const updateBufferData = ({buffer1, buffer2, buffer3, buffer4}) => {
                if (this.destroyed) return;
                mesh.geometry.dispose();
                mesh.geometry = new LineSegmentsGeometry()
                    .setAttribute('instance_p0_p1',
                        new InstancedBufferAttribute(buffer1, 4))
                    .setAttribute('instance_p2_p3',
                        new InstancedBufferAttribute(buffer2, 4))
                    .setAttribute('instance_timeInfo',
                        new InstancedBufferAttribute(buffer3, 4))
                    .setAttribute('instance_speed12',
                        new InstancedBufferAttribute(buffer4, 2));
                this.hasData = !!buffer1.length;
                return true;
            }

            const reCalcBuffer = debounce(() => {
                const setting = getSetting();
                if (!setting) return;
                joinCheck(computeBufferData(setting))
                    .then(bufferData => {
                        if (updateBufferData(bufferData)) {
                            this.curSetting = setting;
                            this.requestRender();
                        }
                    }).catch(versionErrCatch)
            }, 200, {leading: false, trailing: true})

            const handleDataChange = async () => {
                if (this.destroyed) return;
                this.clearWorkerCache();
                this.rasterData = null;
                this.hasData = false;
                //this.layer.fullExtent = null;
                check1(processData())
                    .then(flag => flag && reCalcBuffer())
                    .catch(versionErrCatch)
            }
            const handleNewCalc = () => {
                if (this.destroyed || !this.rasterData) return;
                check2().then(() => reCalcBuffer()).catch(versionErrCatch)
            }

            this._handlers.push(this.view.watch(['scale', 'extent'], handleNewCalc));
            this._handlers.push(renderOpts.watch(['density', 'lineLength', 'velocityScale'], handleNewCalc));
            this._handlers.push(layer.watch("data", handleDataChange));

            const check3 = createVersionChecker('colorRamp');
            const handleColorStops = v => {
                let oldUse = this.useColorStops;
                if (!v) {
                    this.useColorStops = false;
                    if (oldUse !== this.useColorStops) material.needsUpdate = true;
                } else {
                    if (Array.isArray(v)) v = genColorRamp(v, 128, 1);
                    check3(
                        new Promise((resolve, reject) => new TextureLoader().load(v,
                            newTexture => resolve(newTexture),
                            null,
                            () => reject(`load RasterFlowLineLayer colorStops img err, your img src is: "${v}"`)
                        ))
                    ).then(newTexture => {
                        material.uniforms.u_colorRamp.value?.dispose();
                        material.uniforms.u_colorRamp.value = newTexture;
                        this.useColorStops = true;
                        if (oldUse !== this.useColorStops) material.needsUpdate = true;
                        this.requestRender();
                    }).catch(versionErrCatch);
                }
            }
            this._handlers.push(renderOpts.watch('colorStops', handleColorStops));

            const handleAppearChange = () => {
                material.uniforms.u_lineSpeed.value = renderOpts.lineSpeed || 1;
                material.uniforms.u_fadeDuration.value = renderOpts.fadeDuration || 10;
                this.requestRender()
            }
            this._handlers.push(renderOpts.watch('fadeDuration,lineSpeed',
                debounce(handleAppearChange, 200, {leading: false, trailing: true})));

            this.layer.data && handleDataChange();
            renderOpts.colorStops && handleColorStops(renderOpts.colorStops);
        },

        detach: function () {
            this._handlers.forEach(i => i.remove());
            this.connect && this.clearWorkerCache().finally(() => {
                this.connect?.close();
                this.connect = null;
            })
            this._handlers = [];
        },

        render: function ({state}) {
            if (this.destroyed) return;
            if (!this.hasData || !this.layer.visible) return;
            const extent = this.rasterData?.extent;
            if (!this.layer.visible
                || !extent
                || !this.view.extent.intersects(extent)
            ) return
            this.updateRenderParams(state);
            const {renderer, lineMesh, camera} = this;
            const {framebuffer, viewport} = getRenderTarget.call(this, apiVersion);
            renderer.resetState();

            if (apiVersion <= 4.18 && this.useBloom) {
                const {composer} = this.bloomRelatives;
                const [w, h] = state.size, dpr = state.pixelRatio;
                if (composer._width !== w || composer._height !== h || composer._pixelRatio !== dpr) {
                    composer.setSize(w, h);
                    composer.setPixelRatio(dpr);
                }
                composer.render();
            }

            renderer.setViewport(viewport[0], viewport[1], viewport[2], viewport[3]);
            renderer.state.bindFramebuffer(this.context.FRAMEBUFFER, framebuffer);

            if (apiVersion <= 4.18 && this.useBloom) {
                const {fs, composer} = this.bloomRelatives;
                fs.material.uniforms.tDiffuse.value = composer.readBuffer.texture;
                fs.render(renderer);
            } else {
                renderer.render(lineMesh, camera);
            }
            this.requestRender()
        },

        updateRenderParams(state) {
            const {lineMesh, rasterData, view, layer} = this;
            const fullExtent = rasterData.extent;
            const uniform = lineMesh.material.uniforms;
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

            const limitExtent = this.curSetting.limitExtent;

            //以当前剖分范围的左上角为基准, 解决高等级缩放时的精度问题
            const point = view.toScreen({
                spatialReference: fullExtent.spatialReference,
                x: limitExtent.xmin,
                y: limitExtent.ymin
            });
            const disPerCell = fullExtent.width / rasterData.width;
            const pixelPerCell = disPerCell / state.resolution;
            const angle = -state.rotation * Math.PI / 180;
            uniform.u_rotation.value.identity().rotate(angle);
            uniform.u_transform.value.identity()
                .premultiply(
                    _mat3.identity().scale(pixelPerCell, pixelPerCell)
                )
                .premultiply(
                    uniform.u_rotation.value
                )
                .premultiply(
                    _mat3.identity().translate(point.x, point.y)
                )
            const opts = layer.renderOpts;

            if (this.useColorStops) {
                const speedRange = opts.speedRange || rasterData.speedRange;
                lineMesh.material.defines.USE_COLOR_RAMP = "";
                uniform.u_speedRange.value.set(speedRange[0], speedRange[1]);
            } else {
                uniform.u_lineColor.value.set(opts.lineColor);
                delete lineMesh.material.defines.USE_COLOR_RAMP;
            }

            uniform.u_lineWidth.value = opts.lineWidth || 1;
            uniform.u_time.value = performance.now() / 1000;
        },

        syncCreateRasterFlowLineMesh({data, setting}) {
            if (!data.speedRange) {
                const {data: arr, noDataValue} = data;
                let min = Infinity, max = -Infinity;
                for (let i = 0; i < arr.length; i += 2) {
                    const l = Math.hypot(
                        arr[i] === noDataValue ? 0 : arr[i],
                        arr[i + 1] === noDataValue ? 0 : arr[i + 1]
                    );
                    min = Math.min(min, l);
                    max = Math.max(max, l);
                }
                data.speedRange = [min, max];
            }
            const sampler = createSampler(data);

            const paths = buildRasterPaths(setting, sampler);

            return toBuffer(paths, setting)

            function toBuffer(paths, {limitRange}) {

                const [xmin, xmax, ymin, ymax] = limitRange;
                let segmentCount = 0;
                for (let i = paths.length; i--;) {
                    segmentCount += paths[i].length - 1;
                }
                const n = segmentCount * 4;

                const buffer1 = new Float32Array(n);
                const buffer2 = new Float32Array(n);
                const buffer3 = new Float32Array(n);
                const buffer4 = new Float32Array(segmentCount * 2);

                for (let i = 0, cursor = 0; i < paths.length; i++) {
                    const path = paths[i];
                    const totalTime = path[path.length - 1].t;
                    const timeSeed = Math.random();
                    const pointCount = path.length;
                    for (let j = 0, limit = pointCount - 2; j <= limit; j++) {
                        const c = cursor * 4;
                        const c1 = c + 1, c2 = c + 2, c3 = c + 3;
                        const p0 = j === 0 ? path[0] : path[j - 1];
                        const p1 = path[j];
                        const p2 = path[j + 1];
                        const p3 = j === limit ? path[j + 1] : path[j + 2];
                        buffer1[c] = p0.x - xmin;
                        buffer1[c1] = p0.y - ymax;
                        buffer1[c2] = p1.x - xmin;
                        buffer1[c3] = p1.y - ymax;

                        buffer2[c] = p2.x - xmin;
                        buffer2[c1] = p2.y - ymax;
                        buffer2[c2] = p3.x - xmin;
                        buffer2[c3] = p3.y - ymax;

                        buffer3[c] = p1.t;
                        buffer3[c1] = p2.t;
                        buffer3[c2] = totalTime;
                        buffer3[c3] = timeSeed;

                        buffer4[cursor * 2] = p1.speed;
                        buffer4[cursor * 2 + 1] = p2.speed;
                        cursor++;
                    }
                }
                return {
                    buffer1,
                    buffer2,
                    buffer3,
                    buffer4
                }
            }

            function buildRasterPaths(setting, sampler) {
                const [xmin, xmax, ymin, ymax] = setting.limitRange;
                let scaleRatio = 1 / setting.lineCollisionWidth;

                //碰撞检测模板
                const stencilWidth = Math.round((xmax - xmin) * scaleRatio),
                    stencilHeight = Math.round((ymax - ymin) * scaleRatio),
                    collideStencil = new Uint8Array(stencilWidth * stencilHeight);

                const spacing = setting.lineSpacing;
                const ys = 1 + (ymax - ymin) / spacing >> 0;
                const xs = 1 + (xmax - xmin) / spacing >> 0;
                const f = new Array(xs * ys);
                for (let i = xs; i--;) {
                    for (let j = ys, s = spacing; j--;) {
                        f[j * xs + i] = {
                            x: xmin + i * s,
                            y: ymin + j * s,
                            sort: Math.random()
                        }
                    }
                }
                f.sort((a, b) => a.sort - b.sort); //shuffle

                const rangeChecker = createRangeCheck(setting.limitRange);
                const result = new Array(f.length);
                for (let i = f.length; i--;) {
                    const {x, y} = f[i];
                    if (Math.random() < setting.density) {
                        const points = buildPath(
                            setting, sampler, x, y, collideStencil,
                            stencilWidth, stencilHeight, scaleRatio,
                            setting.limitRange, rangeChecker
                        );
                        if (points.length > 3) {
                            result[i] = points;
                        }
                    }
                }
                return result.filter(Boolean)
            }

            function buildPath(setting, sampler,
                               startX, startY,
                               stencil, stencilWidth, stencilHeight,
                               scaleRatio, limitRange, inRange) {

                const points = [];
                let time = 0;
                const curPoint = new Vector2(startX, startY);
                const lastDir = new Vector2();
                const curDir = new Vector2();
                const _vec2 = new Vector2();
                points.push({
                    x: startX,
                    y: startY,
                    t: time,
                    speed: _vec2.set(...sampler(startX, startY)).length()
                });
                for (let i = 0; i < setting.verticesPerLine; i++) {
                    if (i && !inRange(curPoint.x, curPoint.y)) break; //超出范围,跳过
                    const uv = _vec2.set(...sampler(curPoint.x, curPoint.y));
                    const originSpeed = uv.length(); //原始速度
                    const speed = originSpeed * setting.velocityScale; //速度缩放
                    if (speed < setting.minSpeedThreshold) break;
                    uv.normalize();
                    curDir.copy(uv);
                    const nextPoint = _vec2.copy(curPoint).addScaledVector(curDir, setting.segmentLength);
                    time += setting.segmentLength / (speed * setting.renderVScale);
                    if (i && Math.acos(curDir.dot(lastDir)) > setting.maxTurnAngle) break;
                    if (setting.mergeLines) {
                        const [xmin, xmax, ymin, ymax] = limitRange;
                        const x = Math.round((nextPoint.x - xmin) * scaleRatio);
                        const y = Math.round((nextPoint.y - ymin) * scaleRatio);
                        if (x < 0 || x > stencilWidth - 1 || y < 0 || y > stencilHeight - 1) break;
                        let stencilVal = stencil[y * stencilWidth + x];
                        if (stencilVal === 1) break;
                        stencil[y * stencilWidth + x] = 1;
                    }
                    points.push({
                        x: nextPoint.x,
                        y: nextPoint.y,
                        t: time,
                        speed: originSpeed,
                    });
                    lastDir.copy(curDir);
                    curPoint.copy(nextPoint);
                }
                return points
            }

            //双线性插值
            function createSampler(data) {
                const {width, height, data: arr, noDataValue} = data;
                //  00————————10  ——— X
                //  |         |
                //  |  .(x,y) |
                //  |         |
                //  01————————11
                //  |
                //  Y
                return (x, y) => {
                    const p00 = new Vector2(x, y).floor();
                    if (p00.x < 0 || p00.x >= width || p00.y < 0 || p00.y >= height) return [0, 0];
                    x -= p00.x;
                    y -= p00.y;

                    const dx = p00.x < width - 1 ? 1 : 0,
                        dy = p00.y < height - 1 ? 1 : 0;

                    const i00 = (p00.y) * width + (p00.x);
                    const i10 = (p00.y) * width + (p00.x + dx);
                    const i01 = (p00.y + dy) * width + (p00.x);
                    const i11 = (p00.y + dy) * width + (p00.x + dx);

                    const [u00, u01, u10, u11] = [i00, i01, i10, i11].map(index => {
                        const value = arr[2 * index];
                        return value === noDataValue ? 0 : value;
                    })
                    const [v00, v01, v10, v11] = [i00, i01, i10, i11].map(index => {
                        const value = arr[2 * index + 1];
                        return value === noDataValue ? 0 : value;
                    })
                    return [
                        mix(mix(u00, u01, y), mix(u10, u11, y), x),
                        mix(mix(v00, v01, y), mix(v10, v11, y), x),
                    ]
                }
            }

            function createRangeCheck(limit) {
                const [xmin, xmax, ymin, ymax] = limit;
                return (x, y) => {
                    return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
                }
            }

            function mix(x, y, a) {
                return x + (y - x) * a;
            }

        },

        async getConnect() {
            if (!this.connect) {
                this.connect = await workers.open(WORKER_PATH, {strategy: 'dedicated'});
            }
            return this.connect;
        },

        async clearWorkerCache() {
            const key = this.rasterData?.cacheId
            if (key) {
                const connect = await this.getConnect();
                await connect.invoke('removeCache', key);
            }
        },

        async asyncCreateRasterFlowLineMesh({data: rasterData, setting}) {
            const connect = await this.getConnect();
            const {data: buffer, width, height, noDataValue, cacheId, speedRange} = rasterData;
            const useCache = !!cacheId;
            const pixels = cacheId || new Float64Array(buffer);
            const computeSpeedRange = !speedRange;
            const {
                buffer1, buffer2, buffer3, buffer4,
                speedRange: range,
                cacheId: id
            } = await connect.invoke(
                'createRasterFlowLineMesh',
                {
                    data: {
                        data: pixels,
                        width: width,
                        height: height,
                        noDataValue: noDataValue
                    },
                    setting: setting,
                    useCache,
                    computeSpeedRange,
                }, useCache ? undefined : {
                    transferList: [pixels.buffer]
                });
            if (!cacheId) rasterData.cacheId = id;
            if (computeSpeedRange) rasterData.speedRange = range;
            return {
                buffer1: new Float32Array(buffer1),
                buffer2: new Float32Array(buffer2),
                buffer3: new Float32Array(buffer3),
                buffer4: new Float32Array(buffer4),
            }
        }
    });
    return Layer.createSubclass({
        constructor: function () {
            this.data = null;
            Object.defineProperties(this, {
                _flowStyle: {
                    enumerable: false,
                    writable: false,
                    configurable: false,
                    value: new FlowStyle()
                },
            });
        },
        properties: {
            renderOpts: {
                get() {
                    return this._flowStyle;
                },
                set(v) {
                    Object.assign(this._flowStyle, v || {});
                }
            },
            data: {},
            effect: {},
            blendMode: {}
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
    });
}

export async function loadRasterFlowLineLayer(opts) {
    const ctor = await buildModule(RasterFlowLineLayerBuilder)
    return new ctor(opts);
}
