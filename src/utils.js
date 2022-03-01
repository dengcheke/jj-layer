import {loadModules} from "esri-loader";

export function doubleToTwoFloats(value) {
    let high, low, tempHigh;
    if (value >= 0) {
        if(value < 65536) return [0, value];
        tempHigh = Math.floor(value / 65536) * 65536;
        high = tempHigh;
        low = value - tempHigh;
    } else {
        if(value > -65536) return [0, value];
        tempHigh = Math.floor(-value / 65536) * 65536;
        high = -tempHigh;
        low = value + tempHigh;
    }
    return [high, low];
}

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

export function isPow2(nums) {
    return 0 === (nums & nums - 1)
}

export function near2PowMax(val) {
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

let __version = undefined;
export async function getApiVersion(){
    if(__version === undefined){
        const [esriNS] = await loadModules(["esri/kernel"]);
        __version = parseFloat(esriNS.version)
    }
    return __version;
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
