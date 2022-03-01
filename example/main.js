import Vue from 'vue';
import App from './app';
import {router} from "./router";
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import {loadModules,setDefaultOptions} from "esri-loader";
import "echarts";
import VueChart from 'vue-echarts';
Vue.component('vChart',VueChart);
Vue.use(ElementUI);
import EleRwDialog from './common/ele-rw-dialog';

Vue.component('EleRwDialog', EleRwDialog);
setDefaultOptions({ version: '4.19' });
async function initEsriConfig() {
    const [config] = await loadModules(["esri/config"]);
    Object.assign(config.workers.loaderConfig.paths,{
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
