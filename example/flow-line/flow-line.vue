<template>
    <div class="map-wrapper base"/>
</template>

<script>
import {loadModules} from "esri-loader";
import throttle from "lodash/throttle";
import {hlMap} from "../graphic-symbol";
import axios from "axios";
import {GUI} from 'three/examples/jsm/libs/lil-gui.module.min'

const VERTEX_COLOR = {
    valueRange: [0, 100],
    colorStops: [
        {value: 0, color: 'red'},
        {value: 1 / 9, color: 'orange'},
        {value: 2 / 9, color: 'yellow'},
        {value: 3 / 9, color: 'green'},
        {value: 4 / 9, color: 'blue'},
        {value: 5 / 9, color: 'indigo'},
        {value: 6 / 9, color: 'purple'},
        {value: 7 / 9, color: 'orange'},
        {value: 8 / 9, color: 'yellow'},
        {value: 1, color: 'green'},
    ]
}
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
        const gui = new GUI();
        {
            const folder = gui.addFolder('renderOpts');
            const renderOpts = {
                "bloom(api>=4.19)": false,
                useVertexColor: true,
                color: "#ff0000",
                flow: true,
                width: 8,
                minAlpha: 0.1,
                speed: 0.1,
                length: 0.35,
                cycle: 0.5,
            }
            folder.add(renderOpts, 'useVertexColor').onChange(v => {
                if (v) {
                    baseLayer.renderOpts.vertexColor = VERTEX_COLOR;
                } else {
                    baseLayer.renderOpts.vertexColor = null;
                }
            })
            folder.add(renderOpts, 'bloom(api>=4.19)').onChange(v => {
                if (v) {
                    baseLayer.effect = "bloom(1,0.5px,0)"
                } else {
                    baseLayer.effect = null;
                }
            })
            const fn = () => {
                Object.assign(baseLayer.renderOpts, renderOpts);
            }
            folder.addColor(renderOpts, 'color').onChange(fn);
            folder.add(renderOpts, 'flow').onChange(fn);
            folder.add(renderOpts, 'width', 1, 10).step(1).onChange(fn);
            folder.add(renderOpts, 'minAlpha', 0.1, 1).step(0.01).onChange(fn);
            folder.add(renderOpts, 'speed', 0.1, 1.0).step(0.01).onChange(fn);
            folder.add(renderOpts, 'length', 0.1, 0.5).step(0.01).onChange(fn);
            folder.add(renderOpts, 'cycle', 0.1, 1.0).step(0.01).onChange(fn);
        }


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
            gui.destroy();
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
            let paths = [];
            {
                paths.push([[0, 0], [5000, 0]]);
                paths.push([[5000, 1000], [0, 1000]]);
                paths.push(new Array(100).fill(0).reduce((res, i, idx) => {
                    res.push([idx * 100, Math.sin(idx * 100) * 100 + 2000]);
                    return res;
                }, []))
                const per = Math.PI / 180;
                paths.push(new Array(361).fill(0).reduce((res,i,idx)=>{
                    res.push([ Math.cos(idx * per) * 500, Math.sin(idx * per) * 500 - 2000]);
                    return res;
                },[]))
            }

            const ly = await this.$layerLoaders.loadFlowingLineLayer({
                id: this.layerId,
                graphics: [
                    ...data.features.map((item, idx) => {
                        const g = {
                            attributes: item.properties,
                            vertexValue: [
                                new Array(item.geometry.coordinates.length)
                                    .fill(0).map(() => Math.random() * 100)
                            ],
                            geometry: {
                                paths: [item.geometry.coordinates],
                                type: "polyline",
                                spatialReference: {
                                    wkid: 4326
                                }
                            },
                        };
                        return g;
                    }),
                    ...paths.map(i => {
                        return {
                            geometry: {
                                paths: [i],
                                type: "polyline",
                                spatialReference: {wkid: 3857}
                            }
                        }
                    })
                ],
                renderOpts: {
                    vertexColor: VERTEX_COLOR
                }
            });
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
