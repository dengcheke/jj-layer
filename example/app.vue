<template>
    <div class="app-wrapper">
        <div class="nav-list">
            <div v-for="item in navList" class="nav-item" @click="handleClick(item)">{{item.name}}</div>
        </div>
        <router-view/>
    </div>
</template>

<script>
export default {
    name: "app",
    data() {
        return {
            navList: [
                {name: 'flowing line', pathName: 'flowing-line'},
                {name: 'raster flow line', pathName: 'raster-flow-line'},
                {name: 'data series + 3d tip', pathName: 'data-series'},
                {name: 'vector field', pathName: 'vector-field'},
                {name: 'raster colormap', pathName: 'raster-colormap'},
                {name: 'anim-flow + colormap\r\n(group bloom effect need api >= 4.17)', pathName: 'blend-mode'},
                {name: 'series-tin', pathName: 'data-series-tin'},
            ]
        }
    },
    methods:{
        handleClick(item){
            this.$router.push({name:item.pathName});
        }
    }
}
</script>

<style lang="less">
html, body {
    height: 100%;
    width: 100%;
}

html, body, div {
    display: block;
    margin: 0;
    padding: 0;
}

.app-wrapper {
    position: relative;
    width: 100%;
    height: 100%;

    .nav-list {
        z-index: 9999;
        position: absolute;
        left: 0;
        top: 0;
        width: auto;
        background-color: saddlebrown;
        padding: 10px;
        .nav-item{
            background-color: deepskyblue;
            padding: 6px 12px;
            white-space: pre-wrap;
            max-width: 200px;
        }
    }
}
.esri-ui{
    display: none !important;
}
</style>
