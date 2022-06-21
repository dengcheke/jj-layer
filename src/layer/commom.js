import {AlphaFormat, FloatType, TextureLoader} from "three";
import {
    calcDataTexSize,
    convertDataTextureBuffer,
    createVersionChecker,
    genColorRamp,
    getOptimalUnpackAlign,
    versionErrCatch
} from "@src/utils";

export const WORKER_PATH = 'customWorkers/cjj-worker-amd'


/***data-series***/
//this is mapview2d, must have properties:
//this.beforeTime = null;
//this.afterTime = null;
//this.percent = 0;
//this.needUpdateTimeTex = false;
//this.forceUpdateTimeTex = false;
//this.timeTexStrategy = null; //更新策略 'swap-forward', 'swap-backward', 'null'
export function _checkTimeTexNeedUpdate() {
    const {layer, dataset, forceUpdateTimeTex/*例如数据更新*/} = this,
        {times} = dataset,
        curTime = layer.curTime,
        oldBefore = this.beforeTime,
        oldAfter = this.afterTime;
    if (!forceUpdateTimeTex && times.length > 1
        && oldBefore !== null
        && oldAfter !== null
        && curTime >= oldBefore
        && curTime <= oldAfter
    ) {
        this.needUpdateTimeTex = false;
        this.percent = (curTime - oldBefore) / (oldAfter - oldBefore)
        return;
    }
    const {maxTime, minTime} = dataset;
    if (times.length === 1 || curTime < minTime) {
        this.beforeTime = this.afterTime = times[0] || 0;
        this.percent = 0;
    } else {
        if (curTime >= maxTime) {
            this.afterTime = maxTime;
            this.beforeTime = times[times.length - 2];
            this.percent = 1;
        } else {
            for (let i = 1; i < times.length; i++) {
                if (curTime < times[i]) {
                    this.afterTime = times[i];
                    this.beforeTime = times[i - 1];
                    if (this.afterTime === this.beforeTime) {
                        this.percent = 0;
                    } else {
                        this.percent = (curTime - this.beforeTime) / (this.afterTime - this.beforeTime) || 0
                    }
                    break;
                }
            }
        }
    }
    if (forceUpdateTimeTex || oldBefore !== this.beforeTime || oldAfter !== this.afterTime) {
        this.needUpdateTimeTex = true;
        if (forceUpdateTimeTex) {
            this.timeTexStrategy = null
        } else if (oldAfter === this.beforeTime) {
            this.timeTexStrategy = 'swap-forward'
        } else if (oldBefore === this.afterTime) {
            this.timeTexStrategy = 'swap-backward'
        } else {
            this.timeTexStrategy = null;
        }
    }
}

//更新时间纹理
export function _updateTimeTex(uniform) {
    const {beforeTime, afterTime, dataset} = this;
    const {flipY, texSize, format, type, unpackAlignment} = this.dataset;
    let beforeTex = uniform.u_beforeTex.value;
    let afterTex = uniform.u_afterTex.value;
    [beforeTex, afterTex].forEach(tex => {
        tex.format = format;
        tex.type = type;
        tex.flipY = flipY;
        tex.unpackAlignment = unpackAlignment
    })
    if (this.timeTexStrategy === 'swap-forward') {
        [beforeTex, afterTex] = [afterTex, beforeTex];
        uniform.u_beforeTex.value = beforeTex;
        uniform.u_afterTex.value = afterTex;
        afterTex.image = {
            data: dataset.getDataByTime(afterTime),
            width: texSize[0],
            height: texSize[1]
        }
        afterTex.needsUpdate = true;
    } else if (this.timeTexStrategy === 'swap-backward') {
        [beforeTex, afterTex] = [afterTex, beforeTex];
        uniform.u_beforeTex.value = beforeTex;
        uniform.u_afterTex.value = afterTex;
        beforeTex.image = {
            data: dataset.getDataByTime(beforeTime),
            width: texSize[0],
            height: texSize[1]
        }
        beforeTex.needsUpdate = true;
    } else {
        beforeTex.image = {
            data: dataset.getDataByTime(beforeTime),
            width: texSize[0],
            height: texSize[1]
        };
        afterTex.image = {
            data: dataset.getDataByTime(afterTime),
            width: texSize[0],
            height: texSize[1]
        };
        beforeTex.needsUpdate = true;
        afterTex.needsUpdate = true;
    }
    this.timeTexStrategy = null;
    this.forceUpdateTimeTex = false;
    this.needUpdateTimeTex = false;
}

//更新单通道数据纹理
export function _dataHandle_updateDataTexture() {
    if (this.destroyed) return;
    const data = this.layer.data;
    if (!data) {
        this.dataset = null;
        return;
    }
    data.sort((a, b) => +a[0] - +b[0]);
    const times = data.map(item => +item[0]);
    const dataLen = data[0][1].length;
    const texSize = calcDataTexSize(dataLen);
    const totalLen = texSize[0] * texSize[1];
    const pixels = data.map(item => convertDataTextureBuffer(item[1], totalLen));
    this.dataset = {
        times: times,
        pixels: pixels,
        minTime: times[0],
        maxTime: times[times.length - 1],
        texSize,
        unpackAlignment: getOptimalUnpackAlign(texSize[0]),
        flipY: false,
        format: AlphaFormat,
        type: FloatType,
        getDataByTime(t) {
            return pixels[times.indexOf(t)];
        }
    }
    this.forceUpdateTimeTex = true;
    this.requestRender();
}


//this.colorRampReady = false;
export function createColorStopsHandle(layerView, material) {
    const {layer} = layerView;
    const check = createVersionChecker('colorStops');
    return function () {
        let v = layer.renderOpts.colorStops;
        if (!v) throw new Error('renderOpts.colorStops can not be empty')
        if (Array.isArray(v)) v = genColorRamp(v, 128, 1);
        this.colorRampReady = false;
        check(
            new Promise((resolve, reject) => {
                new TextureLoader().load(
                    v,
                    newTexture => resolve(newTexture),
                    null,
                    () => reject(`load colorStops img err, your img src is: "${v}"`)
                )
            })
        ).then((newTexture) => {
            material.uniforms.u_colorRamp.value?.dispose();
            material.uniforms.u_colorRamp.value = newTexture;
            this.colorRampReady = true;
            this.requestRender();
        }).catch(versionErrCatch)
    }.bind(layerView)
}

export function createImageHandle(beforeLoad, onsucc){
    const check = createVersionChecker();
    return function (v) {
        beforeLoad?.();
        check(
            new Promise((resolve, reject) => {
                new TextureLoader().load(
                    v,
                    newTexture => resolve(newTexture),
                    null,
                    () => reject(`load img err, your img src is: "${v}"`)
                )
            })
        ).then((newTexture) => {
            onsucc?.(newTexture)
        }).catch(versionErrCatch)
    }
}
