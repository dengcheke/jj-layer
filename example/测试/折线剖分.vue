<template>
    <canvas></canvas>
</template>

<script>
import {Matrix3, Vector2} from 'three'

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


        const degToRad = Math.PI / 180;
        const halfPI = Math.PI / 2;
        const rCenter = {x: 0, y: 0};


        const path = new Array(20).fill(0).map((i, idx) => [100 + idx * 20, 100 + 50 * Math.sin(100 + idx * 20)]);
        const result1 = tessellateBevel(path);
        const path2 = [[100,100],[200,100],[100,100]]
        const result2 = tessellateBevel(path2);
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            //drawPath(result1,50);
            drawPath(result2,150);
        }
        function drawPath({vertices, indices},offsetY = 50){
            const tempMatrix = new Matrix3();
            const transform = new Matrix3();
            const height = canvas.height;
            transform.premultiply(tempMatrix.identity().scale(1, -1))
                .premultiply(tempMatrix.identity().translate(0, height - offsetY));
            ctx.save()
            const lineWidth = 5, temp = new Vector2();
            for (let i = 0; i < indices.length; i += 3) {
                const p1 = vertices[indices[i]];
                const p2 = vertices[indices[i + 1]];
                const p3 = vertices[indices[i + 2]];

                const _p1 = new Vector2().set(p1.point[0], p1.point[1]).addScaledVector(temp.set(...p1.offset), lineWidth).applyMatrix3(transform)
                const _p2 = new Vector2().set(p2.point[0], p2.point[1]).addScaledVector(temp.set(...p2.offset), lineWidth).applyMatrix3(transform);
                const _p3 = new Vector2().set(p3.point[0], p3.point[1]).addScaledVector(temp.set(...p3.offset), lineWidth).applyMatrix3(transform);
                ctx.beginPath();
                ctx.moveTo(_p1.x, _p1.y);
                ctx.lineTo(_p2.x, _p2.y);
                ctx.lineTo(_p3.x, _p3.y);
                ctx.lineTo(_p1.x, _p1.y);
                ctx.stroke();
                ctx.closePath();
            }
            ctx.restore()
        }
        resizeHandle();

        function tessellateBevel(path) {

            const vertices = [], indices = [];
            const lastDir = new Vector2();
            const curPoint = new Vector2(...path[0]);
            lastDir.set(path[1][0] - curPoint.x, path[1][1] - curPoint.y).normalize();
            vertices.push({point: [curPoint.x, curPoint.y], offset: [-lastDir.y, lastDir.x]});
            vertices.push({point: [curPoint.x, curPoint.y], offset: [lastDir.y, -lastDir.x]});
            for (let i = 1; i < path.length - 1; i++) {
                curPoint.set(...path[i]);
                const nextPoint = new Vector2(...path[i + 1]);
                const curDir = new Vector2().subVectors(nextPoint, curPoint).normalize();
                const isCw = lastDir.cross(curDir) <= 0;
                const aver = new Vector2().addVectors(curDir, lastDir).normalize();
                const cos = aver.dot(lastDir);
                const offset = new Vector2();
                if(cos === 0){
                    offset.set(-lastDir.y, lastDir.x);
                }else{
                    offset.copy(aver).rotateAround(rCenter, halfPI * (isCw ? 1 : -1)).multiplyScalar(1 / cos);
                }
                const _ = vertices.length - 2;
                if (isCw) {
                    vertices.push({point: [curPoint.x, curPoint.y], offset: [offset.x, offset.y]});
                    vertices.push({point: [curPoint.x, curPoint.y], offset: [-offset.x, -offset.y]});
                } else {
                    vertices.push({point: [curPoint.x, curPoint.y], offset: [-offset.x, -offset.y]});
                    vertices.push({point: [curPoint.x, curPoint.y], offset: [offset.x, offset.y]});
                }
                indices.push(_, _ + 1, _ + 2, _ + 1, _ + 3, _ + 2);
                lastDir.copy(curDir);
            }
            curPoint.set(...path[path.length - 1]);
            const _ = vertices.length - 2;
            vertices.push({point: [curPoint.x, curPoint.y], offset: [-lastDir.y, lastDir.x]});
            vertices.push({point: [curPoint.x, curPoint.y], offset: [lastDir.y, -lastDir.x]});
            indices.push(_, _ + 1, _ + 2, _ + 1, _ + 3, _ + 2);
            return {vertices, indices}
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
