/// <reference types="arcgis-js-api" />
import {ColorStops, MultiTimeRasterDataInfo} from './common'
import * as Layer from "esri/layers/Layer";

interface VectorFieldRenderOpts {
    colorStops?: ColorStops,
    valueRange?: [number, number],
    showGrid?: boolean,
    gridColor?: string,
    gridWidth?: number,
    gridSize?: number,
    sizeRange?: [number, number]
}

interface VectorFieldLayerProperties extends __esri.LayerProperties {
    data?: MultiTimeRasterDataInfo,
    curTime?: number,
    renderOpts?: VectorFieldRenderOpts
}

interface VectorFieldLayer extends Layer {
    data: MultiTimeRasterDataInfo,
    curTime: number,
    renderOpts: VectorFieldRenderOpts
}

export declare function loadClientVectorFieldLayer(opts?: VectorFieldLayerProperties): Promise<VectorFieldLayer>
