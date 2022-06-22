define([
    "esri/geometry/geometryEngine",
    "esri/geometry/projection",
    "esri/geometry/SpatialReference"
], (geometryEngine, projection, SpatialReference) => {
    function mix(x, y, a) {
        return x + (y - x) * a;
    }

    function id2RGBA(id) {
        return [
            ((id >> 0) & 0xFF), //r
            ((id >> 8) & 0xFF), //g
            ((id >> 16) & 0xFF), //b
            ((id >> 24) & 0xFF) //a
        ]
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    class Vector2 {
        constructor(x = 0, y = 0) {

            this.x = x;
            this.y = y;

        }

        set(x, y) {
            this.x = x;
            this.y = y;
            return this;
        }

        setX(x) {
            this.x = x;
            return this;
        }

        setY(y) {
            this.y = y;
            return this;
        }

        clone() {

            return new this.constructor(this.x, this.y);

        }

        copy(v) {
            this.x = v.x;
            this.y = v.y;
            return this;
        }

        add(v) {
            this.x += v.x;
            this.y += v.y;
            return this;
        }

        addScalar(s) {
            this.x += s;
            this.y += s;
            return this;
        }

        addVectors(a, b) {
            this.x = a.x + b.x;
            this.y = a.y + b.y;
            return this;
        }

        addScaledVector(v, s) {
            this.x += v.x * s;
            this.y += v.y * s;
            return this;
        }

        sub(v) {
            this.x -= v.x;
            this.y -= v.y;
            return this;
        }

        subScalar(s) {
            this.x -= s;
            this.y -= s;
            return this;
        }

        subVectors(a, b) {
            this.x = a.x - b.x;
            this.y = a.y - b.y;
            return this;
        }

        multiply(v) {
            this.x *= v.x;
            this.y *= v.y;

            return this;

        }

        multiplyScalar(scalar) {
            this.x *= scalar;
            this.y *= scalar;
            return this;

        }

        divide(v) {
            this.x /= v.x;
            this.y /= v.y;
            return this;
        }

        divideScalar(scalar) {

            return this.multiplyScalar(1 / scalar);

        }

        dot(v) {
            return this.x * v.x + this.y * v.y;
        }

        cross(v) {
            return this.x * v.y - this.y * v.x;
        }

        lengthSq() {

            return this.x * this.x + this.y * this.y;

        }

        length() {

            return Math.sqrt(this.x * this.x + this.y * this.y);

        }


        normalize() {

            return this.divideScalar(this.length() || 1);

        }

        angle() {
            // computes the angle in radians with respect to the positive x-axis
            const angle = Math.atan2(-this.y, -this.x) + Math.PI;
            return angle;
        }

        distanceTo(v) {
            return Math.sqrt(this.distanceToSquared(v));
        }

        distanceToSquared(v) {
            const dx = this.x - v.x, dy = this.y - v.y;
            return dx * dx + dy * dy;
        }

        equals(v) {
            return ((v.x === this.x) && (v.y === this.y));
        }

        rotateAround(center, angle) {

            const c = Math.cos(angle), s = Math.sin(angle);

            const x = this.x - center.x;
            const y = this.y - center.y;

            this.x = x * c - y * s + center.x;
            this.y = x * s + y * c + center.y;

            return this;

        }

        random() {
            this.x = Math.random();
            this.y = Math.random();
            return this;
        }

        floor() {
            this.x = Math.floor(this.x);
            this.y = Math.floor(this.y);
            return this;
        }
    }

    const SplitPerAngle = 15 / 180 * Math.PI;
    function tessellateLineRound(geometry) {
        if (geometry.type.toLowerCase() !== 'polyline') throw new Error('geometry type is not polyline');
        return geometry.paths.map(_tessellatePath);

        function _tessellatePath(path) {
            if (path.length < 2) {
                console.warn(`path's point length < 2, ignored`);
                return null;
            }

            let vertices = [], indices = [], ctxs = [];
            let totalLength = 0; //总长度
            let vertexCount = (path.length - 1) * 4; //顶点数
            let indexCount = (path.length - 1) * 6; //索引数
            //计算布局信息
            {
                //逆时针旋转90 为 side=1
                const lastDir = new Vector2(); //上一个方向
                const n1 = new Vector2(),
                    n2 = new Vector2(),
                    curDir = new Vector2(), //当前方向
                    curPoint = new Vector2(), //当前点
                    nextPoint = new Vector2(), //下一个点
                    offset = new Vector2(), //当前offset
                    c0 = new Vector2(), //拐角圆心offset
                    c1 = new Vector2(), //拐角圆弧起点offset
                    c2 = new Vector2(), //拐角圆弧终点offset;
                    temp = new Vector2();

                //for first point
                {
                    lastDir.set(path[1][0] - path[0][0], path[1][1] - path[0][1]);
                    totalLength += lastDir.length();
                    lastDir.normalize();
                    offset.set(-lastDir.y, lastDir.x);
                    ctxs.push({
                        isCw: true,//顺时针
                        common: {
                            x: path[0][0],
                            y: path[0][1],
                            len: 0, //长度
                            index: 0, //原始点索引
                        },
                        p1: {
                            side: 1,
                            offset: [offset.x, offset.y],
                            delta: 0,
                        },
                        p2: {
                            side: -1,
                            offset: [-offset.x, -offset.y],
                            delta: 0,
                        },
                    })
                }

                //between points
                for (let i = 1, count = path.length; i < count - 1; i++) {
                    curPoint.set(path[i][0], path[i][1]);
                    const oldLen = totalLength;
                    nextPoint.set(path[i + 1][0], path[i + 1][1]);
                    curDir.subVectors(nextPoint, curPoint);
                    totalLength += curDir.length(); //更新长度
                    curDir.normalize();
                    const isCw = lastDir.cross(curDir) <= 0; //拐角是否是顺时针
                    n1.copy(lastDir);
                    n2.copy(curDir);

                    if (isCw) {
                        n1.set(-n1.y, n1.x); //逆时针90
                        n2.set(-n2.y, n2.x);
                    } else {
                        n1.set(n1.y, -n1.x); //顺时针90
                        n2.set(n2.y, -n2.x);
                    }

                    offset.addVectors(n1, n2).normalize();
                    offset.multiplyScalar(1 / n1.dot(offset));
                    c0.copy(offset).multiplyScalar(-1);// -offset
                    c1.copy(c0).addScaledVector(n1, 2);// c0 + 2n1;
                    c2.copy(c0).addScaledVector(n2, 2);// c0 + 2n2;

                    const delta = temp.subVectors(offset, n1).length();
                    const c0Side = isCw ? -1 : 1;
                    const c1c2Side = isCw ? 1 : -1;
                    //对n1,n2所夹的圆弧插值
                    const sub = vecInterpolation(n1, n2, -delta, delta, isCw);
                    vertexCount += sub.length * 2 - 1;
                    indexCount += (sub.length - 1) * 3;
                    sub.forEach(item => {
                        //c0 + 2 * sub
                        const [x, y] = item.vec;
                        item.vec = [
                            c0.x + x * 2,
                            c0.y + y * 2
                        ]
                    })
                    ctxs.push({
                        isCw: isCw,
                        common: {
                            x: curPoint.x,
                            y: curPoint.y,
                            len: oldLen, //长度
                            index: i, //原始点索引
                        },
                        c0: {
                            side: c0Side,
                            offset: [c0.x, c0.y],
                            delta: undefined, //动态值
                        },
                        c1: {
                            side: c1c2Side,
                            offset: [c1.x, c1.y],
                            delta: -delta,
                        },
                        c2: {
                            side: c1c2Side,
                            offset: [c2.x, c2.y],
                            delta: delta,
                        },
                        sub,
                    });
                    lastDir.copy(curDir);
                }

                //the last point
                {
                    const lastIndex = path.length - 1
                    curPoint.set(path[lastIndex][0], path[lastIndex][1]);
                    offset.copy(lastDir);
                    offset.set(-offset.y, offset.x);
                    ctxs.push({
                        isCw: true,//顺时针
                        count: 2,  //顶点数
                        common: {
                            x: curPoint.x,
                            y: curPoint.y,
                            len: totalLength, //长度
                            index: lastIndex, //原始点索引
                        },
                        p1: {
                            side: 1,
                            offset: [offset.x, offset.y],
                            delta: 0,
                        },
                        p2: {
                            side: -1,
                            offset: [-offset.x, -offset.y],
                            delta: 0,
                        },
                    })
                }
            }

            let vertexCursor = 0, indexCursor = 0;
            // x,y,offsetx,offsety,distance,delta,side,index
            const vertexBuffer = new Float32Array(vertexCount * 8);
            const indexBuffer = new Float64Array(indexCount);
            {
                const count = ctxs.length;
                for (let i = 1; i < count - 1; i++) {
                    const before = ctxs[i - 1];
                    const cur = ctxs[i];
                    const {p1, p2} = before;
                    const {c0, c1, c2, isCw, sub} = cur;

                    //rect
                    const l = vertices.length;
                    const _c0 = {...cur.common, ...c0, delta: c1.delta},
                        _c1 = {...cur.common, ...c1};
                    vertices.push( //p1,p2,c0,c1
                        {...before.common, ...p1},
                        {...before.common, ...p2},
                        isCw ? _c1 : _c0,
                        isCw ? _c0 : _c1
                    )
                    indices.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);

                    //corner
                    const ll = vertices.length;
                    const count = sub.length - 1; //份数
                    const subSide = isCw ? 1 : -1;
                    vertices.push({
                        ...cur.common,
                        delta: sub[0].value,
                        offset: sub[0].vec,
                        side: subSide
                    });
                    for (let i = 1; i <= count; i++) {
                        const beforeSub = sub[i - 1];
                        const curSub = sub[i];
                        vertices.push(
                            {
                                ...cur.common,
                                ...c0,
                                delta: (beforeSub.value + curSub.value) / 2
                            },
                            {
                                ...cur.common,
                                side: subSide,
                                delta: curSub.value,
                                offset: curSub.vec
                            }
                        )
                        const offset = ll + i * 2;
                        //三角形图元逆时针
                        isCw ? indices.push(offset - 2, offset - 1, offset)
                            : indices.push(offset, offset - 1, offset - 2)
                    }

                    //update
                    c0.delta = c2.delta;
                    cur.p1 = isCw ? c2 : c0;
                    cur.p2 = isCw ? c0 : c2;
                }

                //for last point
                const before = ctxs[count - 2];
                const cur = ctxs[count - 1];
                const l = vertices.length;
                vertices.push(
                    {...before.common, ...before.p1},
                    {...before.common, ...before.p2},
                    {...cur.common, ...cur.p1},
                    {...cur.common, ...cur.p2}
                )
                indices.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
            }

            vertices = vertices.map((item) => {
                return {
                    x: item.x,
                    y: item.y,
                    xOffset: item.offset[0],
                    yOffset: item.offset[1] * -1,
                    distance: item.len,
                    disWidthDelta: item.delta,
                    side: item.side,
                    index: item.index
                }
            })

            return {vertices, indices, totalDis: totalLength}

            function vecInterpolation(n1, n2, range1, range2, cw = true) {
                const angle = Math.acos(n1.dot(n2) / (n1.length() * n2.length())) || 0;
                const splitCount = Math.max((angle / SplitPerAngle) >> 0, 1);
                if (splitCount === 1) {
                    return [
                        {vec: [n1.x, n1.y], value: range1},
                        {vec: [n2.x, n2.y], value: range2},
                    ]
                }
                const per = (cw ? -1 : 1) * angle / splitCount, perVal = (range2 - range1) / splitCount;
                const cos = Math.cos(per), sin = Math.sin(per);
                const res = [{
                    vec: [n1.x, n1.y],
                    value: range1
                }];
                for (let i = 1; i <= splitCount; i++) {
                    const before = res[i - 1];
                    const _v = before.vec;
                    res.push({
                        vec: [
                            _v[0] * cos - _v[1] * sin,
                            _v[0] * sin + _v[1] * cos
                        ],
                        value: before.value + perVal
                    });
                }
                return res;
            }
        }
    }

    function tessellateFlowLine(params) {
        return projection.load().then(() => {
            let {sr, geometry} = JSON.parse(params)
            sr = new SpatialReference(sr);
            geometry = geometryEngine.simplify(geometry);
            if (!sr.equals(geometry.spatialReference)) {
                geometry = projection.project(geometry, sr);
            }
            return {
                mesh: tessellateLineRound(geometry),
                extent: geometry.extent.toJSON()
            };
        });
    }


    let id = 1;
    const map = new Map();

    function setCache(anyData) {
        const key = ++id;
        map.set(key, anyData);
        return key;
    }

    function removeCache(key) {
        map.delete(key);
    }

    function createRasterFlowLineMesh({data, setting, useCache, computeSpeedRange}) {
        let cacheId;
        if (useCache) {
            data.data = map.get(data.data);
        } else {
            data.data = new Float32Array(data.data);
            cacheId = setCache(data.data);
        }

        let speedRange
        if (computeSpeedRange) {
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
            speedRange = [min, max]
        }

        const sampler = createSampler(data);
        const paths = buildRasterPaths(setting, sampler, data.width, data.height);
        const {buffer1, buffer2, buffer3, buffer4} = toBuffer(paths);
        return {
            result: {
                buffer1: buffer1.buffer,
                buffer2: buffer2.buffer,
                buffer3: buffer3.buffer,
                buffer4: buffer4.buffer,
                speedRange,
                cacheId: useCache ? null : cacheId
            },
            transferList: [
                buffer1.buffer,
                buffer2.buffer,
                buffer3.buffer,
                buffer4.buffer,
            ]
        }

        function toBuffer(paths) {
            let segmentCount = 0;
            for (let i = 0; i < paths.length; i++) {
                segmentCount += paths[i].length - 1;
            }
            const n = segmentCount * 4;
            const buffer1 = new Float32Array(n);
            const buffer2 = new Float32Array(n);
            const buffer3 = new Float32Array(n);
            const buffer4 = new Float32Array(segmentCount * 2);
            let cursor = 0;
            for (let i = 0; i < paths.length; i++) {
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
                    buffer1[c] = p0.x;
                    buffer1[c1] = p0.y;
                    buffer1[c2] = p1.x;
                    buffer1[c3] = p1.y;

                    buffer2[c] = p2.x;
                    buffer2[c1] = p2.y;
                    buffer2[c2] = p3.x;
                    buffer2[c3] = p3.y;

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
                buffer4,
            }
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
            points.push({
                x: startX,
                y: startY,
                t: time,
                speed: _vec2.set(...sampler(startX, startY)).length()
            });
            for (let i = 0; i < setting.verticesPerLine; i++) {
                if (i && !inRange(curPoint.x, curPoint.y)) break;
                const uv = _vec2.set(...sampler(curPoint.x, curPoint.y));
                const originSpeed = uv.length();
                uv.multiplyScalar(setting.velocityScale);
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
                    t: time,
                    speed: originSpeed,
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
    }

    function processTINMeshPart({data, sourceSR, targetSR, offsetCenter, pickIndexOffset}) {
        const isSameSR = sourceSR.wkid === targetSR.wkid;
        return new Promise(resolve => {
            if (isSameSR) {
                resolve()
            } else {
                projection.load().then(() => resolve())
            }
        }).then(() => {
            const [offsetX, offsetY] = offsetCenter;
            const vertex = new Float64Array(data);
            const tinCount = vertex.length / 6;

            const pickColor = new Uint8ClampedArray(tinCount * 4);
            for (let i = 0; i < tinCount; i++) {
                const i4 = i * 4;
                const color = id2RGBA(i + 1 + pickIndexOffset);
                pickColor[i4] = color[0];
                pickColor[i4 + 1] = color[1];
                pickColor[i4 + 2] = color[2];
                pickColor[i4 + 3] = color[3];
            }

            const offsetVertex = new Float32Array(vertex.length);

            if (!isSameSR) {
                for (let i = 0; i < vertex.length; i += 2) {
                    const projectPoint = projection.project({
                        x: vertex[i],
                        y: vertex[i + 1],
                        spatialReference: sourceSR,
                    }, targetSR);
                    offsetVertex[i] = projectPoint.x - offsetX;
                    offsetVertex[i + 1] = projectPoint.y - offsetY;
                }
            } else {
                for (let i = 0; i < vertex.length; i += 2) {
                    offsetVertex[i] = vertex[i] - offsetX;
                    offsetVertex[i + 1] = vertex[i + 1] - offsetY;
                }
            }
            return {
                result: {
                    vertexBuffer: offsetVertex.buffer,
                    pickBuffer: pickColor.buffer,
                },
                transferList: [
                    offsetVertex.buffer,
                    pickColor.buffer,
                ]
            }
        });
    }

    return {
        tessellateFlowLine,
        createRasterFlowLineMesh,
        processTINMeshPart,
        setCache,
        removeCache,
    }
})




