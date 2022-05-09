<template>
    <div style="position: relative;width: 100%;height: 100%">
        <div class="map-wrapper base" ref="map"/>
        <div class="control-panel">
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
            <div class="grid-set">
                <el-checkbox v-model="showMesh" @change="handleShowMesh">显示网格</el-checkbox>

            </div>
            <div class="value-range">
                <span class="sub-title" style="width:32px;">网格颜色</span>
                <el-input type="color" v-model="meshColor" style="width: 120px" @input="handleMeshColor"/>
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
import TimePlayer from '../common/time-player'
import {loadDataSeriesTINLayer} from "@src/layer/DataSeriesTINMeshLayer";
import axios from "axios";
import throttle from "lodash/throttle";
import {genColorRamp} from "@src/utils";

const colorStops = genColorRamp([
    {value: 0, color: 'yellow'},
    {value: 0.5, color: 'green'},
    {value: 0.5, color: 'blue'},
    {value: 1, color: 'red'}
])
export default {
    name: "series-tin-layer",
    components: {TimePlayer},
    data() {
        return {
            layerId: 'CUSTOM_LAYER',
            curSelectType: 'COD',
            showDialog: false,
            colorRamp: colorStops,
            timeRange: [0, 1],
            chartData: [],
            index: null,
            curMin: 0,
            curMax: 0,
            showMesh: false,
            meshColor: 'white'
        }
    },
    computed: {
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
        handleShowMesh(v){
            this.layer && (this.layer.renderOpts.showMesh = v);
        },
        handleMeshColor(v){
            this.layer && (this.layer.renderOpts.meshColor = v);
        },
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
                constraint: {
                    maxZoom: 24
                },
            });
            window.__view = view;
            view.on('pointer-move', async (evt) => {
                const hitRes = await view.hitTest(evt);
                const f = hitRes.results.find(f => {
                    return (f.graphic.sourceLayer || f.graphic.layer || {}).id === this.layerId
                });
                view.graphics.removeAll();
                if (f) {
                    f.graphic.symbol = {
                        type: "simple-fill",
                        color: "rgba(0,255,255,0.5)",
                        outline: {
                            color: "yellow",
                            width: "2px"
                        }
                    }
                    view.graphics.add(f.graphic)
                }
            })
            return {map, view}
        },
        async loadCustomLy() {
            const vertexData = new Float32Array((await axios.get('/tin/tin.bin', {
                responseType: "arraybuffer"
            })).data);
            const zetaData = new Float32Array((await axios.get('/tin/zeta.bin', {
                responseType: "arraybuffer"
            })).data);
            let min = Infinity, max = -Infinity;
            for (let i = 0; i < zetaData.length; i++) {
                min = Math.min(zetaData[i], min);
                max = Math.max(zetaData[i], max);
            }
            this.curMin = min;
            this.curMax = max;
            console.log(min, max)
            return await loadDataSeriesTINLayer({
                id: this.layerId,
                tinMesh: {
                    vertex: vertexData,
                    spatialReference: {wkid: 4326}
                },
                data: [
                    [0, zetaData],
                ],
                renderOpts: {
                    valueRange: [min, max],
                    colorStops: colorStops,
                    showMesh: this.showMesh,
                    meshColor: this.meshColor
                },
                curTime: 0
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
    .grid-set,
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
