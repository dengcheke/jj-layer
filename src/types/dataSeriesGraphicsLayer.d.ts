/// <reference types="arcgis-js-api" />

import * as GraphicsLayer from 'esri/layers/GraphicsLayer';
import {ColorStops, TimeSeriesBufferArray} from "./common";

interface DataSeriesRenderOpts {
    colorStops?: ColorStops,
    valueRange?: [number, number]
}

interface DataSeriesGraphicsLayerProperties extends __esri.GraphicsLayerProperties {
    renderOpts?: DataSeriesRenderOpts,
    curTime?: number,
    data?: TimeSeriesBufferArray,
    indexKey?: null | string | Function
}

interface DataSeriesGraphicsLayer extends GraphicsLayer {
    renderOpts: DataSeriesRenderOpts,
    curTime: number,
    data: TimeSeriesBufferArray,
    indexKey: null | string | Function,
    getDataByIndex(graphic_valIndex:number): Array<[number, number]>
}

export declare function loadDataSeriesGraphicsLayer(opts?: DataSeriesGraphicsLayerProperties): Promise<DataSeriesGraphicsLayer>
