export function GeoJsonToGraphics(geoJsonData, sr = {wkid:4326}) {
    const Point = [], Polyline = [], Polygon = [];
    geoJsonData.features.forEach(f => {
        const geo = f.geometry, coords = geo.coordinates;
        let geometry, collection;
        switch (geo.type.toLowerCase()) {
            case "point":
                collection = Point;
                geometry = {
                    type: 'point',
                    x: coords[0],
                    y: coords[1],
                    spatialReference: sr
                };
                break;
            case "linestring":
                collection = Polyline;
                geometry = {
                    type: 'polyline',
                    paths: [coords],
                    spatialReference: sr
                };
                break;
            case "polygon":
                collection = Polygon;
                geometry = {
                    type: 'polygon',
                    rings: coords,
                    spatialReference: sr
                };
                break;
            default:
                return null;
        }
        collection.push({
            geometry: geometry,
            attributes: f.properties || {}
        });
    })
    return {
        point: Point,
        polyline: Polyline,
        polygon: Polygon,
    }
}
export function deepFreeze(obj) {
    if (obj === null) return;
    if (typeof obj !== 'object') return;
    const propNames = Object.getOwnPropertyNames(obj);
    propNames.forEach(name => {
        deepFreeze(obj[name]);
    });
    return Object.freeze(obj);
}
export function prefixInteger(num, n) {
    return (Array(n).join(0) + num).slice(-n);
}
export function isNil(obj) {
    return obj === null || obj === undefined
}
export const on = (function () {
    if (document.addEventListener) {
        return function (element, event, handler) {
            if (element && event && handler) {
                element.addEventListener(event, handler, false);
                return function () {
                    element.removeEventListener(event, handler, false);
                }
            }
        };
    } else {
        return function (element, event, handler) {
            if (element && event && handler) {
                element.attachEvent('on' + event, handler);
                return function (element, event, handler) {
                    element.detachEvent('on' + event, handler);
                }
            }
        };
    }
})();
export const off = (function () {
    if (document.removeEventListener) {
        return function (element, event, handler) {
            if (element && event) {
                element.removeEventListener(event, handler, false);
            }
        };
    } else {
        return function (element, event, handler) {
            if (element && event) {
                element.detachEvent('on' + event, handler);
            }
        };
    }
})();
export function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
