<template>
    <div style="position: relative;width: 100%;height: 100%">
        <div class="map-wrapper base" ref="map"/>
    </div>
</template>

<script>
import {loadModules} from "esri-loader";
import axios from "axios";
import {loadClientRasterColormapLayer, loadClientRasterFlowLineLayer} from "@src";
import {genColorRamp} from "@src/utils";
import {COD_COLOR_STOPS, COD_META} from "../client-raster-colormap/cod-config";
import {GUI} from 'three/examples/jsm/libs/lil-gui.module.min'

export default {
    async mounted() {
        const container = this.$refs.map;
        const [Map, MapView, GroupLayer] = await loadModules([
            "esri/Map", "esri/views/MapView", "esri/layers/GroupLayer"
        ]);
        const map = new Map({
            basemap: "dark-gray-vector",
        });
        const view = new MapView({
            container: container,
            map: map,
            center: {
                type: 'point',
                x: 12907021.08629284,
                y: 3461334.4526208863,
                spatialReference: {wkid: 3857}
            },
            scale: 36111.909643,
            spatialReference: {wkid: 3857},
            ui: [null]
        });

        let flowLayer, colormapLayer;
        {
            const flowbuf = (await axios.get('/simul-result/lake/vector/V_288.bin', {
                responseType: 'arraybuffer'
            })).data;
            flowLayer = await loadClientRasterFlowLineLayer({
                data: {
                    extent: {
                        type: 'extent',
                        xmin: 394725.406431600,
                        xmax: 394725.406431600 + 10 * 675,
                        ymin: 3280334.24197700,
                        ymax: 3280334.24197700 + 10 * 731,
                        spatialReference: {wkid: 2436}
                    },
                    cols: 675,
                    rows: 731,
                    data: new Float32Array(flowbuf),
                    noDataValue: -9999
                },
                renderOpts: {
                    lineColor: '#3278f0',
                    velocityScale: 100
                },
                blendMode: "destination-in"
            })
        }
        {
            const buf = (await axios.get(`/simul-result/lake/COD/COD_288.bin`, {
                responseType: 'arraybuffer'
            })).data;
            colormapLayer = await loadClientRasterColormapLayer({
                data: {
                    ...COD_META,
                    dataArr: [
                        [1, new Float32Array(buf)]
                    ],
                },
                renderOpts: {
                    valueRange: [0, 40],
                    colorStops: genColorRamp(COD_COLOR_STOPS, 128, 32)
                },
            })
        }
        const group = new GroupLayer({
            effect: "bloom(0.5, 1px, 0.263)",
            layers: [colormapLayer, flowLayer]
        });
        map.add(group);

        const gui = new GUI();
        const mode = {mode: 'blend'}
        gui.add(mode, 'mode', {
            'blend': 'blend',
            'flowOnly': 'flowOnly',
            'colorOnly': 'colorOnly'
        }).onChange((v) => {
            if (v === 'blend') {
                colormapLayer.visible = true;
                flowLayer.visible = true;
                flowLayer.effect = null;
                flowLayer.blendMode = "destination-in";
                group.add(flowLayer);
                updateBloom();
            } else if (v === 'flowOnly') {
                colormapLayer.visible = false;
                flowLayer.visible = true;
                flowLayer.effect = "bloom(1, 0.5px, 0.0)";
                flowLayer.blendMode = "normal";
                map.add(flowLayer);
                updateBloom();
            } else {
                colormapLayer.visible = true;
                flowLayer.visible = false;
                flowLayer.effect = null;
                flowLayer.blendMode = "normal";
                group.effect = null;
            }
        });
        const bloomParams = {
            bloomThreshold: 0.263,
            bloomStrength: 0.5,
            bloomRadius: 1,
        };
        const folder = gui.addFolder('group-bloom');
        folder.add(bloomParams, 'bloomThreshold', 0.0, 1.0).onChange(updateBloom);
        folder.add(bloomParams, 'bloomStrength', 0.0, 3.0).onChange(updateBloom);
        folder.add(bloomParams, 'bloomRadius', 0.0, 2.0).step(0.01).onChange(updateBloom);

        function updateBloom() {
            if (mode.mode === 'colorOnly') return
            group.effect = `bloom(${bloomParams.bloomStrength}, ${bloomParams.bloomRadius}px, ${bloomParams.bloomThreshold})`
        }

        this.$once('hook:beforeDestroy', () => {
            flowLayer?.destroy();
            colormapLayer?.destroy();
            map.destroy();
            view.destroy();
            gui.destroy();
        })
    },
}
</script>

<style scoped lang="less">
.map-wrapper.base {
    height: 100%;
    width: 100%;
    position: relative;
}
</style>
