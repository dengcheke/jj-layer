<template>
    <div class="map-wrapper base"/>
</template>

<script>
import {loadModules} from "esri-loader";
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
        const {map, view, GraphicsLayer} = await this.initMap(container);
        const baseLayer = await this.loadCustomLy();
        map.add(baseLayer);
        const gl = new GraphicsLayer();
        gl.add({
            attributes: {},
            geometry: {
                type: "point",
                x: 0,
                y: 0,
                spatialReference: {wkid: 4326}
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
                "esri/Map", "esri/views/MapView", "esri/layers/GraphicsLayer"
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
            return {map, view, GraphicsLayer}
        },
        async loadCustomLy() {
            const {data} = await axios.get(STATIC_URL + 'test-line.json');
            const ly = await this.$layerLoaders.loadFlowingLineLayer({
                id: this.layerId,
                graphics: data.features.map((item, idx) => {
                    const g = {
                        attributes: item.properties,
                        lineStyle:{
                            color: 'rgb(50, 120, 240)' || '#' + ('000000' + (Math.random() * 0x1000000 >> 0).toString(16)).slice(-7, -1),
                            flow: 1,
                            width: 8,
                            minAlpha: 0.1,
                            speed: 0.1,
                            length: 0.35,
                            cycle: 0.5,
                        },
                        vertexValue: [
                            new Array(item.geometry.coordinates.length).fill(0).map(() => Math.random() * 100)
                        ],
                        geometry: {
                            paths: [
                                item.geometry.coordinates
                            ],
                            type: "polyline",
                            spatialReference: {
                                wkid: 4326
                            }
                        },
                    };
                    return g;
                }),
                renderOpts: {
                    vertexColor: {
                        valueRange: [0, 100],
                        colorStops: [
                            {value: 0, color: 'red'},
                            {value: 1/9, color: 'orange'},
                            {value: 2/9, color: 'yellow'},
                            {value: 3/9, color: 'green'},
                            {value: 4/9, color: 'blue'},
                            {value: 5/9, color: 'indigo'},
                            {value: 6/9, color: 'purple'},
                            {value: 7/9, color: 'orange'},
                            {value: 8/9, color: 'yellow'},
                            {value: 1, color: 'green'},
                        ]
                    }
                }
            });
            console.log(ly)
            return ly
        }

    }
}
</script>

<style lang="less" scoped>
.map-wrapper.base {
    height: 100%;
    width: 100%;
    position: relative;
}
</style>
