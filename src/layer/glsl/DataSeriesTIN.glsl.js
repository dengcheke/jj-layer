export const DataSeriesTINVertexShader = `
    precision highp float;
    uniform mat3 u_transform;
    uniform mat3 u_display;
    uniform bool u_isPick;
    uniform vec2 u_offset;
    uniform vec2 u_texSize;


    attribute vec3 position;
    
    attribute vec2 instance_p0;
    attribute vec2 instance_p1;
    attribute vec2 instance_p2;
    
    attribute vec4 instance_pickColor;
    attribute float instance_dataIndex;
    
    varying vec2 v_col_row;
    varying vec4 v_pick_color;
    varying vec3 v_barycentric;
    void main() {
        vec2 pos = position.x == 1.0 ? instance_p0 
                            : (position.y == 1.0 ? instance_p1 : instance_p2);  
        vec2 worldPos = pos + u_offset;
        gl_Position.xy = (u_display * u_transform * vec3(worldPos, 1.0)).xy;
        gl_Position.zw = vec2(0.0, 1.0);
        
        float col = mod(instance_dataIndex, u_texSize.x); //第几列
        float row = floor(instance_dataIndex / u_texSize.x); //第几行
        
        v_col_row = vec2(col, row);
        v_pick_color = instance_pickColor;   
        v_barycentric = position;
    }
`

export const DataSeriesTINFragShader = `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;

    uniform float u_percent;
    uniform sampler2D u_colorRamp;
    uniform sampler2D u_beforeTex;
    uniform sampler2D u_afterTex;
    uniform bool u_isPick;
    uniform vec2 u_valueRange;
    uniform vec2 u_texSize;
    uniform vec3 u_meshColor;   
    uniform bool u_showMesh;
    
    varying vec2 v_col_row;
    varying vec4 v_pick_color;
    varying vec3 v_barycentric;
    
    float edgeFactor(){
        vec3 d = fwidth(v_barycentric);
        vec3 a3 = smoothstep(vec3(0.0), d * 2.0, v_barycentric);
        return min(min(a3.x, a3.y), a3.z);
    }
    
    void main() {
        if(u_isPick){
            gl_FragColor = v_pick_color;
        }else{
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
            vec4 color = texture2D(u_colorRamp, vec2(v, 0.5));
            
            if(u_showMesh){
                float factor = edgeFactor();
                gl_FragColor = mix(vec4(u_meshColor,1.0), color, factor);
            }else{
                gl_FragColor = vec4(color);
            }      
        }
    }
`

/*
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
}*/
