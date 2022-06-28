import {
    createVersionChecker,
    doubleToTwoFloats,
    genColorRamp,
    getRenderTarget,
    id2RGBA,
    isNil,
    nextTick,
    parseValueNotNil,
    RGBA2Id,
    versionErrCatch
} from "@src/utils";
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
    Uint16BufferAttribute,
    Uint32BufferAttribute,
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

export async function FlowLineLayerBuilder() {
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
        constructor: function () {
            this.minAlpha = DEFAULT_CONFIG.minAlpha; // ∈ [0,1]
            this.speed = DEFAULT_CONFIG.speed;  // ∈ [0,1]
            this.length = DEFAULT_CONFIG.length; // ∈ [0,1]
            this.cycle = DEFAULT_CONFIG.cycle; // ∈[0,1]
            this.color = DEFAULT_CONFIG.color;
            this.width = DEFAULT_CONFIG.width;
            this.flow = true; // 是否流动, flow=false 等价于 minAlpha = 1.0
            /*
            是否使用顶点颜色, 每个顶点一个额外的值, 按照值范围进行颜色映射,
            数据必须与geometry一一对应, 附加在graphic.vertexColor(直接指定颜色) / vertexValue(指定数值,映射)属性上
            {
                geometry: [
                    [ [p1x, p1y], [p2x, p2y], ... ] , //paths1
                    [ [p1x, p1y], [p2x, p2y], ... ] , //paths2
                    ....
                ],
                //则顶点颜色数据为:
                vertexValue: [
                    [ p1v, p2v, p3v, ... ],  // paths1
                    [ p1v, p2v, p3v, ... ],  // paths2
                    ....
                ],
                //或者直接给出顶点颜色, 数组[r,g,b,a] / 字符串颜色
                vertexColor:[
                    [ [p1r,g,b,a], "white", "#fffff", ...] //paths1,
                    ....
                ]
            }
            */
            // { colorStops:[], valueRange:[] } 有一部分使用 vertexValue
            // true  全部使用vertexColor
            // falsy 不使用顶点颜色 null, undefine ...
            this.vertexColor = null;
        },
        properties: {
            flow: {},
            minAlpha: {},
            length: {},
            speed: {},
            cycle: {},
            color: {},
            width: {},
            vertexColor: {},
        }
    });
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        constructor: function () {
            this._handlers = [];
            this.connect = null;

            this.useVertexColor = false;
            this.colorRamp = null;

            this.hasFlow = false;

            this.fullExtent = null;
            this.meshes = null;

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
                    u_time: {value: performance.now()},
                    u_isPick: {value: false},
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
                //clear
                {
                    //this.layer.fullExtent = null;
                    this.fullExtent = null;
                    this.updateFlags.delete(Flags.data);
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
                    const connect = await this.getConnect();
                    const allTasks = [];
                    for (let i = 0; i < graphics.length; i++) {
                        const g = graphics[i], pickId = i + 1;
                        await nextTick();
                        allTasks.push(new Promise(async resolve => {
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
                            resolve({
                                mesh, pickId, graphic: g
                            })
                        }))
                    }
                    const meshes = await Promise.all(allTasks);
                    return {meshes, fullExtent}
                }).then(({fullExtent, meshes}) => {
                    this.meshes = meshes;
                    {
                        let vertexCount = 0, indexCount = 0;
                        for (let i = 0; i < meshes.length; i++) {
                            const mesh = meshes[i].mesh;
                            for (let j = 0; j < mesh.length; j++) {
                                const {vertex, index} = mesh[j];
                                vertexCount += vertex.length / 10;
                                indexCount += index.length;
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

            this._handlers.push(watchUtils.on(this,
                "layer.graphics", "change",
                handleDataChange, handleDataChange
            ));


            const renderOpts = this.layer.renderOpts;
            this._handlers.push(renderOpts.watch([
                "minAlpha", "length", "speed",
                "cycle", "flow", "color", "width"
            ], () => {
                this.updateFlags.add(Flags.appear);
                this.requestRender()
            }));
            const vertexColorHandler = (v) => {
                let oldUse = this.useVertexColor;
                if (!v) {
                    this.useVertexColor = false;
                    oldUse && this.updateFlags.add(Flags.appear);
                    this.requestRender();
                } else {
                    if (v === true) {
                        this.useVertexColor = true;
                        this.colorRamp = () => {
                            console.warn(`flowLine: renderOpts.vertexColor值为true, 但是未指定vertexColor属性! 回退到renderOpts.color`)
                            return renderOpts.color;
                        }
                        this.updateFlags.add(Flags.appear);
                        this.requestRender();
                        return;
                    }
                    const {valueRange, colorStops} = v;
                    if (Array.isArray(valueRange) && Array.isArray(colorStops)) {
                        const buffer = genColorRamp(colorStops, 256, 1, 'buffer');
                        this.colorRamp = v => {
                            const i = (MathUtils.clamp(v, 0, 1) * 255 >> 0) * 4;
                            return {
                                r: buffer[i], //r
                                g: buffer[i + 1], //g
                                b: buffer[i + 2], //b
                                a: buffer[i + 3] / 255, //a
                            }
                        }
                        this.updateFlags.add(Flags.appear);
                        this.useVertexColor = true;
                        this.requestRender();
                    } else {
                        this.useVertexColor = false;
                        oldUse && this.updateFlags.add(Flags.appear);
                        this.requestRender();
                        throw new Error('flowline.renderOpts参数vertexColor格式不对,必须是:{valueRange:[], colorStops:[]} / true / falsy');
                    }
                }
            }
            this._handlers.push(renderOpts.watch('vertexColor', vertexColorHandler));
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
            });

            renderOpts.vertexColor && vertexColorHandler(renderOpts.vertexColor);
        },

        detach: function () {
            this.connect?.close();
            this.connect = null;
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
            this.hasFlow && this.requestRender()
        },

        updateBufferData: function () {
            if (this.destroyed || !this.updateFlags.size) return;
            const {lineMesh, layer, useVertexColor, colorRamp: getPointColor} = this;
            const [min, r] = (() => {
                if (useVertexColor) {
                    const range = layer.renderOpts.vertexColor.valueRange;
                    return [range[0], range[1] - range[0]]
                } else {
                    return []
                }
            })();

            const dataChange = this.updateFlags.has(Flags.data),
                appearChange = dataChange || this.updateFlags.has(Flags.appear);

            const {vertexCount, indexCount} = this.meshes;
            if (dataChange) {
                lineMesh.geometry.dispose();
                const geometry = lineMesh.geometry = new BufferGeometry();
                [
                    //geometry
                    ['a_position', Float32BufferAttribute, Float32Array, 4, false],// [hx,hy,lx,ly]
                    ['a_offset', Float32BufferAttribute, Float32Array, 2, false],  // [offsetX, offsetY]
                    ['a_dis_info', Float32BufferAttribute, Float32Array, 4, false],// [distance, totalDis, distance_width_delta, side]

                    //appearance
                    ['a_width', Float32BufferAttribute, Float32Array, 1, false],
                    ['a_color', Uint8ClampedBufferAttribute, Uint8ClampedArray, 4, true], //[ r,g,b,a ]
                    ['a_pick_color', Uint8ClampedBufferAttribute, Uint8ClampedArray, 4, true],//[ r,g,b,a]
                    ['a_visible', Uint8ClampedBufferAttribute, Uint8ClampedArray, 1, false],
                    ['a_trail', Float32BufferAttribute, Float32Array, 4, false],// [minAlpha, speed, length, cycle]
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

            //graphic
            const getVertexColor = (() => {
                if (useVertexColor) {
                    return ({pathIdx, colorIndex, vertexColor, vertexValue}) => {
                        if (vertexColor) {
                            const value = vertexColor?.[pathIdx]?.[colorIndex];
                            if (!isNil(value)) {
                                return new Color(value);
                            }
                        } else {
                            const value = vertexValue?.[pathIdx]?.[colorIndex];
                            if (!isNil(value) && !isNaN(value)) {
                                return getPointColor(MathUtils.clamp((value - min) / r, 0, 1));
                            }
                        }
                    }
                } else {
                    return undefined;
                }
            })();
            console.time('xx')
            this.hasFlow = dataChange ? dataUpdateFn(this.meshes, lineMesh.geometry, getVertexColor)
                : appearUpdateFn(this.meshes, lineMesh.geometry, getVertexColor);
            console.timeEnd('xx')
            this.updateFlags.clear();


            function dataUpdateFn(meshes, geometry, getColor) {
                let hasFlow = false;

                for (let meshIndex = meshes.length,
                         vertexCursor = 0,
                         indexCursor = 0,
                         renderOpts = layer.renderOpts,
                         indexBuf = geometry.index.array,
                         posBuf = geometry.getAttribute('a_position').array,
                         offsetBuf = geometry.getAttribute('a_offset').array,
                         disInfoBuf = geometry.getAttribute('a_dis_info').array,

                         widthBuf = geometry.getAttribute('a_width').array,
                         colorBuf = geometry.getAttribute('a_color').array,
                         visibleBuf = geometry.getAttribute('a_visible').array,
                         pickColorBuf = geometry.getAttribute('a_pick_color').array,
                         trailBuf = geometry.getAttribute('a_trail').array
                    ; meshIndex--;) {
                    const item = meshes[meshIndex];
                    const {mesh, pickId, graphic} = item,
                        lineStyle = graphic.lineStyle || {},
                        pickColor = id2RGBA(pickId);

                    const flow = !!parseValueNotNil(lineStyle.flow, !!renderOpts.flow);
                    hasFlow = hasFlow || flow;

                    const resolveStyle = {
                        visible: graphic.visible ? 1 : 0,
                        flow: flow,
                        width: lineStyle.width || renderOpts.width,
                        minAlpha: flow ? (lineStyle.minAlpha || renderOpts.minAlpha) : 1.0,
                        speed: lineStyle.speed || renderOpts.speed,
                        length: lineStyle.length || renderOpts.length,
                        cycle: lineStyle.cycle || renderOpts.cycle,
                        lineColor: new Color(lineStyle.color || renderOpts.color)
                    }
                    //sub path
                    for (let pathIdx = 0, pathCount = mesh.length; pathIdx < pathCount; pathIdx++) {

                        //update index
                        for (let i = 0,
                                 index = mesh[pathIdx].index,
                                 len = index.length
                            ; i < len; ++i) {
                            indexBuf[indexCursor] = vertexCursor + index[i];
                            indexCursor++;
                        }

                        for (let i = 0,
                                 totalDis = mesh[pathIdx].totalDis,
                                 vertex = mesh[pathIdx].vertex,
                                 len = vertex.length / 10,
                                 renderStyle = resolveStyle
                            ; i < len; ++i) {
                            const ii = i * 10,
                                c4 = vertexCursor * 4,
                                c2 = vertexCursor * 2,
                                c41 = c4 + 1,
                                c42 = c4 + 2,
                                c43 = c4 + 3;

                            // vertex: hx,hy,lx,ly,offsetx,offsety,distance,delta,side,pointIndex
                            posBuf[c4] = vertex[ii];//hx
                            posBuf[c41] = vertex[ii + 1]//hy
                            posBuf[c42] = vertex[ii + 2]//lx
                            posBuf[c43] = vertex[ii + 3]//ly

                            offsetBuf[c2] = vertex[ii + 4];
                            offsetBuf[c2 + 1] = vertex[ii + 5];

                            disInfoBuf[c4] = vertex[ii + 6];
                            disInfoBuf[c41] = totalDis;
                            disInfoBuf[c42] = vertex[ii + 7];
                            disInfoBuf[c43] = vertex[ii + 8];

                            pickColorBuf[c4] = pickColor[0];
                            pickColorBuf[c41] = pickColor[1];
                            pickColorBuf[c42] = pickColor[2];
                            pickColorBuf[c43] = pickColor[3];


                            widthBuf[vertexCursor] = renderStyle.width;

                            const color = getColor?.({
                                pathIdx: pathIdx,
                                colorIndex: vertex[ii + 9],
                                vertexColor: graphic.vertexColor,
                                vertexValue: graphic.vertexValue
                            }) || renderStyle.lineColor;
                            colorBuf[c4] = color.r;
                            colorBuf[c41] = color.g;
                            colorBuf[c42] = color.b;
                            colorBuf[c43] = color.a * 255;

                            trailBuf[c4] = renderStyle.minAlpha;
                            trailBuf[c41] = renderStyle.speed;
                            trailBuf[c42] = renderStyle.length;
                            trailBuf[c43] = renderStyle.cycle;

                            visibleBuf[vertexCursor] = renderStyle.visible;
                            vertexCursor++;
                        }
                    }
                }
                return hasFlow;
            }

            function appearUpdateFn(meshes, geometry, getColor) {
                let hasFlow = false;
                for (let meshIndex = meshes.length,
                         vertexCursor = 0,
                         renderOpts = layer.renderOpts,
                         widthBuf = geometry.getAttribute('a_width').array,
                         colorBuf = geometry.getAttribute('a_color').array,
                         visibleBuf = geometry.getAttribute('a_visible').array,
                         trailBuf = geometry.getAttribute('a_trail').array
                    ; meshIndex--;) {
                    const item = meshes[meshIndex];
                    const {mesh, graphic} = item,
                        lineStyle = graphic.lineStyle || {};

                    const flow = !!parseValueNotNil(lineStyle.flow, !!renderOpts.flow);
                    hasFlow = hasFlow || flow;
                    const resolveStyle = {
                        visible: graphic.visible ? 1 : 0,
                        flow: flow,
                        width: lineStyle.width || renderOpts.width,
                        minAlpha: flow ? (lineStyle.minAlpha || renderOpts.minAlpha) : 1.0,
                        speed: lineStyle.speed || renderOpts.speed,
                        length: lineStyle.length || renderOpts.length,
                        cycle: lineStyle.cycle || renderOpts.cycle,
                        lineColor: new Color(lineStyle.color || renderOpts.color)
                    }
                    //sub path
                    for (let pathIdx = 0,
                             pathCount = mesh.length
                        ; pathIdx < pathCount; pathIdx++) {
                        //path tessellate data
                        const {vertex} = mesh[pathIdx];

                        for (let i = 0,
                                 len = vertex.length / 10,
                                 renderStyle = resolveStyle
                            ; i < len; ++i) {
                            const ii = i * 10,
                                c4 = vertexCursor * 4,
                                c41 = c4 + 1,
                                c42 = c4 + 2,
                                c43 = c4 + 3;

                            widthBuf[vertexCursor] = renderStyle.width;

                            const color = getColor?.({
                                pathIdx: pathIdx,
                                colorIndex: vertex[ii + 9],
                                vertexColor: graphic.vertexColor,
                                vertexValue: graphic.vertexValue
                            }) || renderStyle.lineColor;

                            colorBuf[c4] = color.r;
                            colorBuf[c41] = color.g;
                            colorBuf[c42] = color.b;
                            colorBuf[c43] = color.a * 255;

                            trailBuf[c4] = renderStyle.minAlpha;
                            trailBuf[c41] = renderStyle.speed;
                            trailBuf[c42] = renderStyle.length;
                            trailBuf[c43] = renderStyle.cycle;

                            visibleBuf[vertexCursor] = renderStyle.visible;
                            vertexCursor++;
                        }
                    }
                }
                geometry.getAttribute('a_width').needsUpdate = true;
                geometry.getAttribute('a_color').needsUpdate = true;
                geometry.getAttribute('a_visible').needsUpdate = true;
                geometry.getAttribute('a_trail').needsUpdate = true;
                return hasFlow;
            }
        },

        updateRenderParams(state) {
            const {lineMesh} = this;
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

        async getConnect() {
            if (!this.connect) {
                this.connect = await workers.open(WORKER_PATH);
            }
            return this.connect;
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
        updateStyle() {
            if (this.layerView) {
                this.layerView.updateFlags.add(Flags.appear);
                this.layerView.requestRender();
            }
        }
    });
}

export async function loadFlowLineLayer(opts) {
    const ctor = await buildModule(FlowLineLayerBuilder)
    return new ctor(opts);
}
