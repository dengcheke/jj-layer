export const DataSeriesGraphicVertexShader = `
    precision highp float;
    uniform vec4 u_center;
    uniform mat3 u_transform;
    uniform mat3 u_rotation;
    uniform mat3 u_display;
    uniform vec2 u_offsetScale;
    uniform vec2 u_texSize;

    attribute vec4 a_position;
    attribute vec2 a_offset;
    attribute float a_upright;
    attribute vec4 a_pickColor;
    attribute float a_dataIndex;
    
    varying vec2 v_col_row;
    varying vec4 v_pick_color;
    void main() {
        vec2 position = (a_position.xy - u_center.xy) + (a_position.zw - u_center.zw);
        vec2 offset = a_offset * u_offsetScale;
        vec3 transformedOffset = mix(u_rotation * vec3(offset, 0.0), vec3(offset, 0.0), float(a_upright));
        gl_Position.xy = (u_display * (u_transform * vec3(position, 1.0) + transformedOffset)).xy;
        gl_Position.zw = vec2(0.0, 1.0);
        
        float col = mod(a_dataIndex, u_texSize.x); //第几列
        float row = floor(a_dataIndex / u_texSize.x); //第几行
        
        v_col_row = vec2(col, row);
        v_pick_color = a_pickColor;   
    }
`

export const DataSeriesGraphicFragShader = `
    precision highp float;

    uniform float u_percent;
    uniform sampler2D u_colorRamp;
    uniform sampler2D u_beforeTex;
    uniform sampler2D u_afterTex;
    uniform bool u_isPick;
    uniform vec2 u_valueRange;
    uniform vec2 u_texSize;
    
    varying vec2 v_col_row;
    varying vec4 v_pick_color;
    void main() {
        if(!u_isPick){
            vec2 onePixel = 1.0 / u_texSize;
            vec2 halfOnePixel = onePixel / 2.0;
            vec2 uv = v_col_row * onePixel + halfOnePixel;
            float v1 = texture2D(u_beforeTex, uv).a;
            float v2 = texture2D(u_afterTex, uv).a;
            float v = mix(v1, v2, u_percent);
            float MIN = u_valueRange[0];
            float MAX = u_valueRange[1];
            MAX = MIN == MAX ? MIN + 1.0 : MAX;
            v = (v - MIN) / (MAX - MIN);
            gl_FragColor = texture2D(u_colorRamp, vec2(v, 0.5));
        }else{
            gl_FragColor = v_pick_color;
        }
    }
`
