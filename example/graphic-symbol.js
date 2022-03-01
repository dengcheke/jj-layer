export const GRAPHIC_SYMBOL = {
    HIGHLIGHT_HOVER_POLYGON: {
        type: "simple-fill",
        color: [0, 255, 255, 0.15],
        outline: {
            color: [0, 238, 255, 1],
            width: 3
        }
    },
    HIGHLIGHT_HOVER_POLYLINE_YELLOW: {
        type: "simple-line",
        color: '#ffff00',
        width: '4px'
    },
    HIGHLIGHT_HOVER_POLYLINE_CYAN: {
        type: "simple-line",
        color: '#00ffff',
        width: '4px'
    },
    HIGHLIGHT_HOVER_POINT: {
        type: "simple-marker",
        color: [0, 245, 255, 1],
        outline: {
            color: [0, 245, 255, 1],
            width: 3
        }
    },
    HIGHLIGHT_CLICK_POLYGON: {
        type: "simple-fill",
        color: [23, 255, 255, 0.15],
        outline: {
            color: [23, 255, 255, 1],
            width: 1
        }
    },
    HIGHLIGHT_CLICK_POLYLINE: {
        type: "simple-line",
        color: '#00ffff',
    },
    HIGHLIGHT_CLICK_POINT: {
        type: "simple-marker",
        color: [255, 48, 48, 0.5],
        outline: {
            color: [0, 0, 0, 1],
            width: 5
        }
    },
    DEFAULT_POINT: {
        type: "simple-marker",
        size: 10,
        color: "red",
        outline: {
            width: 0.5,
            color: "white"
        }
    },
}
export const hlMap = {
    point:GRAPHIC_SYMBOL.HIGHLIGHT_HOVER_POINT,
    polyline:GRAPHIC_SYMBOL.HIGHLIGHT_HOVER_POLYLINE_YELLOW,
    polygon:GRAPHIC_SYMBOL.HIGHLIGHT_HOVER_POLYGON,
    extent:GRAPHIC_SYMBOL.HIGHLIGHT_HOVER_POLYGON,
}
