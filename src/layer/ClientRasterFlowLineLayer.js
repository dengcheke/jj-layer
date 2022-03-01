import * as esriLoader from "esri-loader"
import {getRenderTarget} from "@src/utils";
import {debounce} from 'lodash'
import {
    AdditiveBlending,
    BufferGeometry,
    Color,
    DoubleSide,
    InterleavedBuffer,
    InterleavedBufferAttribute,
    MathUtils,
    Matrix3,
    Mesh,
    OrthographicCamera,
    RawShaderMaterial,
    ShaderMaterial,
    Uint32BufferAttribute,
    UniformsUtils,
    Vector2,
    WebGLRenderer,
} from 'three'
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {FullScreenQuad} from "three/examples/jsm/postprocessing/Pass";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {buildModule} from "@src/builder";
import {RasterFlowLineFragShader, RasterFlowLineVertexShader} from "@src/layer/glsl/RasterFlowLine.glsl";
import {CopyShader} from "three/examples/jsm/shaders/CopyShader";

const _mat3 = new Matrix3();
const WORKER_PATH = 'customWorkers/cjj-worker'

async function ClientRasterFlowLineLayerBuilder() {
    const [
        Accessor, Layer,
        BaseLayerViewGL2D, workers, projection, kernel
    ] = await esriLoader.loadModules([
        "esri/core/Accessor",
        "esri/layers/Layer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/core/workers",
        "esri/geometry/projection",
        "esri/kernel"
    ]);
    const FlowStyle = Accessor.createSubclass({
        constructor: function () {
            this.density = 1;
            this.fadeDuration = 100;
            this.lineColor = "white";
            this.lineLength = 200;
            this.lineSpeed = 10;
            this.lineWidth = 4;
            this.velocityScale = 1;
            this.bloom = {
                strength: 1.5,
                threshold: 0,
                radius: 1
            }
        },
        properties: {
            bloom: {},
            density: {},
            fadeDuration: {},
            lineColor: {},
            lineLength: {},
            lineSpeed: {},
            lineWidth: {},
            velocityScale: {}
        }
    });
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];
            this.rasterData = null;
            this.hasData = false;
            this.useBloom = true;
        },

        attach: function () {
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
                },
                side: DoubleSide,
                vertexShader: RasterFlowLineVertexShader,
                fragmentShader: RasterFlowLineFragShader
            });
            const mesh = this.lineMesh = new Mesh(new BufferGeometry(), material);

            const bloomPass = new UnrealBloomPass(new Vector2(1, 1), 1.5, 1, 0);
            const renderScene = new RenderPass(mesh, this.camera);
            const composer = this.composer = new EffectComposer(renderer);
            composer.renderToScreen = false;
            composer.size = [this.context.drawingBufferWidth, this.context.drawingBufferHeight]
            composer.setSize(composer.size[0], composer.size[1])
            composer.addPass(renderScene);
            composer.addPass(bloomPass);
            this.fs = new FullScreenQuad(new ShaderMaterial({
                uniforms: UniformsUtils.clone(CopyShader.uniforms),
                vertexShader: CopyShader.vertexShader,
                fragmentShader: CopyShader.fragmentShader,
                blending: AdditiveBlending,
                depthTest: false,
                depthWrite: false,
                transparent: true
            }));

            const {layer} = this;
            const flowStyle = layer.renderOpts;
            let dataVersion = 0, calcVersion = 0, isResolveData = false;
            const getSetting = () => {
                const lineWidth = flowStyle.lineWidth || 1;
                const {extent, width, height} = this.rasterData;

                const disPerCell = extent.width / width;
                const pixelPerCell = disPerCell / this.view.state.resolution;
                const spacing = 10 / Math.max(pixelPerCell, 1);
                const lineCellWidth = lineWidth / pixelPerCell;

                const limitExtent = this.view.state.extent.clone();
                const intersect = limitExtent.intersection(extent);
                if (!intersect) return false;
                limitExtent.expand(1.2)
                limitExtent.intersection(extent);
                const xmin = MathUtils.clamp((limitExtent.xmin - extent.xmin) / disPerCell, 0, width);
                const xmax = MathUtils.clamp((limitExtent.xmax - extent.xmin) / disPerCell, 0, width);
                const ymin = MathUtils.clamp((extent.ymax - limitExtent.ymax) / disPerCell, 0, height);
                const ymax = MathUtils.clamp((extent.ymax - limitExtent.ymin) / disPerCell, 0, height);
                if (xmax === xmin || ymax === ymin) return false;
                return {
                    density: Math.max(flowStyle.density || 0.01),
                    fadeDuration: flowStyle.fadeDuration,
                    lineCollisionWidth: lineCellWidth,
                    lineSpacing: spacing,
                    lineSpeed: flowStyle.lineSpeed,
                    segmentLength: Math.max(lineCellWidth, 1) * 2,
                    verticesPerLine: Math.round(flowStyle.lineLength / 2 / lineWidth) + 1,

                    velocityScale: flowStyle.velocityScale || 1,
                    maxTurnAngle: 1,
                    mergeLines: true,
                    minSpeedThreshold: 0.001,

                    limitRange: [xmin, xmax, ymin, ymax]
                }
            }
            const updateData = async () => {
                const data = this.layer.data;
                if (!data) return;
                const _version = ++dataVersion;
                const viewSR = this.view.spatialReference;
                let extent = data.extent;
                if (!viewSR.equals(extent)) {
                    await projection.load();
                    extent = projection.project(extent, viewSR);
                }
                this.rasterData = {
                    data: data.data,
                    width: data.cols,
                    height: data.rows,
                    extent: extent,
                    version: _version,
                    noDataValue: data.noDataValue || undefined
                }
                this.layer.fullExtent = extent;
            }
            const handleDataChange = async () => {
                {
                    this.rasterData = null;
                    this.hasData = false;
                    this.layer.fullExtent = null;
                }
                isResolveData = true;

                try {
                    await updateData();
                } finally {
                    isResolveData = false;
                }

                if (this.rasterData?.version !== dataVersion) return;
                const flag = [dataVersion, ++calcVersion].join('_');
                const setting = getSetting();
                if (!setting) return;
                const bufferData = await computeBufferData(setting);
                const updated = updateBufferData(bufferData, flag);
                updated && this.requestRender();
            }

            const computeBufferData = async setting => {
                /*const {vertexBuffer, indexBuffer} = this.syncCreateRasterFlowLineMesh({
                    data:this.rasterData,
                    setting:setting
                });*/
                const {vertexBuffer, indexBuffer} = await this.asyncCreateRasterFlowLineMesh({
                    data: this.rasterData,
                    setting: setting
                })
                return {
                    vertexBuffer: new Float32Array(vertexBuffer),
                    indexBuffer: new Uint32Array(indexBuffer)
                }
            }
            const updateBufferData = ({vertexBuffer, indexBuffer}, flag) => {
                const curFlag = [dataVersion, calcVersion].join('_');
                if (curFlag !== flag) return;
                mesh.geometry.dispose();
                if (!indexBuffer.length) return;
                const buffer = new InterleavedBuffer(vertexBuffer, 8);
                mesh.geometry = new BufferGeometry()
                    .setAttribute('a_position', new InterleavedBufferAttribute(buffer, 2, 0))
                    .setAttribute('a_side', new InterleavedBufferAttribute(buffer, 1, 2))
                    .setAttribute('a_extrude', new InterleavedBufferAttribute(buffer, 2, 3))
                    .setAttribute('a_timeInfo', new InterleavedBufferAttribute(buffer, 3, 5))
                mesh.geometry.setIndex(new Uint32BufferAttribute(indexBuffer, 1));
                this.hasData = !!indexBuffer.length;
                return true;
            }

            const reCalcBuffer = debounce(async () => {
                if (!this.rasterData) return;
                const setting = getSetting();
                if (!setting) return;
                const bufferData = await computeBufferData(setting);
                const flag = [dataVersion, ++calcVersion].join('_');
                const updated = updateBufferData(bufferData, flag);
                updated && this.requestRender();
            }, 1500, {leading: false, trailing: true})

            const renderOpts = layer.renderOpts;
            this._handlers.push(this.view.watch('scale,extent', () => {
                if (isResolveData) return;
                reCalcBuffer();
            }));
            this._handlers.push(layer.watch("data", handleDataChange));
            this._handlers.push(renderOpts.watch('density,lineLength,velocityScale', () => {
                if (isResolveData) return;
                reCalcBuffer();
            }));
            const handleBloomChange = () => {
                const params = this.layer.renderOpts.bloom;
                if (params) {
                    this.useBloom = true;
                    bloomPass.strength = params.strength;
                    bloomPass.threshold = params.threshold;
                    bloomPass.radius = params.radius;
                } else {
                    this.useBloom = false;
                }
                this.requestRender()
            }
            this._handlers.push(renderOpts.watch('bloom', handleBloomChange));
            const handleAppearChange = () => {
                material.uniforms.u_lineSpeed.value = renderOpts.lineSpeed || 1;
                material.uniforms.u_fadeDuration.value = renderOpts.fadeDuration || 10;
                this.requestRender()
            }
            this._handlers.push(renderOpts.watch('fadeDuration,lineSpeed',
                debounce(handleAppearChange, 200, {leading: false, trailing: true})))
            this._handlers.push({
                remove: () => {
                    bloomPass.dispose();
                    mesh.material.dispose();
                    mesh.geometry.dispose();
                    this.renderer.dispose();
                    this.lineMesh = null;
                    this.camera = null;
                    this.renderer = null;
                    this.rasterData = null;
                    this.composer = null;
                }
            });
            handleBloomChange();
            this.layer.data && handleDataChange();
        },

        detach: function () {
            this._handlers.forEach(i => i.remove());
            this._handlers = [];
        },

        render: function ({state}) {
            if (this.destroyed) return;
            if (!this.hasData || !this.layer.visible) return;
            const extent = this.rasterData?.extent;
            if (!this.layer.visible
                || !this.hasData
                || !extent
                || !this.view.extent.intersects(extent)
            ) return
            this.updateRenderParams(state);

            const {renderer, lineMesh, camera, composer, fs} = this;
            const {framebuffer, viewport} = getRenderTarget.call(this,kernel.version);
            renderer.resetState();
            if (this.useBloom) {
                if (composer.size[0] !== viewport[2] || composer.size[1] !== viewport[3]) {
                    composer.setSize(viewport[2], viewport[3]);
                    composer.size = [viewport[2], viewport[3]];
                }
                composer.render();
            }
            renderer.setViewport(viewport[0], viewport[1], viewport[2], viewport[3]);
            renderer.state.bindFramebuffer(this.context.FRAMEBUFFER, framebuffer);
            if (this.useBloom) {
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

            const point = view.toScreen({
                spatialReference: fullExtent.spatialReference,
                x: fullExtent.xmin,
                y: fullExtent.ymax
            })
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
            uniform.u_lineColor.value.set(opts.lineColor);
            uniform.u_lineWidth.value = opts.lineWidth || 1;
            uniform.u_time.value = performance.now() / 1000;
        },

        syncCreateRasterFlowLineMesh({data, setting}) {
            const sampler = createSampler(data);
            const paths = buildRasterPaths(setting, sampler, data.width, data.height);
            //TODO: optimize, merge 2 step to 1, output buffer directly
            const meshes = paths.map(path => {
                const mesh = tessellatePath(path);
                return {mesh, path}
            })
            const {indexData, vertexData} = toBuffer(meshes);
            return {
                vertexBuffer: vertexData.buffer,
                indexBuffer: indexData.buffer
            }

            function toBuffer(meshes) {
                let vCount = 0, iCount = 0;
                for (let i = 0; i < meshes.length; i++) {
                    const mesh = meshes[i].mesh;
                    vCount += mesh.vertexs.length;
                    iCount += mesh.indices.length;
                }

                const vBuffer = new Float32Array(vCount * 8);
                const iBuffer = new Uint32Array(iCount);

                let currentVertex = 0;
                let currentIndex = 0;

                for (let i = 0; i < meshes.length; i++) {
                    const {mesh, path} = meshes[i];
                    const {vertexs, indices} = mesh;
                    const totalTime = path[path.length - 1].t;
                    const timeSeed = Math.random();
                    for (let k = 0; k < indices.length; k++) {
                        iBuffer[currentIndex] = currentVertex + indices[k];
                        currentIndex++;
                    }
                    for (let j = 0; j < vertexs.length; j++) {
                        const point = vertexs[j];
                        const s = currentVertex * 8;
                        vBuffer[s] = point.x;
                        vBuffer[s + 1] = point.y;
                        vBuffer[s + 2] = point.side;
                        vBuffer[s + 3] = point.offsetX;
                        vBuffer[s + 4] = point.offsetY;
                        vBuffer[s + 5] = point.time;
                        vBuffer[s + 6] = totalTime;
                        vBuffer[s + 7] = timeSeed;
                        currentVertex++;
                    }
                }
                return {
                    vertexData: vBuffer,
                    indexData: iBuffer
                }
            }

            function tessellatePath(path, miterLimit = 10) {
                const vertexs = [];
                const indices = [];
                const lastPoint = new Vector2();
                const lastDir = new Vector2();
                let lastTime = null;
                let cursor = 0;
                for (let i = 0; i < path.length; i++) {
                    const point = path[i];
                    const {x, y, t: time} = point;
                    const curDir = new Vector2(null, null);
                    const offset = new Vector2(null, null);
                    if (i > 0) {
                        curDir.set(x, y).sub(lastPoint).normalize();
                        if (i > 1) {
                            const half = new Vector2()
                                .addVectors(curDir, lastDir)
                                .normalize();
                            const scale = Math.min(1 / (half.dot(curDir)), miterLimit);
                            offset.set(-half.y, half.x).multiplyScalar(scale);
                        } else {
                            offset.set(-curDir.y, curDir.x);
                        }
                        if (null !== offset.x && null !== offset.y) {
                            vertexs.push({
                                x: lastPoint.x,
                                y: lastPoint.y,
                                side: 1,
                                offsetX: offset.x,
                                offsetY: offset.y,
                                time: lastTime,
                            }, {
                                x: lastPoint.x,
                                y: lastPoint.y,
                                side: -1,
                                offsetX: -offset.x,
                                offsetY: -offset.y,
                                time: lastTime,
                            })
                            indices.push(
                                cursor,
                                cursor + 1,
                                cursor + 2,
                                cursor + 1,
                                cursor + 3,
                                cursor + 2,
                            )
                            cursor += 2;
                        }
                    }
                    lastPoint.set(x, y);
                    lastDir.copy(curDir);
                    lastTime = time;
                }
                vertexs.push({
                    x: lastPoint.x,
                    y: lastPoint.y,
                    side: 1,
                    offsetX: -lastDir.y,
                    offsetY: lastDir.x,
                    time: lastTime,
                }, {
                    x: lastPoint.x,
                    y: lastPoint.y,
                    side: -1,
                    offsetX: lastDir.y,
                    offsetY: -lastDir.x,
                    time: lastTime,
                });
                return {vertexs, indices}
            }

            function buildRasterPaths(setting, sampler, width, height) {
                const result = [];
                const [xmin, xmax, ymin, ymax] = setting.limitRange;
                let scaleRatio = 1 / setting.lineCollisionWidth;
                if (scaleRatio > 1) { // when x < 1, 1 / x increase vary fast
                    scaleRatio = Math.min(scaleRatio ** 0.5, 10)
                }
                const stencilWidth = Math.round((xmax - xmin) * scaleRatio),
                    stencilHeight = Math.round((ymax - ymin) * scaleRatio),
                    collideStencil = new Uint8Array(stencilWidth * stencilHeight);
                const f = [];
                for (let i = 0; i < height; i += setting.lineSpacing) {
                    if (i !== clamp(i, ymin, ymax)) continue;
                    for (let j = 0; j < width; j += setting.lineSpacing) {
                        if (j !== clamp(j, xmin, xmax)) continue
                        f.push({
                            x: j,
                            y: i,
                            sort: Math.random()
                        });
                    }
                }
                f.sort((a, b) => a.sort - b.sort);
                const rangeChecker = createRangeCheck(setting.limitRange);
                for (const {x, y} of f) {
                    if (Math.random() < setting.density) {
                        const points = buildPath(
                            setting, sampler, x, y, collideStencil,
                            stencilWidth, stencilHeight, scaleRatio,
                            setting.limitRange, rangeChecker
                        );
                        if (points.length > 2) {
                            result.push(points)
                        }
                    }
                }
                return result
            }

            function buildPath(setting, sampler, startX, startY, stencil, stencilWidth, stencilHeight, scaleRatio, limitRange, inRange) {
                const points = [];
                let time = 0;
                const curPoint = new Vector2(startX, startY);
                const lastDir = new Vector2();
                const curDir = new Vector2();
                const _vec2 = new Vector2();
                points.push({x: startX, y: startY, t: time});
                for (let i = 0; i < setting.verticesPerLine; i++) {
                    if (i && !inRange(curPoint.x, curPoint.y)) break;
                    const uv = _vec2.set(...sampler(curPoint.x, curPoint.y)).multiplyScalar(setting.velocityScale);
                    const speed = uv.length();
                    if (speed < setting.minSpeedThreshold) break;
                    curDir.copy(uv).multiplyScalar(1 / speed);
                    const nextPoint = _vec2.copy(curPoint).addScaledVector(curDir, setting.segmentLength);
                    time += setting.segmentLength / speed;
                    if (i && Math.acos(curDir.dot(lastDir)) > setting.maxTurnAngle) break;
                    if (setting.mergeLines) {
                        const [xmin, xmax, ymin, ymax] = limitRange;
                        const x = Math.round((nextPoint.x - xmin) * scaleRatio);
                        const y = Math.round((nextPoint.y - ymin) * scaleRatio);
                        if (x < 0 || x > stencilWidth - 1 || y < 0 || y > stencilHeight - 1) break;
                        let stencilVal = stencil[y * stencilWidth + x];
                        if (stencilVal > 0) break;
                        stencil[y * stencilWidth + x] = 1;
                    }
                    points.push({
                        x: nextPoint.x,
                        y: nextPoint.y,
                        t: time
                    });
                    lastDir.copy(curDir);
                    curPoint.copy(nextPoint);
                }
                return points
            }

            function createSampler(data) {
                const {width, height, data: arr, noDataValue} = data;
                //  00————————10  ——— X
                //  |         |
                //  |  .(x,y) |
                //  |         |
                //  01————————11
                //  |
                //  Y
                //bilinear interpolation
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

            function clamp(value, min, max) {
                return Math.max(min, Math.min(max, value));
            }
        },
        async asyncCreateRasterFlowLineMesh({data, setting}) {
            const {data: buffer, width, height, noDataValue} = data;
            const pixels = new Float32Array(buffer);
            const connect = await workers.open(WORKER_PATH);
            const {vertexBuffer, indexBuffer} = await connect.invoke(
                'createRasterFlowLineMesh',
                {
                    data: {
                        data: pixels.buffer,
                        width: width,
                        height: height,
                        noDataValue: noDataValue
                    },
                    setting: setting
                }, {
                    transferList: [pixels.buffer]
                });
            return {vertexBuffer, indexBuffer}
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
            data: {}
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

export async function loadClientRasterFlowLineLayer(opts) {
    const ctor = await buildModule(ClientRasterFlowLineLayerBuilder)
    return new ctor(opts);
}
