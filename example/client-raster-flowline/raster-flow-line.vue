<template>
    <div style="position: relative;width: 100%;height: 100%;overflow:hidden;">
        <div class="map-wrapper base"/>
        <img :src="colorRamp" style="position:absolute;right: 100px;top: 400px;"/>
    </div>
</template>

<script>
import {loadModules} from "esri-loader";
import axios from "axios";
import TimePlayer from '../common/time-player'
import {GUI} from 'three/examples/jsm/libs/lil-gui.module.min'
import {genColorRamp} from "@src/utils";

const colorRamp = genColorRamp([
    {color: "green", value: 0},
    {color: "red", value: 1},
], 128, 32)
export default {
    name: "vf-layer",
    components: {TimePlayer},
    data() {
        return {
            layerId: 'CUSTOM_LAYER',
            cellSizeRange: [20, 100],
            gridSize: 40,
            arrowSizeRange: [1, 40 / 2 ** 0.5],
            arrowSize: [16, 40 / 2 ** 0.5],
            showGrid: false,
            colorRamp,
        }
    },
    async mounted() {
        const container = this.$el;
        const {map, view} = await this.initMap(container);
        const layer = this.layer = await this.$layerLoaders.loadClientRasterFlowLineLayer({
            id: this.layerId,
            effect: "bloom(1.5, 1px, 0.0)",
        });
        map.add(layer);
        const gui = new GUI();
        const switchData = {
            changeData: true
        }

        const buff1 = (await axios.get("/uv_822x1078", {responseType: 'arraybuffer'})).data;
        const data1 = {
            extent: {
                type: 'extent',
                xmin: 100,
                xmax: 140,
                ymin: 0,
                ymax: 40,
                spatialReference: {wkid: 4326}
            },
            cols: 822,
            rows: 1078,
            data: new Float32Array(buff1),
        }

        const buff2 = (await axios.get('/simul-result/lake/vector/V_133.bin', {responseType: 'arraybuffer'})).data;
        const arr = new Float32Array(buff2)
        const data2 = {
            extent: {
                type: 'extent',
                xmin: 394725.406431600,
                xmax: 394725.406431600 + 10 * (675 - 1),
                ymin: 3280334.24197700,
                ymax: 3280334.24197700 + 10 * (731 - 1),
                spatialReference: {wkid: 2436}
            },
            cols: 675,
            rows: 731,
            data: arr,
            noDataValue: -9999
        }

        const handleDataChange = v => {
            if (v) {
                layer.data = data1;
                view.center = [120, 20];
                view.scale = 3611100.909643
                flowParams.velocityScale = layer.renderOpts.velocityScale = 1;
            } else {
                layer.data = data2;
                layer.renderOpts.speedRange = [0, 0.15]
                view.center = {
                    type: 'point',
                    x: 12907021.08629284,
                    y: 3461334.4526208863,
                    spatialReference: {wkid: 3857}
                }
                view.scale = 36111.909643
                flowParams.velocityScale = layer.renderOpts.velocityScale = 100
            }
        }

        gui.add(switchData, 'changeData').onChange(v => handleDataChange(v))
        const bloomParams = {
            enableBloom: true,
            bloomStrength: 1.5,
            bloomThreshold: 0,
            bloomRadius: 1,
        };
        const flowParams = {
            density: 1,
            fadeDuration: 100,
            lineColor: '#3278f0',
            lineLength: 200,
            lineSpeed: 5,
            lineWidth: 4,
            velocityScale: 1,
            useColorRamp: false,
        }
        layer.renderOpts.lineColor = flowParams.lineColor;

        {
            const folder = gui.addFolder('bloom');
            folder.add(bloomParams, 'enableBloom').onChange(updateBloom)
            folder.add(bloomParams, 'bloomThreshold', 0.0, 1.0).onChange(updateBloom);
            folder.add(bloomParams, 'bloomStrength', 0.0, 3.0).onChange(updateBloom);
            folder.add(bloomParams, 'bloomRadius', 0.0, 1.0).step(0.01).onChange(updateBloom);

            function updateBloom() {
                layer.effect = bloomParams.enableBloom
                    ? `bloom(${bloomParams.bloomStrength}, ${bloomParams.bloomRadius}px, ${bloomParams.bloomThreshold})`
                    : null
            }
        }
        {
            const folder = gui.addFolder('flowStyle');
            folder.addColor(flowParams, 'lineColor').onChange(() => {
                layer.renderOpts.lineColor = flowParams.lineColor;
            })
            folder.add(flowParams, 'density', 0.01, 1.0).step(0.01).onChange((v) => {
                layer.renderOpts.density = v;
            })
            folder.add(flowParams, 'fadeDuration', 0.0, 200).step(1).onChange((v) => {
                layer.renderOpts.fadeDuration = v;
            })
            folder.add(flowParams, 'lineLength', 1, 400).step(1).onChange((v) => {
                layer.renderOpts.lineLength = v;
            })
            folder.add(flowParams, 'lineSpeed', 1, 100).step(1).onChange((v) => {
                layer.renderOpts.lineSpeed = v;
            })
            folder.add(flowParams, 'lineWidth', 1, 10).step(0.1).onChange((v) => {
                layer.renderOpts.lineWidth = v;
            })
            folder.add(flowParams, 'velocityScale', 1, 100).step(0.1).onChange((v) => {
                layer.renderOpts.velocityScale = v;
            });
            folder.add(flowParams, 'useColorRamp').onChange(v => {
                if (v) {
                    layer.renderOpts.colorStops = this.colorRamp;
                } else {
                    layer.renderOpts.colorStops = null;
                }
            })
        }
        handleDataChange(true);
        this.$once('hook:beforeDestroy', () => {
            this.layer = null;
            layer.destroy();
            map.destroy();
            view.destroy();
            gui.destroy()
        })
    },

    methods: {
        async initMap(container) {
            const [Map, MapView] = await loadModules([
                "esri/Map", "esri/views/MapView"
            ]);
            const map = new Map({
                basemap: "dark-gray-vector",
            });
            const view = new MapView({
                container: container,
                map: map,
                center: [120, 20],
                scale: 3611100.909643,
                spatialReference: {wkid: 3857}
            });
            return {map, view}
        },
    }
}
</script>

<style lang="less" scoped>
.map-wrapper.base {
    height: 100%;
    width: 100%;
    position: relative;
}

.control-panel {
    background-color: rgba(2, 34, 51, 0.8);
    position: absolute;
    right: 0;
    top: 0;
    width: 400px;
    padding: 10px;
    margin: 20px;
    color: white;

    .value-range,
    .cell-size,
    .arrow-range,
    .time-range {
        display: flex;
        height: 32px;
        align-items: center;
        font-size: 16px;
        margin-top: 10px;

        .sub-title {
            flex: none;
            margin: 0 10px;
            width: 80px;
        }

        .label-left {
            width: 28px;
            overflow: visible;
            text-align: left;
            flex: none;
            margin-right: 10px;
        }

        .label-right {
            overflow: visible;
            text-align: right;
            width: 28px;
            flex: none;
            margin-left: 10px;
        }
    }
}
</style>
