/// <reference types="arcgis-js-api" />
import {ColorStops, MultiTimeRasterDataInfo} from './common'
import * as Layer from "esri/layers/Layer";

interface RasterColormapRenderOpts {
    colorStops?: ColorStops,
    valueRange?: [number, number]
}

interface RasterColormapLayerProperties extends __esri.LayerProperties {
    data?: MultiTimeRasterDataInfo,
    curTime?: number,
    renderOpts?: RasterColormapRenderOpts
}

interface RasterColormapLayer extends Layer {
    data: MultiTimeRasterDataInfo,
    curTime: number,
    renderOpts: RasterColormapRenderOpts
}

export declare function loadClientRasterColormapLayer(opts?: RasterColormapLayerProperties): Promise<RasterColormapLayer>
