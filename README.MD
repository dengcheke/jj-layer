## 可视化一些模型的模拟结果, 部分结果是时序的

所有数据都从客户端加载
不支持tiling,不适合特别大的数据

**note**: 这个项目内部使用 [esri-loader](https://www.npmjs.com/package/esri-loader) 加载包, 目前只能用在打包器项目中, 例如 [webpack](https://webpack.js.org/)
### 查看本地例子

```
npm run example
```

### usage

```bash
npm i jj-layer --save
```

### 配置 [custom workers](https://developers.arcgis.com/javascript/latest/api-reference/esri-core-workers.html)

1. 复制 **./node_modules/jj-layer/dist/workers** 到静态资源目录下
2. 在入口文件配置
```javascript
//main.js
import { loadModules } from "esri-loader";
const [config] = await loadModules(["esri/config"]);
Object.assign(config.workers.loaderConfig.paths, { 
	customWorkers: path_to_the_static_assets_root + "/arcgis-workers",
});
```

## **API**

### **loadModules**
加载模块,模块名:<br>
"flowLineLayer"<br>
"rasterColormapLayer"<br>
"vectorFieldLayer"<br>
"dataSeriesGraphicsLayer"<br>
"dataSeriesTINMeshLayer"<br>
"tip3DLayer"<br>
"rasterFlowLineLayer"<br>
```javascript
import {loadModules as loadJJModule} from 'jj-layer';
const [FlowLineLayer,VectorFieldLayer] = await loadJJModule(['flowLineLayer','vectorFieldLayer']);
const layer = new FlowLineLayer(opts);
```
也可以直接加载图层, 方法名为 load + 图层名(首字母大写)
```javascript
import {loadFlowLineLayer} from 'jj-layer';
const layer = await loadFlowLineLayer(opts);
```

### **RasterFlowLineLayer**
**arcgis-api version >= 4.12**, **require workers**

使用流动线可视化栅格数据(uv)

![rasterFlowLine](https://github.com/dengcheke/jj-layer/blob/main/static/img/raster-flow-line.gif)

```javascript
import {loadFlowingLineLayer} from "jj-layer";
const [Map,MapView] = await loadModules(["esri/Map","esri/views/MapView"])
const map = new Map(), view = new MapView({map});
const buffer = (await axios.get("/uv_822x1078", {responseType: 'arraybuffer'})).data;            
const layer = await loadFlowingLineLayer({
    effect: "bloom(1.5, 1px, 0.0)", //开启bloom特效
    renderOpts: {
        density: 1, //线密度
        fadeDuration: 100, //消失时间
        lineColor: '#3278f0', //线颜色
        lineLength: 200, //线长度(相对于时间)
        lineSpeed: 5, //线流动速度(相对于时间)
        lineWidth: 4, //线宽(像素)
        colorStops: null, //optional, if set 'colorStops', 'lineColor' will be ignore, line colors are mapped to the 'colorStops' according to the 'speedRange'
        speedRange: null, //optional, The value range of all data. You can also specify a range
    },
    data: {
        data: new Float32Array(buffer), // [u1,v1, u2,v2, u3,v3, ....],
        extent: { //栅格的范围
            type: 'extent',
            xmin: 100, 
            xmax: 140,
            ymin: 0,   
            ymax: 40,
            spatialReference: {wkid: 4326},
        },
        cols: 822, //栅格文件多少列
        rows: 1078, //栅格文件多少行
        noDataValue: -9999, //无效值将视为0
    }
});
map.add(layer);
```

### **FlowLineLayer** 
**arcgis-api version >= 4.12**, **require workers**

使用流动线可视化线几何要素

![flowLink](https://github.com/dengcheke/jj-layer/blob/main/static/img/flowlink.gif)

```javascript
import {loadModules} from 'esri-loader'
import {loadFlowingLineLayer, loadModules as loadJJModule} from "jj-layer";
const [Map,MapView] = await loadModules(["esri/Map","esri/views/MapView"])
const map = new Map(), view = new MapView({map});
const layer = await loadFlowingLineLayer({
    renderOpts: {
        minAlpha: 0.1, //轨迹透明度 ∈[0,1]
        length: 0.35, //轨迹长度 ∈[0,1], must < cycle
        speed: 0.2, //轨迹速度 ∈[0,1]
        cycle: 0.5, //轨迹一个循环长度 ∈[0,1]
        color: 'red', //线条颜色
        width: 8, //线宽
        flow: true, //是否流动
    
        //是否使用顶点颜色
        //如果是对象, 则采用值映射, graphics.vertexValue需要提供每个顶点的值, 根据值范围进行颜色映射
        vertexColor: { 
            colorStops: [
                {value:0, color:'red'},
                {value:1, color:'yellow'}
            ],
            valueRange:[0, 100], //[min,max]
        },
        //如果是true, 则每个顶点都必须指定颜色, graphics.vertexColor提供颜色 
        vertexColor: true,   
        //其他值, 不采用顶点颜色
        vertexColor: null,
    },
    graphics:[
        {
            //线样式,优先级高于renderOpts内选项, 可选
            lineStyle:{
                minAlpha: 0.1,
                length: 0.35,
                speed: 0.2,
                cycle: 0.5, 
                color: 'red',
                width: 8,
                flow: true,
            },
            geometry:{
                type:"polyline",
                paths:[
                 [ p1, p2, p3, ...],
                ],
            },
            //直接指定顶点颜色,可选
            vertexColor:[
                [ p1Color, p2Color, p3Color, ...]
            ],
            //使用值映射,可选, 此时renderOpts.vertexColor必须指定为映射对象
            vertexValue:[
                [ v1, v2, v3, ...]                
            ]      
        },
        ...
    ]
});
map.add(layer);

const g = layer.graphics.getItemAt(0);
g.lineStyle.width = 10; //change style
g.vertexColor = [ ['red', 'green', 'rgba(255,255,255,1)',...] ]; 
layer.updateStyle();//graphics属性lineStyle,vertexColor,vertexValue变化必须调用.

layer.renderOpts.speed = 0.3;//renderOpts属性更新无须调用updateStyle
```

### **RasterColormapLayer**
**arcgis-api version >= 4.12** **支持时间序列**

连续颜色可视化客户端栅格数据<br/>

![rasterColormap](https://github.com/dengcheke/jj-layer/blob/main/static/img/rastercolormap.gif)

```javascript
import {loadRasterColormapLayer} from "jj-layer";
const layer = await loadRasterColormapLayer({
    renderOpts:{
        colorStops: [
            {value:0,color:'green'},
            {value:1,color:'red'},
        ], //colorStops arr or image src, optional
        valueRange: null  //[minValue, maxValue], required
    }
});
map.add(layer)

//获取栅格数据
await fetchRasterData();

layer.data = {
    extent: {
        type: 'extent',
        xmin: 394725,
        xmax: 394725.406431600 + 10 * 675 ,
        ymin: 3280334.24197700,
        ymax: 3280334.24197700 + 10 * 731,
        spatialReference: {wkid: 2436}
    },
    cols: 675, //栅格数组列数
    rows: 731, //栅格数组行数
    noDataValue: -9999,//可选, 该值的点会被忽略
    //序列数据
    dataArr: [
        //[ 时间, 栅格数组 ], 
        [0,   [-9999,-9999,1.1,2,3...] ],
        [1,   [-9999,-9999,1.5,2,3...] ],
        ...,
        [100, [0.3,5,6,2,5...] ]
    ],
    //如果不需要时间序列或者只有一组数据, 时间指定为1即可
    dataArr: [
        [1, onlyOneRasterArr]
    ]
}

layer.renderOpts.valueRange = [0,1]; //必须设置

//开启动画
let t = 0;
setInterval(()=>{
    t = (t + 0.1) % 100;
    layer.curTime = t;
},60);
```

### **VectorFieldLayer**
**arcgis-api version >= 4.12** **支持时间序列**

可视化栅格矢量场(uv)

![vectorField](https://github.com/dengcheke/jj-layer/blob/main/static/img/vectorfield.gif)

```javascript
import {loadVectorFieldLayer} from "jj-layer";
const layer = await loadVectorFieldLayer({
    curTime:null,
    data:{
        extent: {
            type: 'extent',
            xmin: 394725,
            xmax: 394725.406431600 + 10 * 675,
            ymin: 3280334.24197700,
            ymax: 3280334.24197700 + 10 * 731,
            spatialReference: {wkid: 2436}
        }, 
        cols: 675, 
        rows: 731, 
        noDataValue: -9999, //可选, uv只要有一个分量为noDataValue, 该点会被忽略,
        dataArr: [
            //[ time, rasterArr(uv) ]
            [1,  [u1,v1, u2,v2,...]],
            ...,
            [100,[uu1,vv1, uu2,vv2...]],
        ]
    },
    renderOpts:{
        colorStops: [
            {value:0,color:'green'},
            {value:1,color:'red'},
        ], //箭头颜色色带
        valueRange: [0,1], //向量长度的范围
        sizeRange: [16, 20], //箭头大小范围, 要满足 minSize <= maxSize <= (gridSize / Math.sqrt(2))
        showGrid: false, //是否显示网格
        gridColor: 'white', //网格颜色
        gridWidth: 2, //网格宽度
        gridSize: 40, //网格大小px,
    }
})
map.add(layer)


let t = 0;
setInterval(()=>{
    t += 0.1;
    layer.curTime = t;
},60)
```

### **DataSeriesGraphicsLayer**
**arcgis-api version >= 4.14** **支持时间序列**

![dataSeries](https://github.com/dengcheke/jj-layer/blob/main/static/img/dataseries.gif)

```
//if you have data like these:

      t1,  t2,  t3,  t4,  ...
g1    v11, v12, v13, v14, ...
g2    v21, v22, v23, v24, ...
g3    v31, v32, v33, v34, ...
g4    v41, v42, v43, v44, ...
g5    v51, v52, v53, v54, ...
...
```

```javascript
import {loadDataSeriesGraphicsLayer} from "jj-layer";
const layer = await loadDataSeriesGraphicsLayer({
    curTime:null,
    graphics:[g1,g2,g3,...],
    data:[
        //[ time, rasterArr ]
        [0, [v11,v21,v31,v41,...]],
        ...,
        [100, [v1n,v2n,v3n,v4n,...]],
    ],

    // 如果graphics顺序与data中的顺序一致, 使用graphics索引作为数据索引, indexKey为null,
    indexKey: null,
    // 当graphics顺序与data顺序不一致时, 需要知道每个graphic在data中索引位置
    // 如果indexKey是string, 数据索引为graphic.attributes[indexKey],
    // 如果indexKey是function, 数据索引为indexKey(graphic)的返回值;
    indexKey: string | (graphic) => number,
    
    renderOpts: {
        colorStops: [
            {value:0,color:'green'},
            {value:1,color:'red'},
        ], //图元颜色色带
        valueRange: [0,1], //值的范围
    }
})

map.add(layer)
let t = 0;
setInterval(()=>{
    t = (t+ 0.1) % 100;
    layer.curTime = t; //anim it
},60)
```

### **Tip3DLayer**
**arcgis-api version >= 4.12**

加载3D提示图层

![dataSeries](https://github.com/dengcheke/jj-layer/blob/main/static/img/tip3d.gif)

```javascript
import {loadTip3DLayer} from "jj-layer";

const layer = await loadTip3DLayer({
    graphics:[...]
}); //layer is GraphicsLayer
map.add(layer);

//添加一个新的
layer.add({
    tipStyle:{
        size: 40, //optional
        color: "#1980cc", //optional
        emissive: '#1c7ad1' //optional         
    },
    geometry:{
        type:"point",
        spatialReference:{wkid:4326},
        x: 108.111,                           
        y: 25.1                
    }                  
});               

//移除某个
layer.remove(layer.graphics.getItemAt(0))
```

### misc
colorStops.png => ![colorStop](https://github.com/dengcheke/jj-layer/blob/main/static/img/colorstop.png)

```javascript
import img from 'colorStops.png'
colorStops : img,
//is equal to => 
colorStops: [
	{ value: 1 / 8, color: "#7fffff" },
	{ value: 2 / 8, color: "#23b7ff" },
	{ value: 3 / 8, color: "#0177b4" },
	{ value: 4 / 8, color: "#0052ca" },
	{ value: 5 / 8, color: "#0310d8" },
	{ value: 6 / 8, color: "#9601f9" },
	{ value: 7 / 8, color: "#6f00b8" },
	{ value: 1,     color: "#4c0082" },
];
```
