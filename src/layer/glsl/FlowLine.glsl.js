export const FlowLineVertexShader = `
    uniform mat3 u_transform;
    uniform mat3 u_rotation;
    uniform mat3 u_display;
    uniform vec4 u_center;
    uniform float u_resolution;
    uniform vec2 u_offsetScale;
    uniform bool u_isPick;
    
    attribute vec4 a_position;
    attribute vec2 a_offset;
    
    attribute vec4 a_dis_info; // [distance, totalDis, distance_width_delta, side]
    
    attribute float a_width;
    attribute vec4 a_color;
    attribute vec4 a_pick_color;
    attribute float a_visible;
    attribute vec4 a_trail; // [minAlpha, speed, length, cycle]
    
    varying vec4 v_color;
    varying float v_side;
    varying float v_dis_percent;
    varying float v_visible;
    varying float v_halfWidth;
    varying vec4 v_trail;
    void main() {
        float halfWidth = a_width * 0.5;
        vec2 position = (a_position.xy - u_center.xy) + (a_position.zw - u_center.zw);
        vec3 offset = halfWidth * u_rotation * vec3(a_offset * u_offsetScale, 0.0);
        
        gl_Position.xy = (u_display * (u_transform * vec3(position, 1.0) + offset)).xy;
        gl_Position.zw = vec2(0.0, 1.0);

        
        //[distance, totalDis, distance_width_delta, side]

        v_dis_percent = (a_dis_info.x + a_dis_info.z * halfWidth * u_resolution) / a_dis_info.y;
        v_side = a_dis_info.w;
        v_color = u_isPick ? a_pick_color : a_color;
        v_visible = a_visible;
        v_halfWidth = halfWidth;
        v_trail = a_trail;
    }
`
export const FlowLineFragShader = `
    precision highp float;

    uniform bool u_isPick;
    uniform float u_time;

    varying vec4 v_color;
    varying float v_side;
    varying float v_dis_percent;
    varying float v_visible;
    varying float v_halfWidth;
    varying vec4 v_trail;
    
    void main() {
       if(v_visible != 1.0) discard;
       float alpha = 1.0;
       
       //[minAlpha, speed, length, cycle]
       float minAlpha = v_trail.x;
       float speed = v_trail.y;
       float length = v_trail.z;
       float cycle = v_trail.w;
       
       if(!u_isPick){
           float dis = mod(mod(v_dis_percent - u_time * speed, cycle) + cycle, cycle);
           bool isTrail = (dis >= 0.0 && dis < length);
           alpha = isTrail ? clamp(alpha * dis / length, minAlpha, 1.0) : minAlpha;

           float edgeStart = 1.0 - 2.0 / v_halfWidth;
           alpha *= step(0.0, edgeStart) * (1.0 - smoothstep(edgeStart, 1.0, abs(v_side)));
       }
       gl_FragColor = u_isPick ? v_color : vec4(v_color.rgb, alpha);
    }
`
