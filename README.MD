## this project is used to visualize the simulation process of some models

all data is from clientside ! 

all layer don't support tiling, so it's not suitable for large amounts of data !

**note**: This package uses [esri-loader](https://www.npmjs.com/package/esri-loader) internally to load the package from CDN, so it can only be used in applications built with loader/bundler, for example in [webpack](https://webpack.js.org/)
### watch example in local

```
npm run example
```

### usage

```bash
npm i jj-layer --save
```

### use [custom workers](https://developers.arcgis.com/javascript/latest/api-reference/esri-core-workers.html)

some layer require custom worker, like **FlowingLineLayer**, **ClientRasterFlowLineLayer**

if you do not use these layers, you can skip this step

1. copy **./node_modules/jj-layer/dist/workers** to your static folder
2. config it in entry file
```javascript
//main.js
import { loadModules } from "esri-loader";
const [config] = await loadModules(["esri/config"]);
Object.assign(config.workers.loaderConfig.paths, {
    //if you copy worker folder at '/static/arcgis-workers' and set '/static' as static assets root '/'  
	customWorkers: path_to_the_static_assets_root + "/arcgis-workers",
});
```

## **API**

### **ClientRasterFlowLineLayer**
**arcgis-api version >= 4.12**, **require workers**

visualize your client raster data(uv) with animated streamlines

![rasterFlowLine](https://github.com/dengcheke/jj-layer/blob/main/static/img/raster-flow-line.gif)

```javascript
import {loadClientRasterFlowLineLayer} from "jj-layer";
const [Map,MapView] = await loadModules(["esri/Map","esri/views/MapView"])
const map = new Map(), view = new MapView({map});
const buffer = (await axios.get("/uv_822x1078", {responseType: 'arraybuffer'})).data;            
const layer = await loadFlowingLineLayer({
    effect: "bloom(1.5, 1px, 0.0)",
    renderOpts: {
        density: 1,
        fadeDuration: 100,
        lineColor: '#3278f0',
        lineLength: 200,
        lineSpeed: 5,
        lineWidth: 4,
    }, //optional
    data:{
        data: new Float32Array(buffer), // [u1,v1, u2,v2, u3,v3, ....],
        extent: {
            type: 'extent',
            xmin: 100, xmax: 140,
            ymin: 0,   ymax: 40,
            spatialReference: {wkid: 4326},
        },
        cols: 822,
        rows: 1078,
        noDataValue: -9999, //optional
    }
});
map.add(layer);
```

### **FlowingLineLayer** 
**arcgis-api version >= 4.12**, **require workers**

![flowLink](https://github.com/dengcheke/jj-layer/blob/main/static/img/flowlink.gif)

```javascript
import {loadFlowingLineLayer} from "jj-layer";
const [Map,MapView] = await loadModules(["esri/Map","esri/views/MapView"])
const map = new Map(), view = new MapView({map});
const layer = await loadFlowingLineLayer({
    renderOpts: {
        minAlpha: 0.1, //∈[0,1]
        length: 0.35,//trail length ∈[0,1], must < cycle
        speed: 0.2,//trail speed ∈[0,1]
        cycle: 0.5,//trail cycle ∈[0,1]
    }, //optional
    graphics:[
        {
            attributes:{
                color: "#ff0000", //line color, optional
                width: 8, //linewidth, optional
            },
            geometry:{
                type:"polyline",
                paths:[[[...]]],
                ...
            }
        },
        ...
    ]
});
map.add(layer);

layer.graphics.getItemAt(0).attributes.color = 'green';//change style
layer.graphics.getItemAt(0).attributes.width = 10;//change style
layer.updateStyle();// if graphic style change, tell layer to update style!

layer.renderOpts.speed = 0.3;// no need to call updateStyle()
```

### **ClientRasterColormapLayer**
**arcgis-api version >= 4.12**

Build a layer from a client raster array<br/>

![rasterColormap](https://github.com/dengcheke/jj-layer/blob/main/static/img/rastercolormap.gif)

```javascript
import {loadClientRasterColormapLayer} from "jj-layer";
const layer = await loadClientRasterColormapLayer({
    data:null,
    curTime:null,
    renderOpts:{
        colorStops: [
            {value:0,color:'green'},
            {value:1,color:'red'},
        ], //colorStops arr or image src, optional
        valueRange: null  //[minValue, maxValue], required
    }
});
map.add(layer)

await fetchRasterDataFromServer();

layer.data = {
    extent: {
        type: 'extent',
        xmin: 394725,
        xmax: 394725.406431600 + 10 * (675 - 1),
        ymin: 3280334.24197700,
        ymax: 3280334.24197700 + 10 * (731 - 1),
        spatialReference: {wkid: 2436}
    }, //required
    cols: 675, //required
    rows: 731, //required
    noDataValue: -9999, //optional
    flipY:true, //optional
    dataArr: [
        //[ time, rasterArr ]
        [0,   [-9999,-9999,1.1,2,3...]],
        [1,   [-9999,-9999,1.5,2,3...]],
        ...,
        [100, [0.3,5,6,2,5...]]
    ]  //required
}
layer.renderOpts.valueRange = [0,1]; //required, must set
let t = 0;
setInterval(()=>{
    t = (t+ 0.1) % 100;
    layer.curTime = t; //anim it
},60)
```

### **ClientVectorFieldLayer**
**arcgis-api version >= 4.12**

Build a layer from a client raster array(uv)<br/>

![vectorField](https://github.com/dengcheke/jj-layer/blob/main/static/img/vectorfield.gif)

```javascript
import {loadClientVectorFieldLayer} from "jj-layer";
const layer = await loadClientVectorFieldLayer({
    curTime:null,
    data:{
        extent: {
            type: 'extent',
            xmin: 394725,
            xmax: 394725.406431600 + 10 * (675 - 1),
            ymin: 3280334.24197700,
            ymax: 3280334.24197700 + 10 * (731 - 1),
            spatialReference: {wkid: 2436}
        }, //required
        cols: 675, //required
        rows: 731, //required
        noDataValue: -9999, //optional
        flipY:true, //optional
        dataArr: [
            //[ time, rasterArr(uv) ]
            [1, [u1,v1,u2,v2,...]],
            ...,
            [88,[uu1,vv1,uu2,vv2...]],
        ] //required
    },
    renderOpts:{
        colorStops: [
            {value:0,color:'green'},
            {value:1,color:'red'},
        ], //colorStops arr or image src, optional
        valueRange: [0,1]  //[minValue, maxValue], value is vector length Math.sqrt(u*u+v*v), required
        showGrid: false,
        gridColor: 'white',
        gridWidth: 2,
        gridSize: 40, // px,
        sizeRange: [16, 20], //the arrow size range, [minSize,maxSize],
                            // valueRange[0] -> minSize, valueRange[1] -> maxSize
                            // minSize <= maxSize <= (gridSize / Math.sqrt(2))
    }
})
map.add(layer)
let t = 0;
setInterval(()=>{
    t += 0.1;
    layer.curTime = t; //anim it
},60)
```

### **DataSeriesGraphicsLayer**
**arcgis-api version >= 4.14**

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
        [t1, [v11,v21,v31,v41,...]],
        ...,
        [tn, [v1n,v2n,v3n,v4n,...]],
    ] //required ,
    renderOpts:{
        colorStops: [
            {value:0,color:'green'},
            {value:1,color:'red'},
        ], //colorStops arr or image src, optional
        valueRange: [0,1]  //[minValue, maxValue], required
    }
})
map.add(layer)
let t = 0, tMax = 100;
setInterval(()=>{
    t = (t+ 0.1) % tMax;
    layer.curTime = t; //anim it
},60)
```

### **Tip3DLayer**
**arcgis-api version >= 4.12**

![dataSeries](https://github.com/dengcheke/jj-layer/blob/main/static/img/tip3d.gif)

```javascript
import {loadTip3DLayer} from "jj-layer";

const layer = await loadTip3DLayer(); //layer is GraphicsLayer
map.add(layer);
//add graphic as tip
layer.add({
    attributes:{
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
