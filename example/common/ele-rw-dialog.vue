<script type="text/jsx">
import {off, on} from "../utils"
import {TransferDom} from "../v-transfer-dom";

const minZIndex = 1000; //最小的zIndex
let zIndex = minZIndex; //当前的zIndex
const winShowCache = []; //当前显示的所有dialog集合

function removeFromCache(dialog) {
    const idx = winShowCache.indexOf(dialog);
    idx !== -1 && winShowCache.splice(idx, 1);
}

on(document.body, 'keyup', (e) => {
    if (e.keyCode === 27) {//Escape
        let top;
        for (let i = winShowCache.length - 1; i >= 0; i--) {
            const item = winShowCache[i];
            if (item.escClose && (item.shadow || item.fullScreen)) {
                top = item;
                break;
            }
        }
        top && top.$emit('update:show', false);
    }
});
on(window,'resize',()=>{
    winShowCache.forEach(win=>{
        !win.fullScreen && !win.keepPosition && win.placeAtCenter();
    })
})
let gId = 1;//全局id
const template = {
    width: null,
    height: null,
    left: null,
    right: null,
    top: null,
    bottom: null,
    position: null
};
export default {
    name: "EleRwDialog",
    directives: {
        'transfer-dom': TransferDom,
    },
    props: {
        classList: {
            default: null,
            type: Array,
            desc: '自定义class，添加到wrapper上'
        },
        width: {
            type: Number | String,
            default: 600,
            desc: '宽度'
        },
        height: {
            type: Number | String,
            default: null,
            desc: '高度'
        },
        padding: {
            type: Array,
            default: () => [0, 0, 0, 0],
            desc: 'dialog距离父元素的边距,限制拖拽范围,上右下左'
        },
        keepPosition: {
            type: Boolean,
            default: false,
            desc: '是否保持拖拽位置，否则每次重新显示，都会出现在正中间'
        },
        draggable: {
            type: Boolean,
            default: true,
            desc: '是否可拖动,只有表头可拖动,设置为true,需要header内容可见'
        },
        show: {
            type: Boolean,
            default: true,
            desc: '是否可见'
        },
        fullScreen: {
            type: Boolean,
            default: false,
            desc: '是否全屏'
        },
        appendToBody: {
            type: Boolean,
            default: true,
            desc: '是否添加到body下'
        },
        shadow: {
            type: Boolean,
            default: false,
            desc: '是否显示遮罩'
        },
        escClose: {
            type: Boolean,
            default: true,
            desc: '按下esc是否隐藏,仅在全屏或者shadow模式下有效'
        }
    },
    data() {
        this._isFirstShow = true;
        return {
            id: gId++,
            store: {...template},
            needRestore: false,
        }
    },
    computed: {
        parentNode() {
            return this.appendToBody ? document.body : null;
        },

    },
    render(h) {
        const key = `_ele-rw-dialog-${this.id}_`;
        //第一次可见才加载
        const clazz = (this.classList || []).reduce((pre, cur) => {
            pre[cur] = true;
            return pre;
        }, {});
        return <div class="ele-rw-dialog-placeholder" key={key}>
            <transition name="ele-rw-dialog-fade-out">
                <div {...{
                    class: {
                        'ele-rw-dialog__wrapper': true,
                        'full-screen': this.fullScreen,
                        'has-shadow': this.shadow,
                        'append-to-body': this.appendToBody
                    },
                    directives: [
                        {
                            name: 'transfer-dom',
                            value: this.parentNode,//为null,代表不移动
                        },
                        {
                            name: 'show',
                            value: this.show
                        }
                    ],
                    ref: "dialogWrapper"
                }}>
                    <div {...{
                        class: {
                            ...clazz,
                            'ele-rw-dialog': true,
                            'full-screen': this.fullScreen,
                        },
                        style: {
                            width: this.parsePx(this.width),
                            height: this.parsePx(this.height)
                        },
                        on: {
                            mousedown: this.promoteDialogZIndex
                        },
                        ref: 'dialog'
                    }}>
                        <div class="dialog__title" ref="title" style={{cursor: this.draggable ? 'move' : 'auto'}}>
                            {this.$scopedSlots.title ? this.$scopedSlots.title() : (this.$slots.title || null)}
                        </div>
                        <div class="dialog__content">
                            {this.$scopedSlots.default ? this.$scopedSlots.default() : (this.$slots.default || null)}
                        </div>
                        <div class="dialog__footer">
                            {this.$scopedSlots.footer ? this.$scopedSlots.footer() : (this.$slots.footer || null)}
                        </div>
                    </div>
                </div>
            </transition>
        </div>

    },
    methods: {
        // 新显示的dialog，z-index提升到最上层
        promoteDialogZIndex() {
            const wrapper = this.$refs.dialogWrapper;
            if (winShowCache.length > 1) {
                zIndex += 1;
                wrapper.style.zIndex = zIndex; //点击的窗口提到最上层
            } else {
                zIndex = minZIndex;
            }
        },
        clearDrag() {
            if (this._unBindDrag) {
                this._unBindDrag();
                this._unBindDrag = null;
            }
        },
        initDrag() {
            const dialog = this.$refs.dialog,
                wrap = dialog.parentNode,
                title = this.$refs.title;
            const titleOnMousedown = (e) => {
                //take snapshot
                document.body.style.userSelect = 'none';
                //cur position
                const x = e.clientX; //当前页面点击X
                const y = e.clientY; //当前页面点击Y

                //wrap position
                let wrapRect = wrap.getBoundingClientRect();
                const [t, r, b, l] = this.padding;
                const W = wrapRect.width,
                    H = wrapRect.height,
                    Left = wrapRect.left,
                    Top = wrapRect.top;

                const rect = dialog.getBoundingClientRect();//dragwindow的定位盒子
                const h = rect.height, w = rect.width, //初始位置
                    left = rect.left, top = rect.top;

                const onMousemove = (e) => {
                    if (this.fullScreen) return;

                    const moveX = e.clientX - x; //x移动的距离
                    const moveY = e.clientY - y; //y移动的距离
                    let _left = left + moveX; //新的left
                    let _top = top + moveY; //新的top
                    // 边界处理
                    if (_left < Left + l) {
                        _left = Left + l + 1;
                    } else if (_left + w > W + Left - r) {
                        _left = W + Left - w - r - 1;
                    }
                    if (_top < Top + t) {
                        _top = Top + t + 1;
                    } else if (_top + h > H + Top - b) {
                        _top = H + Top - h - b - 1;
                    }
                    _left = _left - Left;//boundingRect是相对于body的，这里计算相对wrap父元素的
                    _top = _top - Top;
                    // 移动当前元素
                    dialog.style.left = `${_left >= 0 ? _left : 0}px`;
                    dialog.style.top = `${_top >= 0 ? _top : 0}px`;
                };
                const onMouseup = function () {
                    off(document, 'mousemove', onMousemove);
                    off(document, 'mouseup', onMouseup);
                    document.body.style.userSelect = null;
                };
                on(document, 'mousemove', onMousemove);
                on(document, 'mouseup', onMouseup);
                return false;
            };
            on(title, 'mousedown', titleOnMousedown);
            this._unBindDrag = () => {
                off(title, 'mousedown', titleOnMousedown);
            }
        },
        placeAtCenter() {
            this.$nextTick(() => {
                const dialog = this.$refs.dialog;
                const parentNode = dialog.parentNode;
                const left = parentNode.clientWidth - dialog.offsetWidth;
                const top = parentNode.clientHeight - dialog.offsetHeight;
                dialog.style.left = `${(left > 0 ? left : 0) / 2}px`;
                dialog.style.top = `${(top > 0 ? top : 0) / 2}px`;
            })
        },
        parsePx(w) {
            const type = typeof w;
            if (type === 'number') {
                return `${w}px`;
            } else {
                return w;
            }
        },
        checkNestedPosition() {
            requestAnimationFrame(() => {
                const dialog = this.$refs.dialog;
                const wrap = dialog.parentNode;
                if (dialog.offsetLeft > wrap.clientWidth) {
                    const left = wrap.clientWidth - dialog.offsetWidth;
                    dialog.style.left = left > 0 ? left + 'px' : 0;
                }
                if (dialog.offsetTop > wrap.clientHeight) {
                    const top = wrap.clientHeight - dialog.offsetTop;
                    dialog.style.top = top > 0 ? top + 'px' : 0;
                }
            })
        }
    },
    watch: {
        appendToBody: function () {
            this.show && this.promoteDialogZIndex();
            this.placeAtCenter();
        },
        draggable: {
            handler: function (v) {
                this.$nextTick(() => {
                    if (v) {
                        this.initDrag();
                    } else {
                        this.clearDrag();
                    }
                })
            },
            immediate: true
        },
        show: {
            handler: function (v) {
                this.$nextTick(() => {
                    const wrapper = this.$refs.dialogWrapper;
                    if (v) {
                        winShowCache.push(this);
                        this.promoteDialogZIndex();
                        if (!this.fullScreen) {
                            if(this._isFirstShow){
                                this.placeAtCenter();
                                this._isFirstShow = false;
                            }else{
                                !this.keepPosition && this.placeAtCenter();
                            }

                        }
                    } else { //隐藏，从缓存中移除
                        wrapper.style.zIndex = '1000';
                        removeFromCache(this);
                    }
                });
            },
            immediate: true
        },
        fullScreen: {
            handler: function (v) {
                winShowCache.forEach(i => {
                    if (i !== this) {
                        i.checkNestedPosition();
                    }
                });
                this.$nextTick(() => {
                    const dialog = this.$refs.dialog;
                    const style = dialog.style;
                    if (v) {
                        const {left, right, top, bottom, width, height, position} = style || {};
                        this.store = {left, right, top, bottom, width, height, position};
                        this.needRestore = true;
                        style.left = style.right = style.top = style.bottom = 0;
                        style.position = "fixed";
                        style.width = style.height = '100%';
                    } else {
                        if (!this.needRestore) return;
                        Object.keys(this.store).forEach(attr => {
                            style[attr] = this.store[attr];
                        })
                        this.store = {...template};
                        this.needRestore = false;
                    }
                })
            },
            immediate: true
        }
    },
    beforeDestroy() {
        this.clearDrag();
        removeFromCache(this);
    }
}
</script>
<style lang="less">
.ele-rw-dialog__wrapper {
    z-index: 1000;
    pointer-events: none;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;

    &.has-shadow {
        background-color: rgba(0, 0, 0, .4);
        pointer-events: auto;
    }

    .ele-rw-dialog {
        backface-visibility: hidden;
        pointer-events: auto;
        position: absolute;
        height: auto;
        background-color: rgba(23, 75, 98, 0.9);
        box-shadow: 2px 2px 10px 0 black;
    }

    .dialog__title {
        position: relative;
        user-select: none;
        overflow: hidden;
    }
}

.ele-rw-dialog-fade-out-enter,
.ele-rw-dialog-fade-out-leave-to {
    opacity: 0;
}

.ele-rw-dialog-fade-out-enter-active,
.ele-rw-dialog-fade-out-leave-active {
    transition: opacity 0.3s;
}

.ele-rw-dialog-fade-out-enter-to,
.ele-rw-dialog-fade-out-leave {
    opacity: 1;
}
</style>
