/// <reference types="arcgis-js-api" />
import * as Extent from "esri/geometry/Extent";

export type ColorStops = Array<{value:number,color:string}> | HTMLImageElement;
export type TimeSeriesRasterBufferSet = [number,number[] | Float32Array | Float64Array][];
export interface MultiTimeRasterDataInfo {
    extent:__esri.ExtentProperties | Extent,
    cols:number,
    rows:number,
    noDataValue:number,
    flipY:boolean,
    dataArr:TimeSeriesRasterBufferSet
}
