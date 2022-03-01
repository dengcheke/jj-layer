const arr = new Float32Array(100);
const info = {width: 100, height: 100};

function sampler(x, y) {
    const {width, height} = info;
    const col = Math.floor(x), row = Math.floor(y);
    if (col < 0 || col >= width || row < 0 || row >= height)
        return [0, 0];
    x -= col;
    y -= row;
    const t = col < width - 1 ? col + 1 : col,
        B = row < height - 1 ? row + 1 : row;
    return [
        (arr[2 * (row * width + col)] * (1 - y) + arr[2 * (B * width + col)] * y) * (1 - x) +
        (arr[2 * (row * width + t)] * (1 - y) + arr[2 * (B * width + t)] * y) * x,

        (arr[2 * (row * width + col) + 1] * (1 - y) + arr[2 * (B * width + col) + 1] * y) * (1 - x) +
        (arr[2 * (row * width + t) + 1] * (1 - y) + arr[2 * (B * width + t) + 1] * y) * x
    ]
}

const param = {
    density: 1,
    fadeDuration: 100,
    interpolate: true,
    lineCollisionWidth: 2,
    lineColor: (4) [0.19607843137254902, 0.47058823529411764, 0.9411764705882353, 1],
    lineRenderWidth: 2,
    lineSpacing: 10,
    lineSpeed: 10,
    maxTurnAngle: 1,
    mergeLines: true,
    minSpeedThreshold: 0.001,
    minWeightThreshold: 0.001,
    profile: false,
    segmentLength: 4,
    smoothing: 0,
    velocityScale: 1,
    verticesPerLine: 68,
}

function U(x, y, existPathLength, stencil, stencilWidth, stencilHeight, stencilRatio) {
    const points = [];
    let f = 0;
    let _nu = null, _nv = null;
    points.push({x: x, y: y, t: f});
    for (let i = 0; i < param.verticesPerLine; i++) {
        let [u, v] = sampler(x, y);
        u *= param.velocityScale;
        v *= param.velocityScale;
        let speed = Math.sqrt(u * u + v * v);
        if (speed < param.minSpeedThreshold) break;
        const nu = u / speed, nv = v / speed;
        x += nu * param.segmentLength;
        y += nv * param.segmentLength;
        f += param.segmentLength / speed;
        if (Math.acos(nu * _nu + nv * _nv) > param.maxTurnAngle) break;
        if (param.mergeLines) {
            let sx = Math.round(x * stencilRatio);
            let sy = Math.round(y * stencilRatio);
            if (0 > sx || sx > stencilWidth - 1 || 0 > sy || sy > stencilHeight - 1) break;
            let stencilVal = stencil[sy * stencilWidth + sx];
            if (-1 !== stencilVal && stencilVal !== existPathLength) break;
            stencil[sy * stencilWidth + sx] = existPathLength
        }
        points.push({
            x: x,
            y: y,
            t: f
        });
        _nu = nu;
        _nv = nv
    }
    return points
}

const lineDescriptors = {
    startVertex: 0,
    numberOfVertices: 48,
    totalTime: 100,
    timeSeed: Math.random()
}


function c(data, e = 10) {
    function n(x, y, time, offsetX, offsetY, totalTime, timeSeed) {
        const O = 8 * B;
        let R = 0;
        buffer[O + R++] = x;
        buffer[O + R++] = y;
        buffer[O + R++] = 1;
        buffer[O + R++] = time;
        buffer[O + R++] = totalTime;
        buffer[O + R++] = timeSeed;
        buffer[O + R++] = offsetX;
        buffer[O + R++] = offsetY;
        B++;
        buffer[O + R++] = x;
        buffer[O + R++] = y;
        buffer[O + R++] = -1;
        buffer[O + R++] = time;
        buffer[O + R++] = totalTime;
        buffer[O + R++] = timeSeed;
        buffer[O + R++] = -offsetX;
        buffer[O + R++] = -offsetY;
        B++
    }

    const {lineVertices, lineDescriptors} = data;
    let indexCount = 0, vertexCount = 0;
    for (let desc of lineDescriptors) {
        vertexCount += 2 * desc.numberOfVertices;
        indexCount += 6 * (desc.numberOfVertices - 1);
    }

    const buffer = new Float32Array(8 * vertexCount);
    let indexBuffer = new Uint32Array(indexCount);
    let B = 0;
    let h = 0;
    for (const desc of lineDescriptors) {
        const {totalTime, timeSeed} = desc;
        let lastY = null, lastX = null, lastTime = null;
        let lastDx = null, lastDy = null;
        for (let i = 0; i < desc.numberOfVertices; i++) {
            const x = lineVertices[3 * (desc.startVertex + i)],
                y = lineVertices[3 * (desc.startVertex + i) + 1],
                time = lineVertices[3 * (desc.startVertex + i) + 2];
            let dx = null, dy = null;
            let offsetX = null;
            let offsetY = null;
            if (i > 0) {
                dx = x - lastX;
                dy = y - lastY;
                const length = Math.sqrt(dx * dx + dy * dy);
                dx /= length;
                dy /= length;
                if (i > 1) {
                    let halfX = dx + lastDx;
                    let halfY = dy + lastDy;
                    let v = Math.sqrt(halfX * halfX + halfY * halfY);
                    halfX /= v;
                    halfY /= v;
                    v = Math.min(1 / (halfX * dx + halfY * dy), e);
                    lastDx *= v;
                    lastDy *= v;
                    offsetX = -lastDy;
                    offsetY = lastDx;
                } else {
                    offsetX = -dy;
                    offsetY = dx
                }
                if (null !== offsetX && null !== offsetY) {
                    n(lastX, lastY, lastTime, offsetX, offsetY, totalTime, timeSeed);
                    indexBuffer[h++] = B - 2;
                    indexBuffer[h++] = B;
                    indexBuffer[h++] = B - 1;
                    indexBuffer[h++] = B;
                    indexBuffer[h++] = B + 1;
                    indexBuffer[h++] = B - 1;
                }
            }
            lastX = x;
            lastY = y;
            lastTime = time;
            lastDx = dx;
            lastDy = dy
        }
        n(lastX, lastY, lastTime, -lastDy, lastDx, totalTime, timeSeed)
    }
    return {
        vertexData: buffer,
        indexData: indexBuffer
    }
}

const vshader = `
precision highp float;
attribute vec3 a_positionAndSide;
attribute vec3 a_timeInfo;
attribute vec2 a_extrude;
uniform mat3 u_dvsMat3;
uniform mat3 u_displayViewMat3;
uniform float u_lineHalfWidth;
varying float v_side;
varying float v_time;
varying float v_totalTime;
varying float v_timeSeed;
void main(void) {
    vec2 position = a_positionAndSide.xy;
    float side = a_positionAndSide.z;
    vec2 xy = (u_dvsMat3 * vec3(position, 1.0) + u_displayViewMat3 * vec3(a_extrude * u_lineHalfWidth, 0.0)).xy;
    gl_Position = vec4(xy, 0.0, 1.0);
    v_side = side;
    v_time = a_timeInfo.x;
    v_totalTime = a_timeInfo.y;
    v_timeSeed = a_timeInfo.z;
}
`
const fshader = `
precision highp float;
varying float v_side;
varying float v_time;
varying float v_totalTime;
varying float v_timeSeed;
uniform float u_time;
uniform float u_fadeDuration;
uniform float u_lineSpeed;
uniform vec4 u_lineColor;
uniform float u_lineHalfWidth;
void main(void) {
    vec4 color = u_lineColor;
    float edgeWidth = min(2.0 * u_lineHalfWidth - 1.0, 1.0);
    float edgeStart = (u_lineHalfWidth - edgeWidth) / u_lineHalfWidth;
    if (edgeStart < 0.95) {
    float s = step(edgeStart, abs(v_side));
    color.a *= (1.0 - s) + s * (1.0 - (abs(v_side) - edgeStart) / (1.0 - edgeStart));
    }
    float t = mod(v_timeSeed * (v_totalTime + u_fadeDuration) + u_time * u_lineSpeed, v_totalTime + u_fadeDuration) - v_time;
    color.a *= step(0.0, t) * exp(-2.3 * t / u_fadeDuration);
    color.rgb *= color.a;
    gl_FragColor = vec4(1,1,1,1);
}
`
