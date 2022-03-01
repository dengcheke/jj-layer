export const VectorFieldVertexShader = `
    precision highp float;
    attribute vec2 a_position;
    uniform mat3 u_matrix;
    void main(){
        gl_Position.xy = (u_matrix * vec3(a_position, 1.0)).xy;
        gl_Position.zw = vec2(0.0, 1.0);
    }
`
export const VectorFieldFragShader = `
    precision highp float;
    const float PI = 3.1415926;
    struct dataInfo {
        float minVal;
        float maxVal;
        float noDataVal;
    };
    struct gridInfo {
        float gridSize;
        float minSize;
        float maxSize;
        bool showGrid;
        float gridWidth;
        vec3 gridColor;
    };
    struct extent {
        float xmin;
        float ymin;
        float width;
        float height;
    };
    uniform sampler2D u_arrowTex;
    uniform sampler2D u_beforeTex;
    uniform sampler2D u_afterTex;
    uniform sampler2D u_colorRamp;
    uniform float u_rotate;
    uniform extent u_extentCoords;
    uniform float u_percent;
    uniform gridInfo u_gridInfo; // gridsize minsize maxsize
    uniform dataInfo u_dataInfo; // minval maxval nodataval
   
    vec2 rotate(vec2 a,vec2 b,float alpha){
        float c = cos(alpha); 
        float s = sin(alpha); 
        mat2 rotation = mat2(
                c, -s,
                s, c
            );
        return rotation * (a-b) + b;
    }
    float vec2Cross(vec2 a, vec2 b){
        return a[0] * b[1] - a[1] * b[0];
    }
    //获取单元格中心点
    vec2 getCellCenter(vec2 pos){
        float gridSize = u_gridInfo.gridSize;
        float col = floor(pos.x / gridSize);
        float row = floor(pos.y / gridSize);
        return floor((vec2(col,row) + 0.5) * gridSize) + 0.5;
    }
    //根据中心点采样获取 旋转角, 大小
    vec3 getCellData(vec2 center){
        float SIZE_MIN = u_gridInfo.minSize;
        float SIZE_MAX = u_gridInfo.maxSize;
        float VecMin = u_dataInfo.minVal;
        float VecMax = u_dataInfo.maxVal;
        float NoDataVal = u_dataInfo.noDataVal; 
        
        vec2 uv = center / vec2(u_extentCoords.width, u_extentCoords.height);
        vec4 before = texture2D(u_beforeTex, uv);
        vec4 after = texture2D(u_afterTex, uv);
        bool beforeNoData = any(equal(before.zw, vec2(NoDataVal)));
        bool afterNoData = any(equal(after.zw, vec2(NoDataVal)));
        before = beforeNoData ? vec4(0) : before;
        after = afterNoData ? vec4(0) : after;
        
        vec2 vector = mix(before, after, u_percent).zw;
        float len = length(vector);
       
        if(beforeNoData || afterNoData || len == 0.0){
            return vec3(0);
        }else{
            float alpha = acos(dot(vector, vec2(1.0, 0.0)) / len);
            bool isCCW = vec2Cross(vec2(1.0, 0.0), vector) > 0.0; 
            alpha = isCCW ? alpha : -alpha;
            
            float percent = clamp(len / VecMax, VecMin / VecMax, 1.0);
            float size = percent * (SIZE_MAX - SIZE_MIN) + SIZE_MIN;
            size = max(1.0, size);
            return vec3(alpha, size, 1.0);
        }
    }
    vec4 getColor(vec2 layerRefPos, vec3 arrowInfo){
        float GRID_SIZE = u_gridInfo.gridSize;
        float MIN_SIZE = u_gridInfo.minSize;
        float MAX_SIZE = u_gridInfo.maxSize;
        MAX_SIZE = MAX_SIZE == MIN_SIZE ? MIN_SIZE + 1.0 : MAX_SIZE;
        float alpha = arrowInfo[0];
        float size = arrowInfo[1];
        
        vec2 cellRefPos = mod(layerRefPos, GRID_SIZE);
        cellRefPos -= (GRID_SIZE - size) * 0.5;
        cellRefPos = rotate(cellRefPos, vec2(size * 0.5), -alpha);    
        cellRefPos /= size;
        bool outRange =  any(lessThan(cellRefPos,vec2(0.0))) || any(greaterThan(cellRefPos,vec2(1.0)));
       
        vec4 color = texture2D(u_arrowTex, cellRefPos);
        if(color.a > 0.1 ){
            float v = (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
            color.rgb = texture2D(u_colorRamp, vec2(v, 0.5)).rgb;
        }
        return outRange ? vec4(0, 0, 0, 0) : color;
    }
    void main() {
        float GRID_SIZE = u_gridInfo.gridSize;
        float HALF_SIZE = GRID_SIZE * 0.5;
        //相对于 extent 左下角的坐标
        vec2 layerRefPos = gl_FragCoord.xy - vec2(u_extentCoords.xmin,u_extentCoords.ymin);
        
        layerRefPos = rotate(layerRefPos, vec2(0), u_rotate);
        
        //获取cellCenter 坐标
        vec2 layerRefCellCenter = getCellCenter(layerRefPos);
      
        //采样获取size, 方向
        vec3 arrowInfo = getCellData(layerRefCellCenter);
        bool hasData =  arrowInfo[2] > 0.5;

        gl_FragColor = hasData ? getColor(layerRefPos, arrowInfo) : vec4(0);
        
        if(u_gridInfo.showGrid){
            vec2 disToBorderMin = min(
                abs(layerRefPos - layerRefCellCenter + vec2(HALF_SIZE)),
                abs(layerRefPos - layerRefCellCenter - vec2(HALF_SIZE))
            );
            float minDis = min(disToBorderMin.x, disToBorderMin.y);
            if(minDis <= u_gridInfo.gridWidth){
                float a = 1.0 - smoothstep(0.0, u_gridInfo.gridWidth, minDis);
                gl_FragColor = vec4(u_gridInfo.gridColor, a);
            }
        }
    }
`
