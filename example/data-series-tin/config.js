export const SECTION_SERIES = Object.freeze([
    'COD', 'TN', 'TP',
]);
export const SECTION_DATA_INFO = Object.freeze(SECTION_SERIES.reduce((res, key) => {
    res[key] = STATIC_URL + `simul-result/section/001_sc_${key}.bin`;
    return res;
}, {}));
export const SECTION_NUMBER = 6173;
