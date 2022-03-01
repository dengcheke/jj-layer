import * as esriLoader from "esri-loader"
import {mat3} from 'gl-matrix';
import {doubleToTwoFloats, id2RGBA, RGBA2Id} from "@src/utils";


//reference: https://developers.arcgis.com/javascript/latest/sample-code/custom-gl-tessellation-helpers/

const vertexSource = `
    precision highp float;
    uniform mat3 u_transform;
    uniform mat3 u_rotation;
    uniform mat3 u_display;
    uniform vec4 u_center;
    uniform float u_is_picking;
    uniform vec2 u_offset_scale;
    
    attribute vec4 a_position;
    attribute vec2 a_offset;
    attribute vec2 a_texcoord;
    attribute float a_distance;
    attribute float a_upright;
    attribute vec4 a_pick_color;
    varying vec2 v_texcoord;
    varying vec4 v_pick_color;
    void main() {
        vec2 position = (a_position.xy - u_center.xy) + (a_position.zw - u_center.zw);
        vec2 offset = u_offset_scale * a_offset;
        vec3 transformedOffset = mix(u_rotation * vec3(offset, 0.0), vec3(offset, 0.0), a_upright);
        gl_Position.xy = (u_display * (u_transform * vec3(position, 1.0) + transformedOffset)).xy;
        gl_Position.zw = vec2(0.0, 1.0);
        v_texcoord = a_texcoord;
        v_pick_color = a_pick_color;
    }
`
const fragmentSource = `
    precision highp float;
    uniform float u_is_picking;
    varying vec2 v_texcoord;
    varying vec4 v_pick_color;
    void main() {
        if(u_is_picking == 1.0){ 
            gl_FragColor = v_pick_color; 
        }else{
            gl_FragColor = vec4(v_texcoord, 0.0, 1.0);
        }
    }
`
const floatAttrNum = 10,
    intAttrNum = 4,
    bytesPerVertex = floatAttrNum * Float32Array.BYTES_PER_ELEMENT + intAttrNum * Uint8ClampedArray.BYTES_PER_ELEMENT;

async function CustomLayerTask() {
    const [watchUtils, GraphicsLayer, BaseLayerViewGL2D, geometryEngineAsync]
        = await esriLoader.loadModules([
        "esri/core/watchUtils",
        "esri/layers/GraphicsLayer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/geometry/geometryEngineAsync",
    ]);
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        floatAttrNum: floatAttrNum,
        intAttrNum: intAttrNum,
        bytesPerVertex: bytesPerVertex,
        constructor: function () {
            this.watchers = [];
            this.indexBufferSize = 0;

            this.program = null;
            //              position       |       offset       |    uv     | distance | upright |         pickColor
            //  hx  |  hy    |  lx   | ly  | xoffset |  yoffset |   u |  v  | distance | upright | pickr | pickg | pickb | picka
            //   f  |   f    |   f   |  f  |    f    |     f    |   f |  f  |    f     |   f     |   uic |   uic |   uic |  uic
            //  4   |   4    |   4   |  4  |    4    |     4    |   4 |  4  |    4     |   4     |    1  |    1  |    1  |   1
            this.attributes = {
                position: {
                    name: "a_position",
                    location: 0, size: 4, type: WEBGL.FLOAT, normalize: false, stride: bytesPerVertex, offset: 0,
                },
                offset: {
                    name: "a_offset",
                    location: 1, size: 2, type: WEBGL.FLOAT, normalize: false, stride: bytesPerVertex, offset: 16,
                },
                texCoord: {
                    name: "a_texcoord",
                    location: 2, size: 2, type: WEBGL.FLOAT, normalize: false, stride: bytesPerVertex, offset: 24,
                },
                distance: {
                    name: "a_distance",
                    location: 3, size: 1, type: WEBGL.FLOAT, normalize: false, stride: bytesPerVertex, offset: 32,
                },
                upright: {
                    name: "a_upright",
                    location: 4, size: 1, type: WEBGL.FLOAT, normalize: false, stride: bytesPerVertex, offset: 36,
                },
                pickColor: {
                    name: "a_pick_color",
                    location: 5,
                    size: 4,
                    type: WEBGL.UNSIGNED_BYTE,
                    normalize: true,
                    stride: bytesPerVertex,
                    offset: 40,
                }
            };
            this.uniforms = {
                transform: {name: "u_transform", location: null, type: "uniformMatrix3fv"},
                rotation: {name: 'u_rotation', location: null, type: "uniformMatrix3fv"},
                display: {name: 'u_display', location: null, type: "uniformMatrix3fv"},
                currentTime: {name: 'u_current_time', location: null, type: 'uniform1f'},
                center: {name: 'u_center', location: null, type: "uniform4fv"},
                isPicking: {name: 'u_is_picking', location: null, type: "uniform1f"},
                offsetScale: {name: 'u_offset_scale', location: null, type: "uniform2fv"}
            };

            this.vertexBuffer = null;
            this.indexBuffer = null;

            this.pickBuffer = {
                frameBuffer: null,
                texture: null,
                depthBuffer: null,
            };

            this.transform = mat3.create();
            this.rotation = mat3.create();
            this.display = mat3.create();


            //watch
            const handleDataChange = async () => {
                const meshes = await Promise.all(this.layer.graphics.map(async (g, idx) => {
                    const geo = await geometryEngineAsync.simplify(g.geometry);
                    const mesh = await this.processGraphic(geo);
                    return {
                        mesh: mesh,
                        attributes: g.attributes,
                        pickIdx: idx + 1
                    }
                }));
                this.meshes = meshes;
                this.updatePositions();
                this.requestRender();
            };
            this.watchers.push(watchUtils.on(this, "layer.graphics", "change", handleDataChange, handleDataChange, handleDataChange));
        },

        attach: function () {
            const gl = this.context;
            let message, vertexShader, fragmentShader;

            //compile shader
            {
                vertexShader = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(vertexShader, vertexSource);
                gl.compileShader(vertexShader);
                message = gl.getShaderInfoLog(vertexShader);
                if (message.length > 0) throw message;

                fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(fragmentShader, fragmentSource);
                gl.compileShader(fragmentShader);
                message = gl.getShaderInfoLog(fragmentShader);
                if (message.length > 0) throw message;
            }

            // Create the shader program.
            this.program = gl.createProgram();
            gl.attachShader(this.program, vertexShader);
            gl.attachShader(this.program, fragmentShader);

            //bind attributes location
            Object.keys(this.attributes).map(key => {
                const attr = this.attributes[key];
                gl.bindAttribLocation(this.program, attr.location, attr.name);
            });

            gl.linkProgram(this.program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);

            //get uniform location
            Object.keys(this.uniforms).map(key => {
                const uniform = this.uniforms[key];
                uniform.location = gl.getUniformLocation(this.program, uniform.name);
            });

            this.vertexBuffer = gl.createBuffer();
            this.indexBuffer = gl.createBuffer();

            initPickFrameBuffer.call(this);

            function initPickFrameBuffer() {
                //frame buffer
                const pickFrameBuffer = gl.createFramebuffer();

                //create texture as color buffer
                const pickTexture = gl.createTexture();
                this.pickBuffer.texture = pickTexture;
                gl.bindTexture(gl.TEXTURE_2D, pickTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

                //create depth buffer
                const depthBuffer = gl.createRenderbuffer();

                gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 1, 1);

                //attach texture and depthBuffer to frameBuffer
                gl.bindFramebuffer(gl.FRAMEBUFFER, pickFrameBuffer);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickTexture, 0);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

                {
                    const e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
                    if (gl.FRAMEBUFFER_COMPLETE !== e) {
                        console.log('Frame buffer object is incomplete: ' + e.toString());
                    }
                }

                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.bindTexture(gl.TEXTURE_2D, null);
                gl.bindRenderbuffer(gl.RENDERBUFFER, null);
                this.pickBuffer = {
                    frameBuffer: pickFrameBuffer,
                    texture: pickTexture,
                    depthBuffer: depthBuffer
                }
            }
        },

        detach: function () {
            // Stop watching the `layer.graphics` collection.
            this.watchers.forEach(i => i.remove());
            this.watchers = [];
            const gl = this.context;

            // Delete buffers and programs.
            gl.deleteBuffer(this.vertexBuffer);
            gl.deleteBuffer(this.indexBuffer);

            gl.deleteTexture(this.pickBuffer.texture);
            gl.deleteRenderbuffer(this.pickBuffer.depthBuffer);
            gl.deleteFramebuffer(this.pickBuffer.frameBuffer);

            gl.deleteProgram(this.program);
        },

        getUfmLoc: function (p) {
            return this.uniforms[p].location;
        },
        // Called every time a frame is rendered.
        render: function (renderParameters) {
            const gl = renderParameters.context;
            const state = renderParameters.state;
            const stationary = renderParameters.stationary;
            if (!this.layer.visible
                || !this.layer.fullExtent
                || !this.layer.fullExtent.intersects(state.extent)
                || this.indexBufferSize === 0
            ) return;

            if (!stationary) this.requestRender();

            this.updateTransform(state);
            const [hx, lx] = doubleToTwoFloats(state.center[0]);
            const [hy, ly] = doubleToTwoFloats(state.center[1]);

            // Draw.
            gl.useProgram(this.program);
            {
                gl.uniform1f(this.getUfmLoc('isPicking'), 0.0);
                gl.uniformMatrix3fv(this.getUfmLoc('transform'), false, this.transform);
                gl.uniformMatrix3fv(this.getUfmLoc('rotation'), false, this.rotation);
                gl.uniformMatrix3fv(this.getUfmLoc('display'), false, this.display);
                gl.uniform1f(this.getUfmLoc('currentTime'), performance.now() / 1000.0);
                gl.uniform4fv(this.getUfmLoc('center'), [hx, hy, lx, ly]);
                gl.uniform2fv(this.getUfmLoc('offsetScale'), [state.pixelRatio, state.pixelRatio])
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            Object.keys(this.attributes).forEach(key => {
                const attr = this.attributes[key];
                gl.enableVertexAttribArray(attr.location);
                gl.vertexAttribPointer(attr.location, attr.size, attr.type, attr.normalize, attr.stride, attr.offset);
            })

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.CULL_FACE);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(gl.TRIANGLES, this.indexBufferSize, gl.UNSIGNED_SHORT, 0);
        },

        updateTransform(state) {

            mat3.identity(this.transform);
            mat3.translate(this.transform, this.transform, [
                (state.pixelRatio * state.size[0]) / 2,
                (state.pixelRatio * state.size[1]) / 2
            ]);
            mat3.rotate(this.transform, this.transform, (Math.PI * state.rotation) / 180);
            mat3.scale(this.transform, this.transform, [
                state.pixelRatio / state.resolution,
                -state.pixelRatio / state.resolution
            ]);


            mat3.identity(this.rotation);
            mat3.rotate(this.rotation, this.rotation, (Math.PI * state.rotation) / 180);


            mat3.identity(this.display);
            mat3.translate(this.display, this.display, [-1, 1]);
            mat3.scale(this.display, this.display, [
                2 / (state.pixelRatio * state.size[0]),
                -2 / (state.pixelRatio * state.size[1])
            ]);
        },

        processGraphic: async function (geo) {
            switch (geo.type) {
                case "extent":
                    return this.tessellateExtent(geo);
                case "point":
                    return this.tessellatePoint(geo, {
                        x: -16,
                        y: -16,
                        width: 32,
                        height: 32
                    })
                case "multipoint":
                    return this.tessellateMultipoint(geo, {
                        x: -16,
                        y: -16,
                        width: 32,
                        height: 32
                    })
                case "polyline":
                    return this.tessellatePolyline(geo, 20)
                case "polygon":
                    return this.tessellatePolygon(geo)
            }
        },

        updatePositions: function () {
            const gl = this.context;

            const vertexCount = this.meshes.reduce((vertexCount, item) => {
                return vertexCount + item.mesh.vertices.length;
            }, 0);
            const indexCount = this.meshes.reduce((indexCount, item) => {
                return indexCount + item.mesh.indices.length;
            }, 0);

            const {floatAttrNum, intAttrNum, bytesPerVertex} = this;
            const vertexData = new ArrayBuffer(bytesPerVertex * vertexCount);
            const indexData = new Uint16Array(indexCount);

            let currentVertex = 0;
            let currentIndex = 0;

            for (let meshIndex = 0; meshIndex < this.meshes.length; ++meshIndex) {
                const item = this.meshes[meshIndex];
                const mesh = item.mesh;
                const upright = item.attributes && item.attributes.upright ? 1 : 0;
                const pickColor = id2RGBA(item.pickIdx);

                for (let i = 0; i < mesh.indices.length; ++i) {
                    let idx = mesh.indices[i];
                    indexData[currentIndex] = currentVertex + idx;
                    currentIndex++;
                }

                for (let i = 0; i < mesh.vertices.length; ++i) {
                    const v = mesh.vertices[i], {x, y} = v;
                    const [hx, lx] = doubleToTwoFloats(x);
                    const [hy, ly] = doubleToTwoFloats(y);
                    let buf = new Float32Array(vertexData, currentVertex * bytesPerVertex, floatAttrNum);
                    buf[0] = hx;
                    buf[1] = hy;
                    buf[2] = lx;
                    buf[3] = ly;
                    buf[4] = v.xOffset;
                    buf[5] = v.yOffset;
                    buf[6] = v.uTexcoord;
                    buf[7] = v.vTexcoord;
                    buf[8] = v.distance;
                    buf[9] = upright;
                    buf = new Uint8ClampedArray(
                        vertexData,
                        currentVertex * bytesPerVertex + floatAttrNum * Float32Array.BYTES_PER_ELEMENT,
                        intAttrNum
                    );
                    buf[0] = pickColor[0]; //r
                    buf[1] = pickColor[1]; //g
                    buf[2] = pickColor[2]; //b
                    buf[3] = pickColor[3]; //a

                    currentVertex++;
                }
            }

            // Upload data to the GPU
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

            // Record number of indices.
            this.indexBufferSize = indexCount;
        },

        updateHitTestTransform(state) {
            mat3.identity(this.transform);
            mat3.translate(this.transform, this.transform, [
                (state.pixelRatio * state.size[0]) / 2,
                (state.pixelRatio * state.size[1]) / 2
            ]);
            mat3.rotate(this.transform, this.transform, (Math.PI * state.rotation) / 180);
            mat3.scale(this.transform, this.transform, [
                state.pixelRatio * state.size[0] / state.resolution,
                -state.pixelRatio * state.size[1] / state.resolution
            ]);


            mat3.identity(this.rotation);
            mat3.rotate(this.rotation, this.rotation, (Math.PI * state.rotation) / 180);

            mat3.identity(this.display);
            mat3.translate(this.display, this.display, [-1, 1]);
            mat3.scale(this.display, this.display, [
                2 / (state.pixelRatio * state.size[0]),
                -2 / (state.pixelRatio * state.size[1])
            ]);
        },

        hitTest: function (x, y) {
            const point = this.view.toMap({x: x, y: y});
            if (!this.layer.visible
                || !this.layer.fullExtent
                || !this.layer.fullExtent.contains(point)
                || this.indexBufferSize === 0
            ) {
                return Promise.resolve(null);
            }
            const state = this.view.state, gl = this.context;
            const {frameBuffer} = this.pickBuffer;

            this.updateHitTestTransform(state);
            const [hx, lx] = doubleToTwoFloats(point.x);
            const [hy, ly] = doubleToTwoFloats(point.y);

            gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
            drawPickBuffer.call(this);
            const res = pickGraphic.call(this);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return res;

            function drawPickBuffer() {
                gl.clearColor(0.0, 0.0, 0.0, 0.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                gl.useProgram(this.program);
                {
                    gl.uniform1f(this.getUfmLoc('isPicking'), 1.0);
                    gl.uniformMatrix3fv(this.getUfmLoc('transform'), false, this.transform);
                    gl.uniformMatrix3fv(this.getUfmLoc('rotation'), false, this.rotation);
                    gl.uniformMatrix3fv(this.getUfmLoc('display'), false, this.display);
                    gl.uniform4fv(this.getUfmLoc('center'), [hx, hy, lx, ly]);
                    gl.uniform2fv(this.getUfmLoc('offsetScale'), [state.size[0] * state.pixelRatio, state.size[1] * state.pixelRatio]);
                }
                {
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
                    Object.keys(this.attributes).forEach(key => {
                        const attr = this.attributes[key];
                        gl.enableVertexAttribArray(attr.location);
                        gl.vertexAttribPointer(attr.location, attr.size, attr.type, attr.normalize, attr.stride, attr.offset);
                    })
                }

                gl.disable(gl.BLEND);
                gl.disable(gl.CULL_FACE);
                gl.enable(gl.DEPTH_TEST);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
                gl.drawElements(gl.TRIANGLES, this.indexBufferSize, gl.UNSIGNED_SHORT, 0);
            }

            function pickGraphic() {
                const data = new Uint8ClampedArray(4);
                gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data);
                const id = RGBA2Id(data);
                if (id > 0) {
                    const pickNdx = id - 1;
                    const g = this.layer.graphics.getItemAt(pickNdx);
                    return Promise.resolve(g || null);
                } else {
                    return Promise.resolve(null);
                }
            }
        },
    });
    return GraphicsLayer.createSubclass({
        createLayerView: function (view) {
            if (view.type === "2d") {
                return new CustomLayerView2D({
                    view: view,
                    layer: this
                });
            }
        }
    });
}

let customLayer = null;

export async function loadCustomLayer(opts) {
    if (!customLayer) {
        customLayer = CustomLayerTask().then(ctor => {
            customLayer = ctor;
        })
    }
    await customLayer;
    return new customLayer(opts);
}
