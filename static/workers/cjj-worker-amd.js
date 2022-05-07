define([
    "esri/geometry/geometryEngine",
    "esri/geometry/projection",
    "esri/geometry/SpatialReference"
], (geometryEngine, projection, SpatialReference) => {
    function mix(x, y, a) {
        return x + (y - x) * a;
    }
    function doubleToTwoFloats(value) {
        let high, low, tempHigh;
        if (value >= 0) {
            if (value < 65536) return [0, value];
            tempHigh = Math.floor(value / 65536) * 65536;
            high = tempHigh;
            low = value - tempHigh;
        } else {
            if (value > -65536) return [0, value];
            tempHigh = Math.floor(-value / 65536) * 65536;
            high = -tempHigh;
            low = value + tempHigh;
        }
        return [high, low];
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

    const RadToDeg = 180 / Math.PI;

    function tessellateLineRound(geometry) {
        if (geometry.type.toLowerCase() !== 'polyline') throw new Error('geometry type is not polyline');
        return geometry.paths.map(_tessellatePath);

        function _tessellatePath(path) {
            if (path.length < 2) {
                console.warn(`path's point length < 2, ignored`);
                return null;
            }
            const vertices = [], indices = [], segaments = [];
            // 0       1     2
            // before  cur  after
            const state = {
                distance: 0,
                d01: new Vector2(), //direction
                d12: new Vector2(),
                n01: new Vector2(), // normal
                n12: new Vector2(),
                l01: 0, // length
                l12: 0,
            }
            const v2 = new Vector2();
            for (let i = 0; i < path.length; i++) {
                let before = path[i - 1], cur = path[i], after = path[i + 1];
                if (!before) {
                    v2.set(after[0] - cur[0], after[1] - cur[1])
                    state.l12 = v2.length();
                    v2.normalize();
                    state.d12.copy(v2);
                    state.n12.set(-v2.y, v2.x); // ccw 90

                    segaments.push([
                        {
                            x: cur[0],
                            y: cur[1],
                            xOffset: state.n12.x,
                            yOffset: state.n12.y,
                            distance: state.distance,
                            disWidthDelta: 0,//拐角圆弧的距离插值数, 以半宽度为基准
                            side: 1
                        },
                        {
                            x: cur[0],
                            y: cur[1],
                            xOffset: -state.n12.x,
                            yOffset: -state.n12.y,
                            distance: state.distance,
                            disWidthDelta: 0,
                            side: -1
                        }
                    ]);
                } else if (!after) {
                    const {distance, n01} = state;
                    segaments.push([
                        {
                            x: cur[0],
                            y: cur[1],
                            xOffset: n01.x,
                            yOffset: n01.y,
                            distance: distance,
                            disWidthDelta: 0,
                            side: 1
                        },
                        {
                            x: cur[0],
                            y: cur[1],
                            xOffset: -n01.x,
                            yOffset: -n01.y,
                            distance: distance,
                            disWidthDelta: 0,
                            side: -1
                        }
                    ]);
                } else {
                    v2.set(after[0] - cur[0], after[1] - cur[1]);
                    state.l12 = v2.length();
                    v2.normalize()
                    state.d12.copy(v2);
                    state.n12.set(-v2.y, v2.x);
                    const {n01, n12, distance} = state;
                    const iscw = n01.cross(n12) <= 0;
                    v2.addVectors(n01, n12).normalize();
                    v2.multiplyScalar(1 / n01.dot(v2));// v2 here is offset
                    const disWidthDelta = new Vector2().subVectors(v2, n01).length();
                    let p1, p0, p2;
                    if (iscw) {
                        v2.multiplyScalar(-1);
                        p1 = {
                            x: cur[0],
                            y: cur[1],
                            xOffset: v2.x,
                            yOffset: v2.y,
                            distance: distance,
                            disWidthDelta: null,//to do interpolation
                            side: -1,
                            cw: true,
                            n01: n01.clone(),
                            n12: n12.clone(),
                        }
                        p0 = {
                            x: cur[0],
                            y: cur[1],
                            xOffset: v2.x + n01.x * 2,
                            yOffset: v2.y + n01.y * 2,
                            distance: distance,
                            disWidthDelta: -disWidthDelta,
                            side: 1
                        }
                        p2 = {
                            x: cur[0],
                            y: cur[1],
                            xOffset: v2.x + n12.x * 2,
                            yOffset: v2.y + n12.y * 2,
                            distance: distance,
                            disWidthDelta: +disWidthDelta,
                            side: 1
                        }
                    } else {
                        p1 = {
                            x: cur[0],
                            y: cur[1],
                            xOffset: v2.x,
                            yOffset: v2.y,
                            distance: distance,
                            disWidthDelta: null,
                            side: 1,
                            cw: false,
                            n01: n01.clone(),
                            n12: n12.clone(),
                        }
                        p0 = {
                            x: cur[0],
                            y: cur[1],
                            xOffset: v2.x - 2 * n01.x,
                            yOffset: v2.y - 2 * n01.y,
                            distance: distance,
                            disWidthDelta: -disWidthDelta,
                            side: -1
                        }
                        p2 = {
                            x: cur[0],
                            y: cur[1],
                            xOffset: v2.x - 2 * n12.x,
                            yOffset: v2.y - 2 * n12.y,
                            distance: distance,
                            disWidthDelta: disWidthDelta,
                            side: -1
                        }
                    }
                    segaments.push([p0, p1, p2]);
                }
                //update state
                state.distance += state.l12;
                state.l01 = state.l12;
                state.l12 = 0;
                state.d01.copy(state.d12);
                state.n01.copy(state.n12);
            }
            while (segaments.length) {
                const pArr0 = segaments.shift();
                const pArr1 = segaments.shift();
                if (pArr1.length === 2) {
                    const l = vertices.length;
                    vertices.push(pArr0[0], pArr0[1], pArr1[0], pArr1[1]);
                    indices.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
                } else {
                    const [s0, s1] = pArr0, [p0, p1, p2] = pArr1;
                    const {n01, n12, cw, xOffset, yOffset} = p1;
                    let l = vertices.length;
                    if (cw) {
                        vertices.push(s0, s1, p0, {...p1, disWidthDelta: p0.disWidthDelta});
                    } else {
                        vertices.push(s0, s1, {...p1, disWidthDelta: p0.disWidthDelta}, p0);
                    }
                    indices.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
                    const angle = Math.acos(n01.dot(n12)) * RadToDeg;
                    const per = angle ? Math.ceil(angle / 30) : 0;
                    //Interpolation
                    const inters = vecInterpolation(
                        n01.clone().multiplyScalar(2 * (cw ? 1 : -1)),
                        n12.clone().multiplyScalar(2 * (cw ? 1 : -1)),
                        p0.disWidthDelta,
                        p2.disWidthDelta,
                        cw,
                        per + 2
                    );
                    for (let i = 0; i < inters.length - 1; i++) {
                        const bp = inters[i], ap = inters[i + 1];
                        l = vertices.length;
                        const t1 = {
                                ...p0,
                                xOffset: xOffset + bp.vec.x,
                                yOffset: yOffset + bp.vec.y,
                                disWidthDelta: bp.val,
                            },
                            t2 = {...p1, disWidthDelta: (bp.val + ap.val) * 0.5},
                            t3 = {
                                ...p0,
                                xOffset: xOffset + ap.vec.x,
                                yOffset: yOffset + ap.vec.y,
                                disWidthDelta: ap.val,
                            };
                        vertices.push(t1, t2, t3);
                        cw ? indices.push(l, l + 1, l + 2)
                            : indices.push(l, l + 2, l + 1);
                    }
                    const v = [{...p1, disWidthDelta: p2.disWidthDelta}, p2];
                    cw && v.reverse();
                    segaments.unshift(v);
                }
            }

            vertices.forEach(v => {
                //the offset is calc in world coord, y axis is upward
                //but offset is use in screen coord, y axis is downward, flip
                v.yOffset *= -1;
                delete v.cw;
                delete v.n01;
                delete v.n12;
            });
            return {vertices, indices, totalDis: state.distance}

            function vecInterpolation(n1, n2, range1, range2, cw = true, nums = 5) {
                const angle = Math.acos(n1.dot(n2) / (n1.length() * n2.length())) || 0;
                const per = (cw ? -1 : 1) * angle / (nums - 1), perVal = (range2 - range1) / (nums - 1);
                const cos = Math.cos(per), sin = Math.sin(per);
                const res = [];
                for (let i = 0; i < nums; i++) {
                    let vec;
                    if (i === 0) {
                        vec = {
                            x: n1.x,
                            y: n1.y
                        }
                    } else {
                        const before = res[i - 1].vec;
                        vec = {
                            x: before.x * cos - before.y * sin,
                            y: before.x * sin + before.y * cos
                        }
                    }
                    res.push({
                        vec: vec,
                        val: perVal * i + range1
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

    function createRasterFlowLineMesh({data, setting}) {
        data.data = new Float32Array(data.data);
        const sampler = createSampler(data);
        const paths = buildRasterPaths(setting, sampler, data.width, data.height);
        const {buffer1, buffer2, buffer3} = toBuffer(paths);
        return {
            result:{
                buffer1: buffer1.buffer,
                buffer2: buffer2.buffer,
                buffer3: buffer3.buffer,
            },
            transferList:[
                buffer1.buffer,
                buffer2.buffer,
                buffer3.buffer,
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
                    cursor++;
                }
            }
            return {
                buffer1,
                buffer2,
                buffer3,
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
    }

    function projectTINMesh({data, sourceSR, targetSR}) {
        return projection.load().then(() => {
            const vertex = new Float32Array(data);
            const sr = new SpatialReference(targetSR);

            const pointCount = vertex.length / 2;
            const projectVertex = new Float32Array(pointCount * 4);
            for (let i = 0; i < pointCount; i++) {
                const i2 = i * 2, i4 = i * 4;
                const point = {
                    x: vertex[i2],
                    y: vertex[i2 + 1],
                    spatialReference: sourceSR,
                }
                const projectPoint = projection.project(point, sr);
                const [hx, lx] = doubleToTwoFloats(projectPoint.x);
                const [hy, ly] = doubleToTwoFloats(projectPoint.y);
                if(isNaN(hx) || isNaN(lx) || isNaN(hy) || isNaN(ly)){
                    debugger
                }
                projectVertex[i4] = hx;
                projectVertex[i4 + 1] = hy;
                projectVertex[i4 + 2] = lx;
                projectVertex[i4 + 3] = ly;
            }

            return {
                result: {
                    buffer: projectVertex.buffer,
                },
                transferList: [
                    projectVertex.buffer,
                ]
            }
        });
    }

    return {
        tessellateFlowLine,
        createRasterFlowLineMesh,
        projectTINMesh
    }
})




