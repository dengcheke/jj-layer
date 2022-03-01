function getTarget(node) {
    if (node === false || node === null) return null;
    if (node === true || !node || node === 'body') {
        return document.body
    }
    if (typeof node === 'string') {
        return document.querySelector(node);
    }
    if (node instanceof window.Node) {
        return node;
    }
    return null;
}
export const TransferDom = {
    inserted(el, {value}, vnode) {
        el.classList.add('v-transfer-dom');
        const parentNode = el.parentNode;
        const placeholder = document.createComment('');
        let hasMovedOut = false;
        const target = getTarget(value);
        if (target) {
            parentNode.replaceChild(placeholder, el)
            target.appendChild(el)
            hasMovedOut = true;
        }
        if (!el.__transferDomData) {
            el.__transferDomData = {
                parentNode: parentNode,
                home: placeholder,
                target: target,
                hasMovedOut: hasMovedOut
            }
        }
    },
    componentUpdated(el, {value}, vnode, oldvnode) {
        const transferData = el.__transferDomData;
        const {parentNode, home, target, hasMovedOut} = transferData;
        const newTarget = getTarget(value); //新目标
        if (target === newTarget) { //不需要移动
            return;
        }
        if (newTarget) { //新目标存在
            if (!hasMovedOut) { //还没有移动过
                parentNode.replaceChild(home, el)
            }
            newTarget.appendChild(el);
            transferData.hasMovedOut = true;
            transferData.target = newTarget;
        } else { //没有目标，移回去
            if (hasMovedOut) {
                parentNode.replaceChild(el, home);
                el.__transferDomData.hasMovedOut = false;
                el.__transferDomData.target = null;
            }
        }
    },
    unbind: function unbind(el, binding) {
        el.classList.remove('v-transfer-dom');
        const transferData = el.__transferDomData || {};
        const {hasMovedOut, parentNode, home} = transferData;
        if (hasMovedOut) {
            parentNode && parentNode.replaceChild(el, home);
        }
        el.__transferDomData = null;
    }
}
