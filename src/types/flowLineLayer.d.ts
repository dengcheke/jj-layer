/// <reference types="arcgis-js-api" />

import * as GraphicsLayer from 'esri/layers/GraphicsLayer';
import {ColorStops} from "./common";

type VertexColor = {
    colorStops:ColorStops,
    valueRange:number[]
} | boolean;

interface FlowingLineRenderOpts {
    minAlpha?: number,
    speed?: number,
    length?: number,
    cycle?: number,
    color?: string,
    width?: number,
    flow?: boolean,
    vertexColor?: VertexColor
}
interface FlowingLineLayerProperties extends __esri.GraphicsLayerProperties {
    renderOpts?: FlowingLineRenderOpts
}
interface FlowingLineLayer extends GraphicsLayer {
    renderOpts: FlowingLineRenderOpts;
    updateStyle():void
}
export declare function loadFlowingLineLayer(opts?:FlowingLineLayerProperties): Promise<FlowingLineLayer>
