export const RasterFlowLineVertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

attribute vec4 instance_p0_p1;
attribute vec4 instance_p2_p3;
attribute vec4 instance_timeInfo;

uniform mat3 u_transform;
uniform mat3 u_rotation;
uniform mat3 u_display;
uniform float u_lineWidth;

varying float v_side;
varying float v_time;
varying float v_totalTime;
varying float v_timeSeed;

bool samePoint(vec2 a, vec2 b){
    return a.x == b.x && a.y == b.y;
}
void main(void) {
    vec2 p0 = instance_p0_p1.xy;
    vec2 p1 = instance_p0_p1.zw;
    vec2 p2 = instance_p2_p3.xy;
    vec2 p3 = instance_p2_p3.zw;
    
    //to screen
    p0 = (u_transform * vec3(p0, 1.0)).xy;
    p1 = (u_transform * vec3(p1, 1.0)).xy;
    p2 = (u_transform * vec3(p2, 1.0)).xy;
    p3 = (u_transform * vec3(p3, 1.0)).xy;
    
    bool isStart = position.y < 0.5;
    vec2 screenPos = isStart ? p0 : p1;
    
    vec2 dir = p2 - p1; //屏幕dir
    dir = normalize(dir);
    
    //calc bevel offset
    vec2 d01, d12;
    if(isStart){
        bool same01 = samePoint(p0, p1);
        d01 = same01 ? dir : normalize(p1 - p0);
        d12 = dir;
    }else{
        bool same23 = samePoint(p2, p3);
        d01 = dir;
        d12 = same23 ? dir : normalize(p3 - p2);
    }
    
    vec2 vHalf = d01 + d12;
    vHalf = normalize(vHalf);
    
    float scale = min(1.0 / abs(dot(vHalf, d12)), 10.0);
    vec2 offset = vec2(vHalf.y, -vHalf.x) * scale;
    offset *= position.x > 0.0 ? -1.0 : 1.0;
    offset *= u_lineWidth * 0.5;
    
    screenPos += offset;
    
    gl_Position = vec4((u_display * vec3(screenPos,1.0)).xy, 0.0, 1.0);
   
    v_side = uv.x;
    v_time = isStart ? instance_timeInfo.x : instance_timeInfo.y;
    v_totalTime = instance_timeInfo.z;
    v_timeSeed = instance_timeInfo.w;
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
