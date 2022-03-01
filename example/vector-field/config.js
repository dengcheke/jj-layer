import {deepFreeze, prefixInteger} from "../utils";

export const VF_TIMES = Object.freeze([
    1, 13, 25, 37, 49, 61,
    73, 85, 97, 109, 121, 133,
    145, 157, 169, 181, 193, 205,
    217, 229, 241, 253, 265, 277,
    288
]);
export const VF_DATASET = Object.freeze(VF_TIMES.reduce((res, cur) => {
    res[cur] = STATIC_URL +`simul-result/lake/vector/V_${prefixInteger(cur, 3)}.bin`;
    return res;
}, {}))
export const VF_META = deepFreeze({
    extent: {
        type: 'extent',
        xmin: 394725.406431600,
        xmax: 394725.406431600 + 10 * (675 - 1),
        ymin: 3280334.24197700,
        ymax: 3280334.24197700 + 10 * (731 - 1),
        spatialReference: {wkid: 2436}
    },
    cols: 675,
    rows: 731,
    valueRange: [0,0.025],
    noDataValue: -9999,
    curTime: VF_TIMES[0],
})
export const VF_COLOR_STOPS = Object.freeze([
    {value: 1 / 8, color: "#7fffff"},
    {value: 2 / 8, color: "#23b7ff"},
    {value: 3 / 8, color: "#0177b4"},
    {value: 4 / 8, color: "#0052ca"},
    {value: 5 / 8, color: "#0310d8"},
    {value: 6 / 8, color: "#9601f9"},
    {value: 7 / 8, color: "#6f00b8"},
    {value: 1, color: "#4c0082"}
])
