<template>
    <div class="time-player-wrapper">
        <span @click="handlePlay" class="play-btn">{{ isPlay ? '暂停' : '播放' }}</span>
        <span style="flex: none;margin-right:10px">{{ min }}</span>
        <el-slider v-model="value" :min="min" :max="max" ref="slider"
                   @mousedown.native="handleMouseDown"
                   @mouseup.native="handleMouseUp"
                   :format-tooltip="format"
                   :step="step*factor" @input="handleInput" style="flex: 1"/>
        <span style="flex: none;margin-left:10px">{{ max }}</span>
    </div>
</template>

<script>

import {clamp} from "../utils";

export default {
    name: "time-player",
    props: {
        min: {
            type: Number,
            default: 0
        },
        max: {
            type: Number,
            default: 100
        },
        step: {
            type: Number,
            default: 1
        },
        loop: {
            type: Boolean,
            default: false
        },
        //倍率
        factor: {
            type: Number,
            default: 1
        }
    },
    data() {
        return {
            value: 0,
            isPlay: false
        }
    },
    methods: {
        handleInput(v) {
            this.$emit('input', v);
        },
        stop() {
            if (this._timer) {
                cancelAnimationFrame(this._timer);
                this._timer = 0;
            }
            this.isPlay = false;
        },
        start() {
            const self = this;
            this.value = clamp(this.value, this.min, this.max);
            if (this.value === this.max && this.step > 0) {
                this.value = this.min
            }
            if (this.value === this.min && this.step < 0) {
                this.value = this.max
            }
            this.isPlay = true;
            this._timer = requestAnimationFrame(function step() {
                let t = self.value + self.factor * self.step;
                let outRange = false;
                if (t !== clamp(t, self.min, self.max)) outRange = true;
                if (t > self.max) {
                    t = self.loop ? self.min : self.max;
                }
                self.$refs.slider.setPosition((t - self.min) *100/ (self.max - self.min));
                if (self.loop || !outRange) {
                    self._timer = requestAnimationFrame(step);
                } else {
                    self.stop()
                }
            })
        },
        handlePlay() {
            if (this.isPlay) {
                this.stop();
            } else {
                this.start();
            }
        },
        format(v){
            if(!v) return '';
            return (v).toFixed(1)
        },
        handleMouseDown(){
            this._oldPlay = this.isPlay;
            this.stop();
        },
        handleMouseUp(){
            if(this._oldPlay){
                this.start();
            }
        }
    },
    beforeDestroy() {
        this.stop();
    }
}
</script>

<style lang="less">
.time-player-wrapper {
    display: flex;
    align-items: center;
    z-index: 0;
    .play-btn{
        color:cyan;
        margin-right: 5px;
        padding: 4px 12px;
    }
}
</style>
