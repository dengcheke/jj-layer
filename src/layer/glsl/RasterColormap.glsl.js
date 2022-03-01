export const ClientRasterVertexShader = `
    precision highp float;
    attribute vec2 a_position;
    uniform mat3 u_matrix;
    void main(){
        gl_Position.xy = (u_matrix * vec3(a_position, 1.0)).xy;
        gl_Position.zw = vec2(0.0, 1.0);
    }
`
export const ClientRasterFragShader = `
    precision highp float;
    struct dataInfo {
        float minVal;
        float maxVal;
        float noDataVal;
        float cols;
        float rows;
    };
    struct extent {
        float xmin;
        float ymin;
        float width;
        float height;
    };
    const float PI = 3.1415926;
    uniform sampler2D u_colorRamp;
    uniform sampler2D u_beforeTex;
    uniform sampler2D u_afterTex;
    uniform mat3 u_rotate;
    uniform extent u_extentCoords;
    uniform float u_percent;
    uniform dataInfo u_dataInfo;
    uniform vec2 u_filterRange; // min max

    float samplerTexture(vec2 uv){
        float NO_DATA_VALUE = u_dataInfo.noDataVal;
        float before = texture2D(u_beforeTex, uv).a;
        float after = texture2D(u_afterTex, uv).a;
        bool noData = (before == NO_DATA_VALUE || after == NO_DATA_VALUE);
        return noData ? NO_DATA_VALUE : mix(before, after, u_percent);
    }
    
    float bilinearInterpolate(vec2 uv){
        float NO_DATA_VALUE = u_dataInfo.noDataVal; 
        vec2 onePixel = 1.0 / vec2(u_dataInfo.cols, u_dataInfo.rows);
        vec2 uv0 = floor(uv / onePixel) * onePixel + onePixel * 0.5;
        vec2 offset = vec2( uv.x > uv0.x ? 1.0 : -1.0, uv.y > uv0.y ? 1.0 : -1.0 );
        vec2 uv1 = uv0 + offset * onePixel * vec2(1,0);
        vec2 uv2 = uv0 + offset * onePixel * vec2(0,1);
        vec2 uv3 = uv0 + offset * onePixel * vec2(1,1);
        
        float v0 = samplerTexture(uv0);
        float v1 = samplerTexture(uv1);
        float v2 = samplerTexture(uv2);
        float v3 = samplerTexture(uv3);
        
        if(any(equal(vec4(v0, v1, v2, v3),vec4(NO_DATA_VALUE)))){
            return NO_DATA_VALUE;
        }else{
            float v01 = mix(v0, v1, (uv.x - uv0.x) / (uv1.x - uv0.x));
            float v23 = mix(v2, v3, (uv.x - uv2.x) / (uv3.x - uv2.x));
            return mix(v01, v23, (uv.y - uv0.y) / ( uv2.y - uv0.y));
        }
    }
    vec4 getColor(float value){
        float MIN = u_dataInfo.minVal;
        float MAX = u_dataInfo.maxVal;
        bool outOfRange = value < u_filterRange.x || value > u_filterRange.y;
        return (value == u_dataInfo.noDataVal || outOfRange) ? vec4(0) 
                        : texture2D(u_colorRamp, vec2(clamp((value - MIN) / (MAX - MIN), 0.0, 1.0), 0.5));
    }
    void main() {
        vec2 coordPos = gl_FragCoord.xy - vec2(u_extentCoords.xmin,u_extentCoords.ymin);
        coordPos = (u_rotate * vec3(coordPos,1.0)).xy;
        vec2 uv = coordPos / vec2(u_extentCoords.width,u_extentCoords.height);
        float value = bilinearInterpolate(uv);
        gl_FragColor = getColor(value);
    }
`
