<template>
    <canvas></canvas>
</template>

<script>
import {Matrix3, Vector2} from "three";
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min";

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
        const params = {
            rotate: 0,
            width: 200,
            height: 100,
        }
        const gui = new GUI();
        const fn = () => draw();
        gui.add(params, 'rotate', 0, 360).step(1).onChange(fn)
        gui.add(params, 'width', 100, 500).step(1).onChange(fn)
        gui.add(params, 'height', 100, 500).step(1).onChange(fn)

        const degToRad = Math.PI / 180;
        resizeHandle();

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const mat = new Matrix3()
                .premultiply(new Matrix3().scale(1, -1))
                .premultiply(new Matrix3().translate(canvas.width / 2, canvas.height / 2))
            const {width, height} = params;
            drawRect(width, height, mat);
            let deg = params.rotate;
            deg = (deg % 360 + 360) % 360;
            deg = deg >= 180 ? 360 - deg : deg;
            if (deg <= Number.EPSILON) return;
            if (deg <= 90) {
                const cos = Math.cos(deg * degToRad), sin = Math.sin(deg * degToRad);
                const w1 = width * cos + height * sin;
                const h1 = width * sin + height * cos;
                drawRect(w1, h1, mat, 'black', deg);
                drawRect(width, height, mat, 'green', deg);
            } else {
                const cos = Math.cos((deg - 90) * degToRad),
                    sin = Math.sin((deg - 90) * degToRad);
                const w1 = height * cos + width * sin;
                const h1 = height * sin + width * cos;
                drawRect(w1, h1, mat, 'black', deg);
                drawRect(width, height, mat, 'green', deg);
            }
        }

        function drawRect(width, height, mat, color = "red", rotate = 0) {
            const points = [
                [width / 2, height / 2],
                [width / 2, -height / 2],
                [-width / 2, -height / 2],
                [-width / 2, height / 2]
            ].map(i => {
                const v = new Vector2(i[0], i[1]);
                if (rotate !== 0) {
                    v.rotateAround({x: 0, y: 0}, -rotate * degToRad);
                }
                v.applyMatrix3(mat);
                return v;
            });
            ctx.save()
            ctx.strokeStyle = color;
            ctx.lineWidth = 5;
            ctx.beginPath();
            for (let i = 0; i < points.length; i++) {
                if (i === 0) {
                    ctx.moveTo(points[i].x, points[i].y)
                } else {
                    ctx.lineTo(points[i].x, points[i].y)
                }
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
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

