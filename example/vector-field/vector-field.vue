<template>
    <div style="position: relative;width: 100%;height: 100%">
        <div class="map-wrapper base"/>
        <div class="control-panel">
            <div class="value-range">
                <span class="sub-title">流速(m/s)</span>
                <span class="label-left" style="width: 10px">0</span>
                <img :src="colorStops" style="flex: 1;display:block;height: 20px"/>
                <span class="label-right" style="width: 40px;text-align: left">{{ speedMax }}</span>
            </div>
            <div class="speed-range">
                <el-tooltip placement="top">
                    <template #content>
                        <div>动态修改<span style="color:yellow">流速</span>最大值</div>
                    </template>
                    <span class="sub-title" style="margin-left: 10px">流速最大值(m/s)</span>
                </el-tooltip>
                <el-slider style="flex:1;display: block;margin: 0 10px"
                           v-model="speedMax" :step="0.001"
                           @input="handleSpeedMaxChange" :min="0" :max="0.05"/>
            </div>
            <div class="cell-size">
                <el-tooltip placement="top">
                    <template #content>
                        <div>箭头所在网格范围,越大箭头越稀疏</div>
                    </template>
                    <span class="sub-title">网格大小</span>
                </el-tooltip>
                <el-slider style="flex:1;display: block;margin: 0 5px"
                           v-model="gridSize" :step="0.1"
                           @input="handleCellSizeChange"
                           :min="cellSizeRange[0]" :max="cellSizeRange[1]"/>
                <span class="label-right">{{ gridSize }}</span>
            </div>
            <div class="arrow-range">
                <el-tooltip placement="top">
                    <template #content>
                        <div>箭头大小范围, 箭头大小与流速范围对应</div>
                    </template>
                    <span class="sub-title">箭头大小</span>
                </el-tooltip>
                <span class="label-left">{{ arrowSize[0] >> 0 }}</span>
                <el-slider style="flex:1;display: block;margin: 0 5px"
                           v-model="arrowSize" :step="1"
                           :format-tooltip="formatArrowSize"
                           range @input="handleArrowSizeChange"
                           :min="arrowSizeRange[0]" :max="arrowSizeRange[1]"/>
                <span class="label-right">{{ arrowSize[1] >> 0 }}</span>
            </div>
            <div class="show-grid">
                <el-switch v-model="showGrid" @change="handleGridChange"/>
                <span>显示网格</span>
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
import {loadModules} from "esri-loader";
import axios from "axios";
import {genColorRamp} from "@src/utils";
import TimePlayer from '../common/time-player'
import {VF_COLOR_STOPS, VF_DATASET, VF_META, VF_TIMES} from './config'
import {clamp, isNil} from "../utils";

export default {
    name: "vf-layer",
    components: {TimePlayer},
    data() {
        const meta = VF_META;
        return {
            layerId: 'CUSTOM_LAYER',
            colorStops: genColorRamp(VF_COLOR_STOPS, 128, 32),
            speedMax: meta.valueRange[1],
            cellSizeRange: [20, 100],
            gridSize: 40,
            arrowSizeRange: [1, 40 / 2 ** 0.5],
            arrowSize: [16, 40 / 2 ** 0.5],
            timeRange: [VF_TIMES[0], VF_TIMES[VF_TIMES.length - 1]],
            meta: meta,
            showGrid: false,
        }
    },
    async mounted() {
        const container = this.$el;
        const {map, view} = await this.initMap(container);
        const layer = this.layer = await this.loadCustomLy();
        map.add(layer);
        this.$once('hook:beforeDestroy', () => {
            this.layer = null;
            layer.destroy();
            map.destroy();
            view.destroy();
        })
    },

    methods: {
        handleGridChange(v) {
            if (this.layer) {
                this.layer.renderOpts.showGrid = v;
            }
        },
        formatArrowSize(v) {
            return isNil(v) ? '' : (v).toFixed(1)
        },
        handleSpeedMaxChange(v) {
            if (this.layer) {
                this.layer.renderOpts.valueRange = [0, v];
            }
        },
        handleCellSizeChange(v) {
            const limit = v / 2 ** 0.5;
            let [min, max] = this.arrowSize;
            max = clamp(max, 1, limit);
            min = clamp(min, 1, max);
            this.arrowSize = [min, max];
            this.arrowSizeRange = [10, limit];
            if (this.layer) {
                this.layer.renderOpts.gridSize = v;
                this.layer.renderOpts.sizeRange = [...this.arrowSize];
            }
        },
        handleArrowSizeChange() {
            if (this.layer) {
                this.layer.renderOpts.sizeRange = [...this.arrowSize];
            }
        },
        handleTimeChange(v) {
            this.layer && (this.layer.curTime = v)
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
                center: {
                    type: 'point',
                    x: 12907021.08629284,
                    y: 3461334.4526208863,
                    spatialReference: {wkid: 3857}
                },
                scale: 36111.909643,
                spatialReference: {wkid: 3857}
            });
            return {map, view}
        },
        async loadCustomLy() {
            const opts = {
                colorStops: this.colorStops,
                gridSize: this.gridSize,
                sizeRange: this.arrowSize,
                valueRange: [0, 0.025],
            };
            const bufs = await Promise.all(VF_TIMES.map(t => {
                return axios.get(VF_DATASET[t], {responseType: 'arraybuffer'})
            }));
            const dataArr = [];
            VF_TIMES.forEach((t, idx) => {
                dataArr.push([t, new Float32Array(bufs[idx].data)]);
            });
            return this.$layerLoaders.loadClientVectorFieldLayer({
                id: this.layerId,
                renderOpts: opts,
                data: {
                    ...VF_META,
                    dataArr,
                }
            })
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
