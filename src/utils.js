export function doubleToTwoFloats(value) {
    let high, low, tempHigh;
    if (value >= 0) {
        if (value < 65536) return [0, value];
        tempHigh = Math.floor(value / 65536) * 65536;
        high = tempHigh;
        low = value - tempHigh;
    } else {
        if (value > -65536) return [0, value];
        tempHigh = Math.floor(-value / 65536) * 65536;
        high = -tempHigh;
        low = value + tempHigh;
    }
    return [high, low];
}

//判断是否是Float32Array
export function isFloat32Array(arr) {
    return Object.prototype.toString.call(arr) === '[object Float32Array]';
}

//id转rgba, r低位 -> a高位
export function id2RGBA(id) {
    return [
        ((id >> 0) & 0xFF), //r
        ((id >> 8) & 0xFF), //g
        ((id >> 16) & 0xFF), //b
        ((id >> 24) & 0xFF) //a
    ]
}

export function RGBA2Id(data) {
    return data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24)
}

//是否是2的幂
export function isPow2(nums) {
    return 0 === (nums & nums - 1)
}

//大于等于某个数的最接近的2的幂
export function near2PowG(val) {
    val = +val;
    if (isNaN(val)) throw new Error('val is not number');
    if (val & (val - 1)) {
        val |= val >> 1;
        val |= val >> 2;
        val |= val >> 4;
        val |= val >> 8;
        val |= val >> 16;
        return val + 1;
    } else {
        return val === 0 ? 1 : val;
    }
}

//获取webgl 纹理最优的解包长度
export function getOptimalUnpackAlign(v) {
    return !(v & 0b111) ? 8 : !(v & 0b11) ? 4 : !(v & 0b1) ? 2 : 1
}

//获取数组的最大最小值
export function getMinMax(arr, ignoreVal) {
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (v === ignoreVal || isNaN(v)) continue;
        min = Math.min(v, min);
        max = Math.max(v, max);
    }
    return {
        min: min === Infinity ? NaN : min,
        max: max === -Infinity ? NaN : max
    }
}

export function nextTick() {
    return new Promise((resolve) => {
        Promise.resolve().then(() => resolve())
    })
}

export function createVersionChecker(){
    let version = 0;
    return promise => {
        const __version = ++version;
        return promise.then(result=>{
            if(__version !== version){
                throw new Error('version not match')
            }else{
                return result
            }
        })
    }
}

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.height = 1;
canvas.width = 128;

export function genColorRamp(s, w, h) {
    canvas.height = parseInt(h) || 1;
    canvas.width = parseInt(w) || 128;
    let stops = [...s].sort((a, b) => a.value - b.value);
    if (!stops.length) throw new Error('invalid color ramps');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    for (let i = 0; i < stops.length; i++) {
        gradient.addColorStop(stops[i].value, stops[i].color);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('png');
}

export function getRenderTarget(version) {
    const gl = this.context;
    // [4.12, 4.14] no function getRenderTarget();
    // [4.15, 4.18] getRenderTarget return { framebufferObject, viewport }
    /**
     problem in [4.15, 4.18], when window resize,
     the return framebufferObject !== gl.getParameter(gl.FRAMEBUFFER_BINDING);
     **/
    // >=4.19 getRenderTarget return { framebuffer, viewport }
    if (version === undefined || parseFloat(version) <= 4.18) {
        const framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        return {
            viewport: gl.getParameter(gl.VIEWPORT),
            framebuffer,
            framebufferObject: framebuffer
        }
    } else {
        const result = this.getRenderTarget();
        result.framebuffer = result.framebuffer || result.framebufferObject;
        result.framebufferObject = result.framebuffer;
        return result;
    }
}
