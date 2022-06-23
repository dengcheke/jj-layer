export * from './flowLineLayer'
export * from './rasterColormapLayer'
export * from './vectorFieldLayer'
export * from './rasterFlowLineLayer'
export * from './tip3DLayer'
export * from './dataSeriesGraphicsLayer'
export * from './dataSeriesTINMeshLayer'

type moduleName = "flowLineLayer"
    | "rasterColormapLayer"
    | "vectorFieldLayer"
    | "dataSeriesGraphicsLayer"
    | "dataSeriesTINMeshLayer"
    | "tip3DLayer"
    | "rasterFlowLineLayer"

export declare function loadModules(modules: moduleName[]): Promise<any>
