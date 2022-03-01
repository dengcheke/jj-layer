/// <reference types="arcgis-js-api" />

import * as GraphicsLayer from 'esri/layers/GraphicsLayer';

interface FlowingLineRenderOpts {
    minAlpha?: number,
    speed?: number,
    length?: number,
    cycle?: number
}
interface FlowingLineLayerProperties extends __esri.GraphicsLayerProperties {
    renderOpts?: FlowingLineRenderOpts
}
interface FlowingLineLayer extends GraphicsLayer {
    renderOpts: FlowingLineRenderOpts;
    updateStyle():void
}
export declare function loadFlowingLineLayer(opts?:FlowingLineLayerProperties): Promise<FlowingLineLayer>
