<template>
    <div style="position: relative;width: 100%;height: 100%">
        <div class="map-wrapper base" ref="map"/>
        <div class="control-panel">
            <el-select v-model="curSelect" size="small" placeholder="选择查看类型">
                <el-option v-for="item in types" :key="item" :label="item" :value="item"/>
            </el-select>
            <div class="value-range">
                <span class="sub-title">值范围</span>
                <span class="label-left">{{ meta.valueRange[0] }}</span>
                <img :src="colorStops" style="flex: 1;display:block;height: 20px"/>
                <span class="label-right">{{ meta.valueRange[1] }}</span>
            </div>
            <div class="filter-range">
                <span class="sub-title">过滤范围</span>
                <span class="label-left">{{ filterRange[0] }}</span>
                <el-slider style="flex:1;display: block;margin: 0 5px"
                           v-model="filterRange" :step="0.01"
                           range @input="handleFilterRangeChange"
                           :min="meta.valueRange[0]" :max="meta.valueRange[1]"/>
                <span class="label-right">{{ filterRange[1] }}</span>
            </div>
            <div class="time-range">
                <span class="sub-title" style="width:32px;">时间</span>
                <time-player :min="timeRange[0]" style="flex:1"
                             :max="timeRange[1]"
                             :step="0.2" @input="handleTimeChange"/>
            </div>
        </div>
    </div>
</template>

<script>
import ElSlider from 'element-ui/lib/slider';
import {loadModules} from "esri-loader";
import {loadClientRasterColormapLayer} from "@src";
import cloneDeep from "lodash/cloneDeep";
import axios from "axios";
import {genColorRamp} from "@src/utils";
import {TN_COLOR_STOPS, TN_DATASET, TN_META, TN_TIMES} from "./tn-config";
import TimePlayer from '../common/time-player'
import {TP_COLOR_STOPS, TP_DATASET, TP_META, TP_TIMES} from "./tp-config";
import {COD_COLOR_STOPS, COD_DATASET, COD_META, COD_TIMES} from "./cod-config";

export default {
    name: "clientRasterColormap",
    components: {ElSlider, TimePlayer},
    data() {
        return {
            layerId: 'CUSTOM_LAYER',
            types: ['tn', 'tp', 'cod'],
            curSelect: 'tn',
            colorStops: null,
            timeRange: [0, 0],
            meta: {
                valueRange: [0, 100]
            },
            filterRange: [0, 2]
        }
    },
    async mounted() {
        const container = this.$refs.map;
        const {map, view} = await this.initMap(container);
        const layer = await this.loadCustomLy();
        this.layer = layer;
        map.add(layer);
        const off = this.$watch('curSelect', async function (v) {
            if (v === 'tn') {
                this.colorStops = genColorRamp(TN_COLOR_STOPS, 128, 32);
                this.meta = cloneDeep(TN_META);
                this.timeRange = [TN_TIMES[0], TN_TIMES[TN_TIMES.length - 1]];
                const bufs = await Promise.all(TN_TIMES.map(t => {
                    return axios.get(TN_DATASET[t], {responseType: 'arraybuffer'})
                }));
                const data = {
                    ...TN_META,
                    dataArr: [],
                };
                TN_TIMES.forEach((t, idx) => {
                    data.dataArr.push([t, new Float32Array(bufs[idx].data)]);
                });
                this.layer.data = data;
                this.layer.renderOpts = {
                    colorStops: this.colorStops,
                    valueRange: data.valueRange
                }
            } else if (v === 'tp') {
                this.colorStops = genColorRamp(TP_COLOR_STOPS, 128, 32);
                this.meta = cloneDeep(TP_META);
                this.timeRange = [TP_TIMES[0], TP_TIMES[TP_TIMES.length - 1]];
                const bufs = await Promise.all(TP_TIMES.map(t => {
                    return axios.get(TP_DATASET[t], {responseType: 'arraybuffer'})
                }));
                const data = {
                    ...TP_META,
                    dataArr: [],
                };
                TP_TIMES.forEach((t, idx) => {
                    data.dataArr.push([t, new Float32Array(bufs[idx].data)]);
                });
                this.layer.data = data;
                this.layer.renderOpts = {
                    colorStops: this.colorStops,
                    valueRange: data.valueRange
                }
            } else if (v === 'cod') {
                this.colorStops = genColorRamp(COD_COLOR_STOPS, 128, 32);
                this.meta = cloneDeep(COD_META);
                this.timeRange = [COD_TIMES[0], COD_TIMES[COD_TIMES.length - 1]];
                const bufs = await Promise.all(COD_TIMES.map(t => {
                    return axios.get(COD_DATASET[t], {responseType: 'arraybuffer'})
                }));
                const data = {
                    ...COD_META,
                    dataArr: [],
                };
                COD_TIMES.forEach((t, idx) => {
                    data.dataArr.push([t, new Float32Array(bufs[idx].data)]);
                });
                this.layer.data = data;
                this.layer.renderOpts = {
                    colorStops: this.colorStops,
                    valueRange: data.valueRange
                }
            }
            setTimeout(() => {
                this.filterRange = [...this.meta.valueRange]
            }, 16)
        }, {immediate: true});
        this.$once('hook:beforeDestroy', () => {
            this.layer = null;
            layer.destroy();
            map.destroy();
            view.destroy();
            off();
        })
    },
    methods: {
        handleTimeChange(v) {
            this.layer && (this.layer.curTime = v)
        },
        handleFilterRangeChange() {
            this.layer && (this.layer.renderOpts.filterRange = [...this.filterRange]);
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
                spatialReference: {wkid: 3857}
            });
            return {map, view}
        },
        async loadCustomLy() {
            const ly = await loadClientRasterColormapLayer({
                id: this.layerId,
            });
            return ly
        },
    },

}
</script>

<style scoped lang="less">
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
