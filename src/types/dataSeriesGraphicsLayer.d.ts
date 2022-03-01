/// <reference types="arcgis-js-api" />

import * as GraphicsLayer from 'esri/layers/GraphicsLayer';
import {ColorStops, TimeSeriesRasterBufferSet} from "./common";

interface DataSeriesRenderOpts {
    colorStops?: ColorStops,
    valueRange?: [number, number]
}

interface DataSeriesGraphicsLayerProperties extends __esri.GraphicsLayerProperties {
    renderOpts?: DataSeriesRenderOpts,
    curTime?:number,
    data?: TimeSeriesRasterBufferSet
}

interface DataSeriesGraphicsLayer extends GraphicsLayer {
    renderOpts: DataSeriesRenderOpts,
    curTime:number,
    data: TimeSeriesRasterBufferSet
}

export declare function loadDataSeriesGraphicsLayer(opts?: DataSeriesGraphicsLayerProperties): Promise<DataSeriesGraphicsLayer>
