import Vue from 'vue';
import VueRouter from 'vue-router';
import FlowingLine from './flow-line/flow-line';
import RasterFlowingLine from './client-raster-flowline/raster-flow-line';
import AnimTime from './data-series/animation-time';
import SeriesTIN from './data-series-tin/series-tin';
import VectorField from './vector-field/vector-field'
import MultiTimeHeatmap from './client-raster-colormap/client-raster-colormap'
import blendMode from './blend-mode/blend-anim-flow-and-colormap'
Vue.use(VueRouter);
const routes = [
    {
        path:'/flowing-line',
        name:'flowing-line',
        component: FlowingLine
    },
    {
        path:'/raster-flow-line',
        name:'raster-flow-line',
        component: RasterFlowingLine
    },
    {
        path:'/data-series',
        name:'data-series',
        component: AnimTime
    },
    {
        path:'/vector-field',
        name:'vector-field',
        component: VectorField
    },
    {
        path:'/raster-colormap',
        name:'raster-colormap',
        component: MultiTimeHeatmap
    },
    {
        path:'/blend-mode',
        name:'blend-mode',
        component: blendMode
    },
    {
        path:'/data-series-tin',
        name:'data-series-tin',
        component: SeriesTIN
    },
    { path: '*', redirect: '/flowing-line' }
];
export const router = new VueRouter({
    mode: 'history',
    base: '/',
    routes,
    lastRoute: null,//最后一次的路由
});

