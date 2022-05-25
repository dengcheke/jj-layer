import {AlphaFormat, FloatType} from "three";

export const WORKER_PATH = 'customWorkers/cjj-worker'

//data-series
//this is mapview2d, must have properties:

//this.beforeTime = null;
//this.afterTime = null;
//this.percent = 0;
//this.needUpdateTimeTex = false;
//this.forceUpdateTimeTex = false;
//this.timeTexStrategy = null; //更新策略 'swap-forward', 'swap-backward', 'null'

export function _checkTimeTexNeedUpdate(){
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
        if(forceUpdateTimeTex){
            this.timeTexStrategy = null
        }else if (oldAfter === this.beforeTime) {
            this.timeTexStrategy = 'swap-forward'
        } else if (oldBefore === this.afterTime) {
            this.timeTexStrategy = 'swap-backward'
        } else {
            this.timeTexStrategy = null;
        }
    }
}

export function _updateTimeTex(uniform){
    const {beforeTime, afterTime, dataset} = this;
    const {flipY, texSize} = this.dataset;
    let beforeTex = uniform.u_beforeTex.value;
    let afterTex = uniform.u_afterTex.value;
    [beforeTex, afterTex].forEach(tex => {
        tex.format = AlphaFormat;
        tex.type = FloatType;
        tex.flipY = flipY;
        tex.unpackAlignment = dataset.unpackAlignment
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
