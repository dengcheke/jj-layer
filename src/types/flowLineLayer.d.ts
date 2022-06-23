/// <reference types="arcgis-js-api" />

import * as GraphicsLayer from 'esri/layers/GraphicsLayer';
import {ColorStops} from "./common";

type VertexColor = {
    colorStops:ColorStops,
    valueRange:number[]
} | boolean;

interface FlowLineRenderOpts {
    minAlpha?: number,
    speed?: number,
    length?: number,
    cycle?: number,
    color?: string,
    width?: number,
    flow?: boolean,
    vertexColor?: VertexColor
}
interface FlowLineLayerProperties extends __esri.GraphicsLayerProperties {
    renderOpts?: FlowLineRenderOpts
}
interface FlowLineLayer extends GraphicsLayer {
    renderOpts: FlowLineRenderOpts;
    updateStyle():void
}
export declare function loadFlowLineLayer(opts?:FlowLineLayerProperties): Promise<FlowLineLayer>
