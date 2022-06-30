<template>
    <canvas></canvas>
</template>

<script>
import {Matrix3, Vector2} from 'three'
import {GUI} from 'three/examples/jsm/libs/lil-gui.module.min'

export default {
    mounted() {
        const canvas = this.$el || document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const resizeHandle = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            draw();
        }
        window.addEventListener('resize', resizeHandle);

        const SplitPerAngle = 15 / 180 * Math.PI;
        const degToRad = Math.PI / 180;
        const cosLimit = Math.cos(15 * degToRad)
        const halfPI = Math.PI / 2;
        const rCenter = {x: 0, y: 0};

        const params = {
            x: 50, y: 100,
            miterLimit: 10,
            lineWidth: 10,
            lineJoin: "round",
            lineCap: "butt"
        }

        const path = new Array(100).fill(0).map((i, idx) => [100 + idx * 5, 100 + 50 * Math.sin(idx / 10)]);
        const path2 = [[100, 200], [200, 200], [50, 100]];

        const gui = new GUI();
        const fn = v => {
            const len = path2.length - 1;
            path2[len][0] = params.x;
            path2[len][1] = params.y;
            draw();
        }
        gui.add(params, 'y', -500, 500).step(0.1).onChange(fn)
        gui.add(params, 'x', 0, 1200).step(0.1).onChange(fn)
        gui.add(params, 'lineWidth', 1, 100).step(1).onChange(fn)
        gui.add(params, 'lineJoin', {
            'round': 'round',
            'miter': 'miter',
            'bevel': 'bevel'
        }).onChange(fn);
        gui.add(params, 'lineCap', {
            'butt': 'butt',
            'square': 'square',
            'round': 'round'
        }).onChange(fn)
        gui.add(params, 'miterLimit', 1, 20,).step(0.1).onChange(fn);

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            [
                path, path2
            ].forEach((path, idx) => {
                const result = tessellatePolyline(path);
                drawPath(result, idx * 50 + 100);
            })
        }

        function drawPath({vertices, indices, path}, offsetY = 50) {
            const tempMatrix = new Matrix3();
            const transform = new Matrix3();
            const height = canvas.height;
            transform.premultiply(tempMatrix.identity().scale(1, -1))
                .premultiply(tempMatrix.identity().translate(0, height - offsetY));
            ctx.save()
            const lineWidth = params.lineWidth, temp = new Vector2();
            const points = vertices.map(i => {
                return new Vector2(...i.point)
                    .multiplyScalar(2)
                    .addScaledVector(temp.set(...i.offset), lineWidth).applyMatrix3(transform)
            })
            const pathOriginPoints = path.map(i => {
                return new Vector2(...i).multiplyScalar(2).applyMatrix3(transform)
            })
            for (let i = 0; i < indices.length; i += 3) {
                const p1 = points[indices[i]];
                const p2 = points[indices[i + 1]];
                const p3 = points[indices[i + 2]];

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
                ctx.closePath();
            }
            ctx.beginPath();
            ctx.strokeStyle = 'red';
            for (let i = 0; i < pathOriginPoints.length; i++) {
                const p = pathOriginPoints[i];
                i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.closePath();
            ctx.restore()
        }

        resizeHandle();

        function tessellatePolyline(path) {
            const lineJoin = params.lineJoin;
            const miterLimit = Math.max(params.miterLimit, 1);
            const lineCap = params.lineCap;
            const vertices = [], indices = [];
            const lastDir = new Vector2();

            //first
            const curPoint = new Vector2(...path[0]);
            const _curPoint = [curPoint.x, curPoint.y];
            lastDir.set(path[1][0] - curPoint.x, path[1][1] - curPoint.y).normalize();
            if (lineCap === 'butt') {
                vertices.push({point: _curPoint, offset: [-lastDir.y, lastDir.x]});
                vertices.push({point: _curPoint, offset: [lastDir.y, -lastDir.x]});
            } else if (lineCap === 'square') {
                vertices.push({
                    point: _curPoint,
                    offset: [-lastDir.y - lastDir.x, lastDir.x - lastDir.y]
                });
                vertices.push({
                    point: _curPoint,
                    offset: [lastDir.y - lastDir.x, -lastDir.x - lastDir.y]
                });
            } else {
                const n1 = new Vector2(-lastDir.y, lastDir.x);
                const n2 = new Vector2(lastDir.y, -lastDir.x);
                const inters = vecRotateInterpolate(n1, n2, false);
                const between = inters.slice(1, -1), len = between.length;
                vertices.push(...[
                    ...between.map(i => {
                        return {point: _curPoint, offset: i}
                    }), //0 -> len-1
                    {point: _curPoint, offset: [0, 0]}, //len
                    {point: _curPoint, offset: [n1.x, n1.y]}, //len+1
                    {point: _curPoint, offset: [n2.x, n2.y]}, //len+2
                ]);
                indices.push(...[
                    len + 1, 0, len,
                    ...new Array(len - 1).fill(0).reduce((res, cur, idx) => {
                        res.push(idx, idx + 1, len);
                        return res;
                    }, []),
                    len - 1, len + 2, len,
                ]);
            }


            //between
            for (let i = 1; i < path.length - 1; i++) {
                curPoint.set(...path[i]);
                const nextPoint = new Vector2(...path[i + 1]);
                const curDir = new Vector2().subVectors(nextPoint, curPoint).normalize();
                const isCw = lastDir.cross(curDir) <= 0;
                const aver = new Vector2().addVectors(curDir, lastDir).normalize();
                const cos = aver.dot(lastDir);
                const offset = new Vector2();
                const isSameLine = cos < 2 ** -1074 || Math.abs(cos - 1) <= 2 ** -53;
                if (isSameLine) {  //共线
                    offset.set(-lastDir.y, lastDir.x);
                    const isSameDir = cos > 0.5;
                    const __curPoint = [curPoint.x, curPoint.y];
                    const _ = vertices.length - 2;
                    if (isSameDir) {
                        vertices.push({point: __curPoint, offset: [offset.x, offset.y]});//2
                        vertices.push({point: __curPoint, offset: [-offset.x, -offset.y]});//3
                        indices.push(...[0, 1, 2, 1, 3, 2].map(i => i + _));
                    } else {
                        vertices.push({point: __curPoint, offset: [-offset.x, -offset.y]});//2
                        vertices.push({point: __curPoint, offset: [offset.x, offset.y]});//3
                        indices.push(...[0, 1, 3, 1, 2, 3].map(i => i + _));
                    }
                } else {
                    const offsetLength = 1 / cos;
                    offset.copy(aver).rotateAround(rCenter, halfPI * (isCw ? 1 : -1)).multiplyScalar(offsetLength)

                    // <= 15°, 用miter
                    if (cos >= cosLimit) {
                        processMiter({
                            isCw,
                            curPoint: [curPoint.x, curPoint.y],
                            offset
                        });
                    } else if (lineJoin === 'round') {
                        processRound({
                            offset, isCw, lastDir, curDir,
                            curPoint: [curPoint.x, curPoint.y],
                        })
                    } else if (lineJoin === "bevel" || (offsetLength > miterLimit)) { //bevel
                        processBevel({
                            offset,
                            offsetLength,
                            miterLimit: lineJoin === "bevel" ? 1 : miterLimit,
                            aver,
                            isCw,
                            curPoint: [curPoint.x, curPoint.y]
                        })
                    } else { //miter
                        processMiter({
                            isCw,
                            curPoint: [curPoint.x, curPoint.y],
                            offset
                        })
                    }
                }
                lastDir.copy(curDir);
            }


            //end
            curPoint.set(...path[path.length - 1]);
            const _ = vertices.length - 2;
            if (lineCap === 'butt') {
                vertices.push({point: [curPoint.x, curPoint.y], offset: [-lastDir.y, lastDir.x]});
                vertices.push({point: [curPoint.x, curPoint.y], offset: [lastDir.y, -lastDir.x]});
                indices.push(_, _ + 1, _ + 2, _ + 1, _ + 3, _ + 2);
            } else if (lineCap === 'square') {
                vertices.push({
                    point: [curPoint.x, curPoint.y],
                    offset: [-lastDir.y + lastDir.x, lastDir.x + lastDir.y]
                });
                vertices.push({
                    point: [curPoint.x, curPoint.y],
                    offset: [lastDir.y + lastDir.x, -lastDir.x + lastDir.y]
                });
                indices.push(_, _ + 1, _ + 2, _ + 1, _ + 3, _ + 2);
            }else{
                const _curPoint = [curPoint.x, curPoint.y];
                const n1 = new Vector2(-lastDir.y, lastDir.x);
                const n2 = new Vector2(lastDir.y, -lastDir.x);
                const inters = vecRotateInterpolate(n1, n2, true);
                const len = inters.length, _ = vertices.length;
                vertices.push(...[
                    ...inters.map(i => {
                        return {point: _curPoint, offset: i}
                    }), //0 -> len-1
                    {point: _curPoint, offset: [0, 0]}, //len
                ]);
                indices.push(...[
                    -2, -1, 0,
                    -1, len-1, 0,
                    ...new Array(len - 1).fill(0).reduce((res, cur, idx) => {
                        res.push(idx, len,  idx + 1);
                        return res;
                    }, []),
                ].map(i=> i+_));

            }
            return {vertices, indices, path}

            function processBevel({offset, offsetLength, miterLimit, aver, isCw, curPoint}) {
                const p = new Vector2(0, 0).addScaledVector(offset, miterLimit / offsetLength);//offset 这里不是单位向量 除以长度
                const vScale = (offsetLength - miterLimit) / (offsetLength ** 2 - 1) ** 0.5;
                const p1 = new Vector2().copy(p).addScaledVector(aver, vScale); //aver方向
                const p2 = new Vector2().copy(p).addScaledVector(aver, -1 * vScale);
                const _ = vertices.length - 2;
                vertices.push({point: curPoint, offset: [p2.x, p2.y]}); //p2 , _+2
                if (isCw) {
                    vertices.push({point: curPoint, offset: [p1.x, p1.y]}); //p1 , _+3
                    vertices.push({point: curPoint, offset: [-offset.x, -offset.y]}); //p0, _+4
                    indices.push(...[0, 1, 2, 1, 4, 2, 2, 4, 3].map(i => i + _));
                } else {
                    vertices.push({point: curPoint, offset: [-offset.x, -offset.y]}); //p0, _+4
                    vertices.push({point: curPoint, offset: [p1.x, p1.y]}); //p1 , _+3
                    indices.push(...[0, 1, 3, 1, 2, 3, 3, 2, 4].map(i => i + _));
                }
            }

            function processMiter({isCw, curPoint, offset}) {
                const _ = vertices.length - 2;
                if (isCw) {
                    vertices.push({point: curPoint, offset: [offset.x, offset.y]});
                    vertices.push({point: curPoint, offset: [-offset.x, -offset.y]});
                } else {
                    vertices.push({point: curPoint, offset: [-offset.x, -offset.y]});
                    vertices.push({point: curPoint, offset: [offset.x, offset.y]});
                }
                indices.push(_, _ + 1, _ + 2, _ + 1, _ + 3, _ + 2);
            }

            function processRound({offset, isCw, lastDir, curDir, curPoint}) {
                const n12 = isCw ? new Vector2(-lastDir.y, lastDir.x)
                    : new Vector2(lastDir.y, -lastDir.x);
                const n23 = isCw ? new Vector2(-curDir.y, curDir.x)
                    : new Vector2(curDir.y, -curDir.x);
                const inters = vecRotateInterpolate(n12, n23, isCw);

                //miter
                if (inters.length === 2) {
                    processMiter({isCw, curPoint, offset});
                    return;
                }

                const iPres = inters.slice(0, -1), iEnd = inters[inters.length - 1];
                const preLen = iPres.length;
                const _ = vertices.length;
                if (isCw) {
                    vertices.push(...[
                        ...iPres, // 0 -> preLen-1,
                        [0, 0], //preLen
                        iEnd, //preLen + 1
                        [-offset.x, -offset.y] // preLen + 2
                    ].map(offset => {
                        return {point: curPoint, offset}
                    }));
                    indices.push(...[
                        -2, -1, 0,
                        -1, preLen + 2, 0,
                        0, preLen + 2, preLen,
                        preLen, preLen + 2, preLen + 1,
                        ...new Array(preLen - 1).fill(0).reduce((res, cur, index) => {
                            res.push(index, preLen, index + 1);
                            return res
                        }, []),
                        preLen - 1, preLen, preLen + 1,
                    ].map(i => i + _));
                } else {
                    vertices.push(...[
                        ...iPres,// 0 -> preLen - 1
                        [0, 0], //preLen
                        [-offset.x, -offset.y],//preLen + 1
                        iEnd // preLen + 2
                    ].map(offset => {
                        return {point: curPoint, offset}
                    }));
                    indices.push(...[
                        -2, -1, 0,
                        0, preLen + 1, -2,
                        0, preLen, preLen + 1,
                        preLen, preLen + 2, preLen + 1,
                        ...new Array(preLen - 1).fill(0).reduce((res, cur, index) => {
                            res.push(index + 1, preLen, index);
                            return res
                        }, []),
                        preLen, preLen - 1, preLen + 2
                    ].map(i => i + _));
                }
            }

            function vecRotateInterpolate(n1, n2, cw = true) {
                let dot = n1.dot(n2);
                if(Math.abs(dot) > 1){ //浮点数误差
                    dot = dot > 0 ? 1 : -1;
                }
                const angle = Math.acos(dot) || 0;
                let count = angle / SplitPerAngle,
                    splitCount = count >> 0,
                    fract = count - splitCount;
                if (fract >= 0.5) splitCount += 1;
                splitCount = Math.max(splitCount, 1);
                if (splitCount === 1) {
                    return [
                        [n1.x, n1.y],
                        [n2.x, n2.y],
                    ]
                }
                const per = (cw ? -1 : 1) * angle / splitCount;
                const cos = Math.cos(per), sin = Math.sin(per);
                const res = [[n1.x, n1.y]];
                for (let i = 1; i <= splitCount; i++) {
                    const before = res[i - 1];
                    res.push([
                        before[0] * cos - before[1] * sin,
                        before[0] * sin + before[1] * cos
                    ]);
                }
                return res;
            }
        }
    }
}
</script>

<style scoped>
canvas {
    width: 100%;
    height: 100%;
    display: block;
    overflow: hidden;
}
</style>
