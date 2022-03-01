<template>
    <div class="map-wrapper base"/>
</template>

<script>
import {loadModules} from "esri-loader";
import {loadFlowingLineLayer} from "@layer";
import throttle from "lodash/throttle";
import {hlMap} from "../graphic-symbol";
import axios from "axios";

export default {
    name: "flow-line-layer",
    data() {
        return {
            layerId: 'CUSTOM_FLOW_LAYER'
        }
    },
    async mounted() {
        const container = this.$el;
        const {map, view,GraphicsLayer} = await this.initMap(container);
        const baseLayer = await this.loadCustomLy();
        map.add(baseLayer);
        const gl = new GraphicsLayer();
        gl.add({
            attributes:{},
            geometry: {
                type:"point",
                x:0,
                y:0,
                spatialReference:{wkid:4326}
            }
        })
        map.add(gl)
        view.on('pointer-move', throttle(async (evt) => {
            const hitRes = await view.hitTest(evt);
            const f = hitRes.results.find(f => {
                return (f.graphic.sourceLayer || f.graphic.layer).id === this.layerId
            }) || {};
            const graphic = f.graphic;
            view.graphics.removeAll();
            if (graphic) {
                const type = String(graphic.geometry.type).toLowerCase();
                view.graphics.add({
                    geometry: graphic.geometry,
                    symbol: hlMap[type]
                })
            }
        }, 100, {leading: false, trailing: true}))
        this.$once('hook:beforeDestroy', () => {
            this.layer = null;
            map.destroy();
            view.destroy();
        })
    },
    methods: {
        async initMap(container) {
            const [Map, MapView, GraphicsLayer] = await loadModules([
                "esri/Map", "esri/views/MapView","esri/layers/GraphicsLayer"
            ]);
            const map = new Map({
                basemap: "dark-gray-vector",
            });
            window.__map = map;
            const view = new MapView({
                container: container,
                map: map,
                center: {
                    type: 'point',
                    x: 0,
                    y: 0,
                    spatialReference: {wkid: 3857}
                },
                scale: 200000,
                spatialReference: {wkid: 3857}
            });
            return {map, view,GraphicsLayer}
        },
        async loadCustomLy() {
            const {data} = await axios.get(STATIC_URL +'test-line.json');
            const ly = await loadFlowingLineLayer({
                id: this.layerId,
                graphics: data.features.map((item, idx) => {
                    const g = {
                        attributes: {
                            ...item.properties,
                            color: 'rgb(50, 120, 240)' || '#' + ('000000' + (Math.random() * 0x1000000 >> 0).toString(16)).slice(-7, -1),
                        },
                        geometry: {
                            paths: [
                                item.geometry.coordinates
                            ],
                            type: "polyline",
                            spatialReference: {
                                wkid: 4326
                            }
                        }
                    };
                    return g;
                })
            });
            return ly
        }

    }
}
</script>

<style scoped lang="less">
.map-wrapper.base {
    height: 100%;
    width: 100%;
    position: relative;
}
</style>
