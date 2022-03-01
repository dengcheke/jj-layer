export const RasterFlowLineVertexShader = `
precision highp float;
attribute vec2 a_position;
attribute float a_side;
attribute vec3 a_timeInfo;
attribute vec2 a_extrude;
uniform mat3 u_transform;
uniform mat3 u_rotation;
uniform mat3 u_display;
uniform float u_lineWidth;

varying float v_side;
varying float v_time;
varying float v_totalTime;
varying float v_timeSeed;

void main(void) {
    vec2 position = a_position;
    float side = a_side;
    vec3 offset = u_rotation * vec3(a_extrude * u_lineWidth * 0.5, 0.0);
    vec2 xy = (u_display * ( u_transform * vec3(position, 1.0) + offset )).xy;
    gl_Position = vec4(xy, 0.0, 1.0);
    v_side = side;
    v_time = a_timeInfo.x;
    v_totalTime = a_timeInfo.y;
    v_timeSeed = a_timeInfo.z;
}`
export const RasterFlowLineFragShader = `
precision highp float;
varying float v_side;
varying float v_time;
varying float v_totalTime;
varying float v_timeSeed;

uniform float u_time;
uniform float u_fadeDuration;
uniform float u_lineSpeed;
uniform vec3 u_lineColor;
uniform float u_lineWidth;

void main(void) {
    float halfWidth = u_lineWidth * 0.5;
    vec4 color = vec4(u_lineColor, 1);
    float edgeWidth = min(2.0 * halfWidth - 1.0, 1.0);
    float edgeStart = (halfWidth - edgeWidth) / halfWidth;
    if (edgeStart < 0.95) {
        float s = step(edgeStart, abs(v_side));
        color.a *= (1.0 - s) + s * (1.0 - (abs(v_side) - edgeStart) / (1.0 - edgeStart));
    }
    float t = mod(v_timeSeed * (v_totalTime + u_fadeDuration) + u_time * u_lineSpeed, v_totalTime + u_fadeDuration) - v_time;
    color.a *= step(0.0, t) * exp(-2.3 * t / u_fadeDuration);
    color.rgb *= color.a;
    gl_FragColor = color;
}
`
