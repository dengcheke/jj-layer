<template>
    <div style="position: relative;width: 100%;height: 100%">
        <div class="map-wrapper base" ref="map"/>
        <div class="control-panel">
            <el-select v-model="curSelectType" size="small" filterable @change="handleTypeChange"
                       placeholder="选择查看类型">
                <el-option v-for="item in types" :key="item.key"
                           :label="item.key" :value="item.key"/>
            </el-select>
            <div class="value-range">
                <span class="sub-title">{{ curSelectType }}</span>
                <span class="label-left" style="width: 20px">{{ (curMin || 0).toFixed(1) }}</span>
                <img :src="colorRamp" style="flex: 1;display:block;height: 20px;width: 0"/>
                <span class="label-right" style="width: 40px;text-align: left">{{ (curMax || 0).toFixed(1) }}</span>
            </div>
            <div class="time-range">
                <span class="sub-title" style="width:32px;">时间</span>
                <time-player :min="timeRange[0]" style="flex:1"
                             :max="timeRange[1]"
                             :step="0.5" @input="handleTimeChange"/>
            </div>
            <ele-rw-dialog :class-list="['section-line-chart']" append-to-body
                           keep-position :width="720"
                           :show="showDialog">
                <template #title>
                    <h3>时间过程曲线:{{ index }}</h3>
                    <i class="el-icon-close" @click="showDialog = false"
                       style="font-size: 20px;position:absolute;right: 0;top:0;"/>
                </template>
                <template>
                    <v-chart style="width: 100%;height: 100%" ref="chart" autoresize :option="option"/>
                </template>
            </ele-rw-dialog>
        </div>
    </div>
</template>

<script>
import {loadModules} from "esri-loader";
import debounce from "lodash/debounce";
import throttle from "lodash/throttle";
import {hlMap} from "../graphic-symbol";
import {GeoJsonToGraphics, isNil} from "../utils";
import axios from "axios";
import colorStops from './color-step.png'
import {SECTION_DATA_INFO, SECTION_NUMBER} from "./config";
import TimePlayer from '../common/time-player'

export default {
    name: "anim-time-layer",
    components: {TimePlayer},
    data() {
        return {
            layerId: 'CUSTOM_LAYER',
            types: Object.keys(SECTION_DATA_INFO).reduce((res, series) => {
                res[series] = {
                    key: series,
                    min: null,
                    max: null,
                    data: null
                };
                return res;
            }, {}),
            curSelectType: 'COD',
            showDialog: false,
            colorRamp: colorStops,
            timeRange: [1, 288],
            chartData: [],
            index: null,
            curTime:null,
        }
    },
    computed: {
        curMax() {
            const i = this.curSelectType ? this.types[this.curSelectType].max : null;
            return isNil(i) ? "" : i;
        },
        curMin() {
            const i = this.curSelectType ? this.types[this.curSelectType].min : null;
            return isNil(i) ? "" : i;
        },
        option() {
            return {
                tooltip: {
                    trigger: 'axis',
                },
                dataZoom: [{
                    type: 'inside',
                    show: true
                }],
                xAxis: {
                    name: 'time',
                    type: 'category',
                    axisLabel: {color: 'white'}
                },
                yAxis: {
                    name: 'value',
                    type: 'value',
                    axisLabel: {color: 'white'}
                },
                series: [{
                    name: '时间过程',
                    type: 'line',
                    data: this.chartData || []
                }]
            }
        }
    },
    async mounted() {
        const container = this.$refs.map;
        const {map, view} = await this.initMap(container);
        const baseLayer = await this.loadCustomLy();
        console.log(baseLayer)
        const [Graphic,GraphicsLayer] = await loadModules(["esri/Graphic","esri/layers/GraphicsLayer"]);
        this.layer = baseLayer;
        map.add(baseLayer);
        const hlLayer = new GraphicsLayer();
        map.add(hlLayer);
        const tip3DLayer = await this.$layerLoaders.loadTip3DLayer({
            id:"tip3d",
        });
        map.add(tip3DLayer);
        map.reorder(tip3DLayer, map.allLayers.length - 1);
        let clickItem = null, _hlClick = null;
        view.on('click', debounce(async (evt) => {
            const hitRes = await view.hitTest(evt);
            const f = hitRes.results.find(f => {
                return (f.graphic.sourceLayer || f.graphic.layer || {}).id === this.layerId
            });

            const graphic = f?.graphic;
            if (clickItem !== graphic) {
                hlLayer.remove(_hlClick);
                if (graphic) {
                    const type = String(graphic.geometry.type).toLowerCase();
                    _hlClick = new Graphic({
                        geometry: graphic.geometry,
                        symbol: hlMap[type],
                    })
                    hlLayer.add(_hlClick);
                }
            }
            if (graphic) {
                this.index = graphic._valIndex;
                this.chartData = this.layer.getDataByIndex(this.index);
                this.showDialog = true;
            }
        }, 8, {leading: false, trailing: true}));
        let moveItem = null, _hlMove = null, _gid = 0;
        view.on('pointer-move', throttle(async (evt) => {
            const hitRes = await view.hitTest(evt);
            const f = hitRes.results.find(f => {
                return (f.graphic.sourceLayer || f.graphic.layer || {}).id === this.layerId
            });
            const graphic = f?.graphic;
            if (moveItem !== graphic) {
                hlLayer.remove(_hlMove);
                tip3DLayer.removeAll();
                moveItem = graphic;
                if (graphic) {
                    const type = String(graphic.geometry.type).toLowerCase();
                    _hlMove = new Graphic({
                        geometry: graphic.geometry,
                        symbol: hlMap[type],
                    })
                    tip3DLayer.add({
                        tipStyle: {
                            size: 50
                        },
                        geometry: graphic.geometry.centroid,
                    })
                    hlLayer.add(_hlMove);
                }
            }
        }, 60, {leading: false, trailing: true}))
        this.$once('hook:beforeDestroy', () => {
            this.layer = null;
            map.destroy();
            view.destroy();
        });
        this.handleTypeChange(this.curSelectType);
    },
    methods: {
        handleChange(v) {
            this.layer && (this.layer.curTime = v);
        },
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
                center: [115.9666, 29.6710],
                scale: 54000,
                spatialReference: {wkid: 3857},
            });
            return {map, view}
        },
        async loadCustomLy() {
            const graphics = await this.getGraphics();
            return await this.$layerLoaders.loadDataSeriesGraphicsLayer({
                id: this.layerId,
                graphics: graphics
            })
        },
        async getGraphics() {
            const {data} = await axios.get(STATIC_URL + 'polygon.json');
            return GeoJsonToGraphics(data).polygon || [];
        },
        handleTimeChange(v) {
            if (this.layer) {
                this.layer.curTime = v;
            }
            this.curTime = v;
        },
        async handleTypeChange(s) {
            if (!s) return
            this.showDialog = false;
            const layer = this.layer;
            if (!layer) return;
            let type = this.types[s];
            if (!type.data) {
                await this.loadData(s);
            }
            layer.data = type.data
            layer.curTime = this.curTime || 1;
            layer.renderOpts.valueRange = [type.min, type.max]
        },
        async loadData(s) {
            let buffer = await axios.get(SECTION_DATA_INFO[s], {responseType: "arraybuffer"});
            buffer = buffer.data;
            let timeData = [], stat = [], i = 0;
            while (i * SECTION_NUMBER * 4 < buffer.byteLength) {
                let arr = new Float32Array(buffer, i * SECTION_NUMBER * 4, SECTION_NUMBER);
                timeData.push([i + 1, arr]);
                stat.push(statMinMax(arr));
                i++;
            }
            stat = stat.flat();
            this.types[s].data = timeData;
            this.types[s].min = Math.min.apply(null, stat);
            this.types[s].max = Math.max.apply(null, stat);

            function statMinMax(data) {
                let min = data[0], max = data[0];
                for (let i = 0; i < data.length; i++) {
                    min = Math.min(min, data[i]);
                    max = Math.max(max, data[i]);
                }
                return [min, max]
            }
        },
    },

}
</script>

<style scoped lang="less">
.map-wrapper.base {
    height: 100%;
    width: 100%;
    position: relative;
    overflow: hidden;
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
    .filter-range,
    .time-range {
        display: flex;
        height: 32px;
        align-items: center;
        font-size: 16px;

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
<style lang="less">
.section-line-chart {
    background-color: rgba(2, 34, 51, 0.9) !important;

    .dialog__title {
        line-height: 40px;
        height: 40px;
        color: white;

        h3 {
            margin: 0;
        }
    }

    .dialog__content {
        height: 400px;
    }
}
</style>
