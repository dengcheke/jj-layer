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
    attribute float a_distance;
    attribute float a_totalDis;
    attribute float a_distance_width_delta;
    attribute float a_side;
    attribute float a_width;
    attribute vec4 a_color;
    attribute vec4 a_pick_color;
    attribute float a_visible;
    
    varying vec4 v_color;
    varying float v_side;
    varying float v_dis_percent;
    varying float v_visible;
    varying float v_halfWidth;
    void main() {
        float halfWidth = a_width * 0.5;
        vec2 position = (a_position.xy - u_center.xy) + (a_position.zw - u_center.zw);
        vec3 offset = halfWidth * u_rotation * vec3(a_offset * u_offsetScale, 0.0);
        
        gl_Position.xy = (u_display * (u_transform * vec3(position, 1.0) + offset)).xy;
        gl_Position.zw = vec2(0.0, 1.0);

        v_dis_percent = (a_distance + a_distance_width_delta * halfWidth * u_resolution) / a_totalDis;
        v_side = a_side;
        v_color = u_isPick ? a_pick_color : a_color;
        v_visible = a_visible;
        v_halfWidth = halfWidth;
    }
`
export const FlowLineFragShader = `
    precision highp float;
    struct trail {
        float speed;
        float length;
        float cycle;
        float minAlpha;
    };
    uniform bool u_isPick;
    uniform float u_time;
    uniform trail u_trail;
    
    varying vec4 v_color;
    varying float v_side;
    varying float v_dis_percent;
    varying float v_visible;
    varying float v_halfWidth;
    
    void main() {
       if(v_visible != 1.0) discard;
       float alpha = 1.0;
       if(!u_isPick){
           float dis = mod(mod( v_dis_percent - u_time * u_trail.speed, u_trail.cycle) + u_trail.cycle, u_trail.cycle);
           bool isTrail = (dis >= 0.0 && dis < u_trail.length);
           alpha = isTrail ? clamp(alpha * dis / u_trail.length, u_trail.minAlpha, 1.0) : u_trail.minAlpha;
           
           float edgeStart = 1.0 - 2.0 / v_halfWidth;
           alpha *= step(0.0, edgeStart) * (1.0 - smoothstep(edgeStart, 1.0, abs(v_side)));
       }
       gl_FragColor = u_isPick ? v_color : vec4(v_color.rgb, alpha);
    }
`
