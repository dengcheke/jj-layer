/// <reference types="arcgis-js-api" />
import {ColorStops, MultiTimeRasterDataInfo} from './common'
import * as Layer from "esri/layers/Layer";
import * as Extent from "esri/geometry/Extent";

interface RasterFlowLineRenderOpts {
    density?: number,
    fadeDuration?: number,
    lineColor?: string,
    lineLength?: number,
    lineSpeed?: number,
    lineWidth?: number,
    velocityScale?: number;
    colorStops?: ColorStops;
    speedRange?: [number, number];
    bloom?: {
        strength?: number,
        threshold?: number,
        radius?: number,
    } | null
}

type RasterFlowLineData = {
    data: number[] | Float32Array | Float64Array,
    extent: __esri.ExtentProperties | Extent,
    cols: number,
    rows: number,
    noDataValue?: number
}

interface RasterFlowLineLayerProperties extends __esri.LayerProperties {
    data?: RasterFlowLineData,
    renderOpts?: RasterFlowLineRenderOpts
}

interface RasterFlowLineLayer extends Layer {
    data: MultiTimeRasterDataInfo,
    renderOpts: RasterFlowLineRenderOpts
}

export declare function loadRasterFlowLineLayer(opts?: RasterFlowLineLayerProperties): Promise<RasterFlowLineLayer>
