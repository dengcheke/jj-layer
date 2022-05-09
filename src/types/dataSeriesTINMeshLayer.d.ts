/// <reference types="arcgis-js-api" />

import * as Layer from 'esri/layers/Layer';
import * as SpatialReference from 'esri/geometry/SpatialReference';
import {ColorStops, TimeSeriesBufferArray} from "./common";

interface DataSeriesTINRenderOpts {
    colorStops?: ColorStops,
    valueRange?: [number, number],
    showMesh?: boolean,
    meshColor?: string,
}

interface DataSeriesTINMeshLayerProperties extends __esri.LayerProperties {
    renderOpts?: DataSeriesTINRenderOpts,
    curTime?: number,
    data?: TimeSeriesBufferArray,
    tinMesh?: {
        vertex: number[] | Float32Array | Float64Array,
        spatialReference: SpatialReference
    }
}

interface DataSeriesTINMeshLayer extends Layer {
    renderOpts: DataSeriesTINRenderOpts,
    curTime: number,
    data: TimeSeriesBufferArray,
    tinMesh: {
        vertex: number[] | Float32Array | Float64Array,
        spatialReference: SpatialReference
    },
    getDataByIndex(graphic_valIndex: number): Array<[number, number]>
}

export declare function loadDataSeriesTINMeshLayer(opts?: DataSeriesTINMeshLayerProperties): Promise<DataSeriesTINMeshLayer>
