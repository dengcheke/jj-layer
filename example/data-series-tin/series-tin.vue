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
import {isNil} from "../utils";
import colorStops from './color-step.png'
import {SECTION_DATA_INFO} from "./config";
import TimePlayer from '../common/time-player'
import {loadDataSeriesTINLayer} from "@src/layer/DataSeriesTINMeshLayer";

export default {
    name: "series-tin-layer",
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
            index: null
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
        this.layer = baseLayer;
        map.add(baseLayer);
        view.on('click', (e) => {
            console.log(view.toMap(e));
        })
        this.$once('hook:beforeDestroy', () => {
            this.layer = null;
            map.destroy();
            view.destroy();
        });
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
                //center: [119.77350616455078, 25.934365272521973],
                //scale: 54000,
                extent: {
                    xmin: 118.72763061523438,
                    xmax: 120.81938171386719,
                    ymin: 24.974803924560547,
                    ymax: 26.8939266204834,
                    spatialReference: {wkid: 4326}
                },
                spatialReference: {wkid: 3857},
                graphics: [
                    [119.5, 25,],
                    [120.5, 25,],
                    [120.5, 26,],
                    [119.5, 25.5]
                ].map(i => {
                    return {
                        geometry: {
                            type: 'point',
                            x: i[0],
                            y: i[1],
                            spatialReference:{wkid:4326}
                        }
                    }
                })
            });
            window.__view = view;
            return {map, view}
        },
        async loadCustomLy() {
            /* const vertexData = new Float32Array(
                 (await axios.get('/tin/node.bin', {
                     responseType: "arraybuffer"
                 })).data
             );*/

            const vertexData = new Float32Array([
                0, 0,
                1, 0,
                1, 1,
                0, 0.5
            ].map((i, idx) => idx % 2 === 0 ? i + 119.5 : i + 25))
            const pointCount = vertexData.length / 2;
            let xmin = Infinity, xmax = -Infinity;
            let ymin = Infinity, ymax = -Infinity;
            for (let i = 0; i < pointCount; i++) {
                xmin = Math.min(vertexData[i * 2], xmin);
                xmax = Math.max(vertexData[i * 2], xmax);
                ymin = Math.min(vertexData[i * 2 + 1], ymin);
                ymax = Math.max(vertexData[i * 2 + 1], ymax);
            }
            console.log(xmin, xmax, ymin, ymax)

            /*const indexData = new Uint32Array(
                (await axios.get('/tin/mesh.bin', {
                    responseType: "arraybuffer"
                })).data
            )*/
            const indexData = new Uint32Array([
                0, 1, 3, 1, 2, 3
            ])

            return await loadDataSeriesTINLayer({
                id: this.layerId,
                fullExtent: {
                    xmin,
                    xmax,
                    ymin,
                    ymax,
                    spatialReference: {wkid: 4326}
                },
                tinMesh: {
                    vertex: vertexData,
                    index: indexData
                },
                data: [
                    [0, [0, 4]],
                    [1, [1, 5]],
                ],
                renderOpts: {
                    valueRange: [1, 10]
                }
            })
        },
        handleTimeChange(v) {
            if (this.layer) {
                this.layer.curTime = v;
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
