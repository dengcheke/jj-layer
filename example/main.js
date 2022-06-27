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
    loadRasterFlowLineLayer,
    loadDataSeriesGraphicsLayer,
    loadVectorFieldLayer,
    loadRasterColormapLayer,
    loadTip3DLayer,
    loadModules as loadJJModule
} from "../src";

Vue.prototype.$layerLoaders = {
    loadDataSeriesTINMeshLayer,
    loadClientRasterFlowLineLayer:loadRasterFlowLineLayer,
    loadDataSeriesGraphicsLayer,
    loadClientVectorFieldLayer: loadVectorFieldLayer,
    loadClientRasterColormapLayer:loadRasterColormapLayer,
    loadTip3DLayer,
    loadFlowingLineLayer: async (...args) => {
        const [FlowLineLayer] = await loadJJModule(['flowLineLayer']);
        return new FlowLineLayer(...args);
    }
}

async function initEsriConfig() {
    const useSelfCDN = false;
    if (!useSelfCDN) {
        setDefaultOptions({version: '4.19'});
    }
    const [config,kernel] = await loadModules(["esri/config","esri/kernel"],
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
    });

    const div = document.createElement('div')
    div.innerText = `arcgis api version:${kernel.version}`;
    div.style.cssText = "position:fixed;right:0;bottom:0;background:white;color:black;padding:10px";
    document.body.append(div)
}

initEsriConfig().then(() => {
    new Vue({
        el: '#app',
        router,
        render: h => h(App),
    })
})
