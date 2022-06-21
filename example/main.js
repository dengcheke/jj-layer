import Vue from 'vue';
import App from './app';
import {router} from "./router";
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import {loadModules, setDefaultOptions} from "esri-loader";
import "echarts";
import VueChart from 'vue-echarts';

Vue.component('vChart', VueChart);
Vue.use(ElementUI);
import EleRwDialog from './common/ele-rw-dialog';

Vue.component('EleRwDialog', EleRwDialog);

import {
    loadDataSeriesTINMeshLayer,
    loadClientRasterFlowLineLayer,
    loadDataSeriesGraphicsLayer,
    loadClientVectorFieldLayer,
    loadClientRasterColormapLayer,
    loadTip3DLayer,
    loadFlowingLineLayer
} from "../src";

Vue.prototype.$layerLoaders = {
    loadDataSeriesTINMeshLayer,
    loadClientRasterFlowLineLayer,
    loadDataSeriesGraphicsLayer,
    loadClientVectorFieldLayer,
    loadClientRasterColormapLayer,
    loadTip3DLayer,
    loadFlowingLineLayer
}
async function initEsriConfig() {
    const useSelfCDN = false;
    if (!useSelfCDN) {
        setDefaultOptions({version: '4.22'});
    }
    const [config] = await loadModules(["esri/config"],
        useSelfCDN ? {
            url: "http://119.3.227.192:10022/gisdata/libs/arcgis_v4.18/init.js",
            css: "http://119.3.227.192:10022/gisdata/libs/arcgis_v4.18/esri/themes/light/main.css",
        } : {});
    if (useSelfCDN) {
        config.fontsUrl = 'http://119.3.227.192:10022/gisdata/arcgisFont';
    }
    Object.assign(config.workers.loaderConfig.paths, {
        customWorkers: PROCESS_ENV === 'production'
            ? STATIC_URL
            : document.location.origin + "/workers",
    })
}

initEsriConfig().then(() => {
    new Vue({
        el: '#app',
        router,
        render: h => h(App),
    })
})
