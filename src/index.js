import {loadFlowLineLayer,FlowLineLayerBuilder} from '@src/layer/FlowingLineLayer'
import {loadRasterColormapLayer,RasterColormapLayerBuilder} from "@src/layer/RasterColormapLayer";
import {loadVectorFieldLayer,VectorFieldLayerBuilder} from "@src/layer/VectorFieldLayer";
import {loadDataSeriesGraphicsLayer,DataSeriesGraphicsLayerBuilder} from "@src/layer/DataSeriesGraphicsLayer";
import {loadTip3DLayer,Tip3DLayerBuilder} from "@src/layer/Tip3DLayer";
import {loadRasterFlowLineLayer,RasterFlowLineLayerBuilder} from "@src/layer/RasterFlowLineLayer";
import {loadDataSeriesTINMeshLayer,DataSeriesTINMeshLayerBuilder} from "@src/layer/DataSeriesTINMeshLayer";
import {buildModule} from "@src/builder";

const moduleMap = {
    flowLineLayer: FlowLineLayerBuilder,
    rasterColormapLayer: RasterColormapLayerBuilder,
    vectorFieldLayer: VectorFieldLayerBuilder,
    dataSeriesGraphicsLayer:DataSeriesGraphicsLayerBuilder,
    dataSeriesTINMeshLayer: DataSeriesTINMeshLayerBuilder,
    tip3DLayer: Tip3DLayerBuilder,
    rasterFlowLineLayer:RasterFlowLineLayerBuilder
}

const keys = Object.keys(moduleMap);

export async function loadModules(arr){
    if(!Array.isArray(arr)){
        throw new Error('loadModules参数必须是数组')
    }
    const invalidModule = arr.find(i => keys.indexOf(i) === -1);
    if(invalidModule){
        throw new Error(`未知的模块, 模块名必须是[${keys.join(', ')}]之一`)
    }
    return Promise.all(arr.map(moduleName => buildModule(moduleMap[moduleName])))
}

export {
    loadFlowLineLayer,
    loadRasterColormapLayer,
    loadVectorFieldLayer,
    loadDataSeriesGraphicsLayer,
    loadTip3DLayer,
    loadRasterFlowLineLayer,
    loadDataSeriesTINMeshLayer,
}
