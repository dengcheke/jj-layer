const cache = new Map();

export async function buildModule(moduleBuildFunc) {
    let module = cache.get(moduleBuildFunc);
    if (!module) {
        module = {
            module: null,
            _loaded: false,
            _promise: null,
            _installFunc: moduleBuildFunc
        }
        cache.set(moduleBuildFunc, module);
    }
    if (module._loaded) return module.module;
    if (!module._promise) {
        module._promise = new Promise((res, rej) => {
            res(moduleBuildFunc instanceof Function ? moduleBuildFunc() : moduleBuildFunc);
        }).then(_module => {
            module.module = _module;
            module._loaded = true;
        });
    }
    await module._promise;
    return module.module;
}

