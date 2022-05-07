define(['exports', 'esri/geometry/geometryEngine', 'esri/geometry/projection', 'esri/geometry/SpatialReference'], function (exports, geometryEngine, projection, SpatialReference) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
      Object.keys(e).forEach(function (k) {
        if (k !== 'default') {
          var d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: function () {
              return e[k];
            }
          });
        }
      });
    }
    n['default'] = e;
    return Object.freeze(n);
  }

  var geometryEngine__namespace = /*#__PURE__*/_interopNamespace(geometryEngine);
  var projection__namespace = /*#__PURE__*/_interopNamespace(projection);
  var SpatialReference__default = /*#__PURE__*/_interopDefaultLegacy(SpatialReference);

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function ownKeys$2(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys$2(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys$2(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _iterableToArrayLimit(arr, i) {
    if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  var check = function (it) {
    return it && it.Math == Math && it;
  };

  // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
  var global$k =
    /* global globalThis -- safe */
    check(typeof globalThis == 'object' && globalThis) ||
    check(typeof window == 'object' && window) ||
    check(typeof self == 'object' && self) ||
    check(typeof commonjsGlobal == 'object' && commonjsGlobal) ||
    // eslint-disable-next-line no-new-func -- fallback
    (function () { return this; })() || Function('return this')();

  var objectGetOwnPropertyDescriptor = {};

  var fails$i = function (exec) {
    try {
      return !!exec();
    } catch (error) {
      return true;
    }
  };

  var fails$h = fails$i;

  // Detect IE8's incomplete defineProperty implementation
  var descriptors = !fails$h(function () {
    return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] != 7;
  });

  var objectPropertyIsEnumerable = {};

  var nativePropertyIsEnumerable = {}.propertyIsEnumerable;
  var getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

  // Nashorn ~ JDK8 bug
  var NASHORN_BUG = getOwnPropertyDescriptor$1 && !nativePropertyIsEnumerable.call({ 1: 2 }, 1);

  // `Object.prototype.propertyIsEnumerable` method implementation
  // https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
  objectPropertyIsEnumerable.f = NASHORN_BUG ? function propertyIsEnumerable(V) {
    var descriptor = getOwnPropertyDescriptor$1(this, V);
    return !!descriptor && descriptor.enumerable;
  } : nativePropertyIsEnumerable;

  var createPropertyDescriptor$4 = function (bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };

  var toString$1 = {}.toString;

  var classofRaw$1 = function (it) {
    return toString$1.call(it).slice(8, -1);
  };

  var fails$g = fails$i;
  var classof$7 = classofRaw$1;

  var split = ''.split;

  // fallback for non-array-like ES3 and non-enumerable old V8 strings
  var indexedObject = fails$g(function () {
    // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
    // eslint-disable-next-line no-prototype-builtins -- safe
    return !Object('z').propertyIsEnumerable(0);
  }) ? function (it) {
    return classof$7(it) == 'String' ? split.call(it, '') : Object(it);
  } : Object;

  // `RequireObjectCoercible` abstract operation
  // https://tc39.es/ecma262/#sec-requireobjectcoercible
  var requireObjectCoercible$2 = function (it) {
    if (it == undefined) throw TypeError("Can't call method on " + it);
    return it;
  };

  // toObject with fallback for non-array-like ES3 strings
  var IndexedObject$2 = indexedObject;
  var requireObjectCoercible$1 = requireObjectCoercible$2;

  var toIndexedObject$5 = function (it) {
    return IndexedObject$2(requireObjectCoercible$1(it));
  };

  var isObject$9 = function (it) {
    return typeof it === 'object' ? it !== null : typeof it === 'function';
  };

  var isObject$8 = isObject$9;

  // `ToPrimitive` abstract operation
  // https://tc39.es/ecma262/#sec-toprimitive
  // instead of the ES6 spec version, we didn't implement @@toPrimitive case
  // and the second argument - flag - preferred type is a string
  var toPrimitive$4 = function (input, PREFERRED_STRING) {
    if (!isObject$8(input)) return input;
    var fn, val;
    if (PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject$8(val = fn.call(input))) return val;
    if (typeof (fn = input.valueOf) == 'function' && !isObject$8(val = fn.call(input))) return val;
    if (!PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject$8(val = fn.call(input))) return val;
    throw TypeError("Can't convert object to primitive value");
  };

  var hasOwnProperty = {}.hasOwnProperty;

  var has$b = function (it, key) {
    return hasOwnProperty.call(it, key);
  };

  var global$j = global$k;
  var isObject$7 = isObject$9;

  var document$1 = global$j.document;
  // typeof document.createElement is 'object' in old IE
  var EXISTS = isObject$7(document$1) && isObject$7(document$1.createElement);

  var documentCreateElement$1 = function (it) {
    return EXISTS ? document$1.createElement(it) : {};
  };

  var DESCRIPTORS$8 = descriptors;
  var fails$f = fails$i;
  var createElement = documentCreateElement$1;

  // Thank's IE8 for his funny defineProperty
  var ie8DomDefine = !DESCRIPTORS$8 && !fails$f(function () {
    return Object.defineProperty(createElement('div'), 'a', {
      get: function () { return 7; }
    }).a != 7;
  });

  var DESCRIPTORS$7 = descriptors;
  var propertyIsEnumerableModule = objectPropertyIsEnumerable;
  var createPropertyDescriptor$3 = createPropertyDescriptor$4;
  var toIndexedObject$4 = toIndexedObject$5;
  var toPrimitive$3 = toPrimitive$4;
  var has$a = has$b;
  var IE8_DOM_DEFINE$1 = ie8DomDefine;

  var nativeGetOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

  // `Object.getOwnPropertyDescriptor` method
  // https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
  objectGetOwnPropertyDescriptor.f = DESCRIPTORS$7 ? nativeGetOwnPropertyDescriptor$1 : function getOwnPropertyDescriptor(O, P) {
    O = toIndexedObject$4(O);
    P = toPrimitive$3(P, true);
    if (IE8_DOM_DEFINE$1) try {
      return nativeGetOwnPropertyDescriptor$1(O, P);
    } catch (error) { /* empty */ }
    if (has$a(O, P)) return createPropertyDescriptor$3(!propertyIsEnumerableModule.f.call(O, P), O[P]);
  };

  var objectDefineProperty = {};

  var isObject$6 = isObject$9;

  var anObject$7 = function (it) {
    if (!isObject$6(it)) {
      throw TypeError(String(it) + ' is not an object');
    } return it;
  };

  var DESCRIPTORS$6 = descriptors;
  var IE8_DOM_DEFINE = ie8DomDefine;
  var anObject$6 = anObject$7;
  var toPrimitive$2 = toPrimitive$4;

  var nativeDefineProperty$1 = Object.defineProperty;

  // `Object.defineProperty` method
  // https://tc39.es/ecma262/#sec-object.defineproperty
  objectDefineProperty.f = DESCRIPTORS$6 ? nativeDefineProperty$1 : function defineProperty(O, P, Attributes) {
    anObject$6(O);
    P = toPrimitive$2(P, true);
    anObject$6(Attributes);
    if (IE8_DOM_DEFINE) try {
      return nativeDefineProperty$1(O, P, Attributes);
    } catch (error) { /* empty */ }
    if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
    if ('value' in Attributes) O[P] = Attributes.value;
    return O;
  };

  var DESCRIPTORS$5 = descriptors;
  var definePropertyModule$5 = objectDefineProperty;
  var createPropertyDescriptor$2 = createPropertyDescriptor$4;

  var createNonEnumerableProperty$9 = DESCRIPTORS$5 ? function (object, key, value) {
    return definePropertyModule$5.f(object, key, createPropertyDescriptor$2(1, value));
  } : function (object, key, value) {
    object[key] = value;
    return object;
  };

  var redefine$5 = {exports: {}};

  var global$i = global$k;
  var createNonEnumerableProperty$8 = createNonEnumerableProperty$9;

  var setGlobal$3 = function (key, value) {
    try {
      createNonEnumerableProperty$8(global$i, key, value);
    } catch (error) {
      global$i[key] = value;
    } return value;
  };

  var global$h = global$k;
  var setGlobal$2 = setGlobal$3;

  var SHARED = '__core-js_shared__';
  var store$3 = global$h[SHARED] || setGlobal$2(SHARED, {});

  var sharedStore = store$3;

  var store$2 = sharedStore;

  var functionToString = Function.toString;

  // this helper broken in `3.4.1-3.4.4`, so we can't use `shared` helper
  if (typeof store$2.inspectSource != 'function') {
    store$2.inspectSource = function (it) {
      return functionToString.call(it);
    };
  }

  var inspectSource$2 = store$2.inspectSource;

  var global$g = global$k;
  var inspectSource$1 = inspectSource$2;

  var WeakMap$1 = global$g.WeakMap;

  var nativeWeakMap = typeof WeakMap$1 === 'function' && /native code/.test(inspectSource$1(WeakMap$1));

  var shared$3 = {exports: {}};

  var store$1 = sharedStore;

  (shared$3.exports = function (key, value) {
    return store$1[key] || (store$1[key] = value !== undefined ? value : {});
  })('versions', []).push({
    version: '3.9.1',
    mode: 'global',
    copyright: '© 2021 Denis Pushkarev (zloirock.ru)'
  });

  var id = 0;
  var postfix = Math.random();

  var uid$3 = function (key) {
    return 'Symbol(' + String(key === undefined ? '' : key) + ')_' + (++id + postfix).toString(36);
  };

  var shared$2 = shared$3.exports;
  var uid$2 = uid$3;

  var keys$1 = shared$2('keys');

  var sharedKey$3 = function (key) {
    return keys$1[key] || (keys$1[key] = uid$2(key));
  };

  var hiddenKeys$4 = {};

  var NATIVE_WEAK_MAP = nativeWeakMap;
  var global$f = global$k;
  var isObject$5 = isObject$9;
  var createNonEnumerableProperty$7 = createNonEnumerableProperty$9;
  var objectHas = has$b;
  var shared$1 = sharedStore;
  var sharedKey$2 = sharedKey$3;
  var hiddenKeys$3 = hiddenKeys$4;

  var WeakMap = global$f.WeakMap;
  var set$1, get$1, has$9;

  var enforce = function (it) {
    return has$9(it) ? get$1(it) : set$1(it, {});
  };

  var getterFor = function (TYPE) {
    return function (it) {
      var state;
      if (!isObject$5(it) || (state = get$1(it)).type !== TYPE) {
        throw TypeError('Incompatible receiver, ' + TYPE + ' required');
      } return state;
    };
  };

  if (NATIVE_WEAK_MAP) {
    var store = shared$1.state || (shared$1.state = new WeakMap());
    var wmget = store.get;
    var wmhas = store.has;
    var wmset = store.set;
    set$1 = function (it, metadata) {
      metadata.facade = it;
      wmset.call(store, it, metadata);
      return metadata;
    };
    get$1 = function (it) {
      return wmget.call(store, it) || {};
    };
    has$9 = function (it) {
      return wmhas.call(store, it);
    };
  } else {
    var STATE = sharedKey$2('state');
    hiddenKeys$3[STATE] = true;
    set$1 = function (it, metadata) {
      metadata.facade = it;
      createNonEnumerableProperty$7(it, STATE, metadata);
      return metadata;
    };
    get$1 = function (it) {
      return objectHas(it, STATE) ? it[STATE] : {};
    };
    has$9 = function (it) {
      return objectHas(it, STATE);
    };
  }

  var internalState = {
    set: set$1,
    get: get$1,
    has: has$9,
    enforce: enforce,
    getterFor: getterFor
  };

  var global$e = global$k;
  var createNonEnumerableProperty$6 = createNonEnumerableProperty$9;
  var has$8 = has$b;
  var setGlobal$1 = setGlobal$3;
  var inspectSource = inspectSource$2;
  var InternalStateModule$3 = internalState;

  var getInternalState$3 = InternalStateModule$3.get;
  var enforceInternalState = InternalStateModule$3.enforce;
  var TEMPLATE = String(String).split('String');

  (redefine$5.exports = function (O, key, value, options) {
    var unsafe = options ? !!options.unsafe : false;
    var simple = options ? !!options.enumerable : false;
    var noTargetGet = options ? !!options.noTargetGet : false;
    var state;
    if (typeof value == 'function') {
      if (typeof key == 'string' && !has$8(value, 'name')) {
        createNonEnumerableProperty$6(value, 'name', key);
      }
      state = enforceInternalState(value);
      if (!state.source) {
        state.source = TEMPLATE.join(typeof key == 'string' ? key : '');
      }
    }
    if (O === global$e) {
      if (simple) O[key] = value;
      else setGlobal$1(key, value);
      return;
    } else if (!unsafe) {
      delete O[key];
    } else if (!noTargetGet && O[key]) {
      simple = true;
    }
    if (simple) O[key] = value;
    else createNonEnumerableProperty$6(O, key, value);
  // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
  })(Function.prototype, 'toString', function toString() {
    return typeof this == 'function' && getInternalState$3(this).source || inspectSource(this);
  });

  var global$d = global$k;

  var path$1 = global$d;

  var path = path$1;
  var global$c = global$k;

  var aFunction$5 = function (variable) {
    return typeof variable == 'function' ? variable : undefined;
  };

  var getBuiltIn$4 = function (namespace, method) {
    return arguments.length < 2 ? aFunction$5(path[namespace]) || aFunction$5(global$c[namespace])
      : path[namespace] && path[namespace][method] || global$c[namespace] && global$c[namespace][method];
  };

  var objectGetOwnPropertyNames = {};

  var ceil = Math.ceil;
  var floor$2 = Math.floor;

  // `ToInteger` abstract operation
  // https://tc39.es/ecma262/#sec-tointeger
  var toInteger$6 = function (argument) {
    return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor$2 : ceil)(argument);
  };

  var toInteger$5 = toInteger$6;

  var min$3 = Math.min;

  // `ToLength` abstract operation
  // https://tc39.es/ecma262/#sec-tolength
  var toLength$d = function (argument) {
    return argument > 0 ? min$3(toInteger$5(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
  };

  var toInteger$4 = toInteger$6;

  var max = Math.max;
  var min$2 = Math.min;

  // Helper for a popular repeating case of the spec:
  // Let integer be ? ToInteger(index).
  // If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
  var toAbsoluteIndex$5 = function (index, length) {
    var integer = toInteger$4(index);
    return integer < 0 ? max(integer + length, 0) : min$2(integer, length);
  };

  var toIndexedObject$3 = toIndexedObject$5;
  var toLength$c = toLength$d;
  var toAbsoluteIndex$4 = toAbsoluteIndex$5;

  // `Array.prototype.{ indexOf, includes }` methods implementation
  var createMethod$2 = function (IS_INCLUDES) {
    return function ($this, el, fromIndex) {
      var O = toIndexedObject$3($this);
      var length = toLength$c(O.length);
      var index = toAbsoluteIndex$4(fromIndex, length);
      var value;
      // Array#includes uses SameValueZero equality algorithm
      // eslint-disable-next-line no-self-compare -- NaN check
      if (IS_INCLUDES && el != el) while (length > index) {
        value = O[index++];
        // eslint-disable-next-line no-self-compare -- NaN check
        if (value != value) return true;
      // Array#indexOf ignores holes, Array#includes - not
      } else for (;length > index; index++) {
        if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
      } return !IS_INCLUDES && -1;
    };
  };

  var arrayIncludes = {
    // `Array.prototype.includes` method
    // https://tc39.es/ecma262/#sec-array.prototype.includes
    includes: createMethod$2(true),
    // `Array.prototype.indexOf` method
    // https://tc39.es/ecma262/#sec-array.prototype.indexof
    indexOf: createMethod$2(false)
  };

  var has$7 = has$b;
  var toIndexedObject$2 = toIndexedObject$5;
  var indexOf = arrayIncludes.indexOf;
  var hiddenKeys$2 = hiddenKeys$4;

  var objectKeysInternal = function (object, names) {
    var O = toIndexedObject$2(object);
    var i = 0;
    var result = [];
    var key;
    for (key in O) !has$7(hiddenKeys$2, key) && has$7(O, key) && result.push(key);
    // Don't enum bug & hidden keys
    while (names.length > i) if (has$7(O, key = names[i++])) {
      ~indexOf(result, key) || result.push(key);
    }
    return result;
  };

  // IE8- don't enum bug keys
  var enumBugKeys$3 = [
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf'
  ];

  var internalObjectKeys$1 = objectKeysInternal;
  var enumBugKeys$2 = enumBugKeys$3;

  var hiddenKeys$1 = enumBugKeys$2.concat('length', 'prototype');

  // `Object.getOwnPropertyNames` method
  // https://tc39.es/ecma262/#sec-object.getownpropertynames
  objectGetOwnPropertyNames.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
    return internalObjectKeys$1(O, hiddenKeys$1);
  };

  var objectGetOwnPropertySymbols = {};

  objectGetOwnPropertySymbols.f = Object.getOwnPropertySymbols;

  var getBuiltIn$3 = getBuiltIn$4;
  var getOwnPropertyNamesModule = objectGetOwnPropertyNames;
  var getOwnPropertySymbolsModule = objectGetOwnPropertySymbols;
  var anObject$5 = anObject$7;

  // all object keys, includes non-enumerable and symbols
  var ownKeys$1 = getBuiltIn$3('Reflect', 'ownKeys') || function ownKeys(it) {
    var keys = getOwnPropertyNamesModule.f(anObject$5(it));
    var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
    return getOwnPropertySymbols ? keys.concat(getOwnPropertySymbols(it)) : keys;
  };

  var has$6 = has$b;
  var ownKeys = ownKeys$1;
  var getOwnPropertyDescriptorModule$1 = objectGetOwnPropertyDescriptor;
  var definePropertyModule$4 = objectDefineProperty;

  var copyConstructorProperties$1 = function (target, source) {
    var keys = ownKeys(source);
    var defineProperty = definePropertyModule$4.f;
    var getOwnPropertyDescriptor = getOwnPropertyDescriptorModule$1.f;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!has$6(target, key)) defineProperty(target, key, getOwnPropertyDescriptor(source, key));
    }
  };

  var fails$e = fails$i;

  var replacement = /#|\.prototype\./;

  var isForced$1 = function (feature, detection) {
    var value = data[normalize(feature)];
    return value == POLYFILL ? true
      : value == NATIVE ? false
      : typeof detection == 'function' ? fails$e(detection)
      : !!detection;
  };

  var normalize = isForced$1.normalize = function (string) {
    return String(string).replace(replacement, '.').toLowerCase();
  };

  var data = isForced$1.data = {};
  var NATIVE = isForced$1.NATIVE = 'N';
  var POLYFILL = isForced$1.POLYFILL = 'P';

  var isForced_1 = isForced$1;

  var global$b = global$k;
  var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;
  var createNonEnumerableProperty$5 = createNonEnumerableProperty$9;
  var redefine$4 = redefine$5.exports;
  var setGlobal = setGlobal$3;
  var copyConstructorProperties = copyConstructorProperties$1;
  var isForced = isForced_1;

  /*
    options.target      - name of the target object
    options.global      - target is the global object
    options.stat        - export as static methods of target
    options.proto       - export as prototype methods of target
    options.real        - real prototype method for the `pure` version
    options.forced      - export even if the native feature is available
    options.bind        - bind methods to the target, required for the `pure` version
    options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
    options.unsafe      - use the simple assignment of property instead of delete + defineProperty
    options.sham        - add a flag to not completely full polyfills
    options.enumerable  - export as enumerable property
    options.noTargetGet - prevent calling a getter on target
  */
  var _export = function (options, source) {
    var TARGET = options.target;
    var GLOBAL = options.global;
    var STATIC = options.stat;
    var FORCED, target, key, targetProperty, sourceProperty, descriptor;
    if (GLOBAL) {
      target = global$b;
    } else if (STATIC) {
      target = global$b[TARGET] || setGlobal(TARGET, {});
    } else {
      target = (global$b[TARGET] || {}).prototype;
    }
    if (target) for (key in source) {
      sourceProperty = source[key];
      if (options.noTargetGet) {
        descriptor = getOwnPropertyDescriptor(target, key);
        targetProperty = descriptor && descriptor.value;
      } else targetProperty = target[key];
      FORCED = isForced(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
      // contained in target
      if (!FORCED && targetProperty !== undefined) {
        if (typeof sourceProperty === typeof targetProperty) continue;
        copyConstructorProperties(sourceProperty, targetProperty);
      }
      // add a flag to not completely full polyfills
      if (options.sham || (targetProperty && targetProperty.sham)) {
        createNonEnumerableProperty$5(sourceProperty, 'sham', true);
      }
      // extend global
      redefine$4(target, key, sourceProperty, options);
    }
  };

  var aFunction$4 = function (it) {
    if (typeof it != 'function') {
      throw TypeError(String(it) + ' is not a function');
    } return it;
  };

  var aFunction$3 = aFunction$4;

  // optional / simple context binding
  var functionBindContext = function (fn, that, length) {
    aFunction$3(fn);
    if (that === undefined) return fn;
    switch (length) {
      case 0: return function () {
        return fn.call(that);
      };
      case 1: return function (a) {
        return fn.call(that, a);
      };
      case 2: return function (a, b) {
        return fn.call(that, a, b);
      };
      case 3: return function (a, b, c) {
        return fn.call(that, a, b, c);
      };
    }
    return function (/* ...args */) {
      return fn.apply(that, arguments);
    };
  };

  var requireObjectCoercible = requireObjectCoercible$2;

  // `ToObject` abstract operation
  // https://tc39.es/ecma262/#sec-toobject
  var toObject$9 = function (argument) {
    return Object(requireObjectCoercible(argument));
  };

  var classof$6 = classofRaw$1;

  // `IsArray` abstract operation
  // https://tc39.es/ecma262/#sec-isarray
  var isArray$2 = Array.isArray || function isArray(arg) {
    return classof$6(arg) == 'Array';
  };

  var classof$5 = classofRaw$1;
  var global$a = global$k;

  var engineIsNode = classof$5(global$a.process) == 'process';

  var getBuiltIn$2 = getBuiltIn$4;

  var engineUserAgent = getBuiltIn$2('navigator', 'userAgent') || '';

  var global$9 = global$k;
  var userAgent = engineUserAgent;

  var process = global$9.process;
  var versions = process && process.versions;
  var v8 = versions && versions.v8;
  var match, version;

  if (v8) {
    match = v8.split('.');
    version = match[0] + match[1];
  } else if (userAgent) {
    match = userAgent.match(/Edge\/(\d+)/);
    if (!match || match[1] >= 74) {
      match = userAgent.match(/Chrome\/(\d+)/);
      if (match) version = match[1];
    }
  }

  var engineV8Version = version && +version;

  var IS_NODE = engineIsNode;
  var V8_VERSION$1 = engineV8Version;
  var fails$d = fails$i;

  var nativeSymbol = !!Object.getOwnPropertySymbols && !fails$d(function () {
    /* global Symbol -- required for testing */
    return !Symbol.sham &&
      // Chrome 38 Symbol has incorrect toString conversion
      // Chrome 38-40 symbols are not inherited from DOM collections prototypes to instances
      (IS_NODE ? V8_VERSION$1 === 38 : V8_VERSION$1 > 37 && V8_VERSION$1 < 41);
  });

  var NATIVE_SYMBOL$1 = nativeSymbol;

  var useSymbolAsUid = NATIVE_SYMBOL$1
    /* global Symbol -- safe */
    && !Symbol.sham
    && typeof Symbol.iterator == 'symbol';

  var global$8 = global$k;
  var shared = shared$3.exports;
  var has$5 = has$b;
  var uid$1 = uid$3;
  var NATIVE_SYMBOL = nativeSymbol;
  var USE_SYMBOL_AS_UID = useSymbolAsUid;

  var WellKnownSymbolsStore = shared('wks');
  var Symbol$1 = global$8.Symbol;
  var createWellKnownSymbol = USE_SYMBOL_AS_UID ? Symbol$1 : Symbol$1 && Symbol$1.withoutSetter || uid$1;

  var wellKnownSymbol$f = function (name) {
    if (!has$5(WellKnownSymbolsStore, name) || !(NATIVE_SYMBOL || typeof WellKnownSymbolsStore[name] == 'string')) {
      if (NATIVE_SYMBOL && has$5(Symbol$1, name)) {
        WellKnownSymbolsStore[name] = Symbol$1[name];
      } else {
        WellKnownSymbolsStore[name] = createWellKnownSymbol('Symbol.' + name);
      }
    } return WellKnownSymbolsStore[name];
  };

  var isObject$4 = isObject$9;
  var isArray$1 = isArray$2;
  var wellKnownSymbol$e = wellKnownSymbol$f;

  var SPECIES$3 = wellKnownSymbol$e('species');

  // `ArraySpeciesCreate` abstract operation
  // https://tc39.es/ecma262/#sec-arrayspeciescreate
  var arraySpeciesCreate$1 = function (originalArray, length) {
    var C;
    if (isArray$1(originalArray)) {
      C = originalArray.constructor;
      // cross-realm fallback
      if (typeof C == 'function' && (C === Array || isArray$1(C.prototype))) C = undefined;
      else if (isObject$4(C)) {
        C = C[SPECIES$3];
        if (C === null) C = undefined;
      }
    } return new (C === undefined ? Array : C)(length === 0 ? 0 : length);
  };

  var bind$1 = functionBindContext;
  var IndexedObject$1 = indexedObject;
  var toObject$8 = toObject$9;
  var toLength$b = toLength$d;
  var arraySpeciesCreate = arraySpeciesCreate$1;

  var push = [].push;

  // `Array.prototype.{ forEach, map, filter, some, every, find, findIndex, filterOut }` methods implementation
  var createMethod$1 = function (TYPE) {
    var IS_MAP = TYPE == 1;
    var IS_FILTER = TYPE == 2;
    var IS_SOME = TYPE == 3;
    var IS_EVERY = TYPE == 4;
    var IS_FIND_INDEX = TYPE == 6;
    var IS_FILTER_OUT = TYPE == 7;
    var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
    return function ($this, callbackfn, that, specificCreate) {
      var O = toObject$8($this);
      var self = IndexedObject$1(O);
      var boundFunction = bind$1(callbackfn, that, 3);
      var length = toLength$b(self.length);
      var index = 0;
      var create = specificCreate || arraySpeciesCreate;
      var target = IS_MAP ? create($this, length) : IS_FILTER || IS_FILTER_OUT ? create($this, 0) : undefined;
      var value, result;
      for (;length > index; index++) if (NO_HOLES || index in self) {
        value = self[index];
        result = boundFunction(value, index, O);
        if (TYPE) {
          if (IS_MAP) target[index] = result; // map
          else if (result) switch (TYPE) {
            case 3: return true;              // some
            case 5: return value;             // find
            case 6: return index;             // findIndex
            case 2: push.call(target, value); // filter
          } else switch (TYPE) {
            case 4: return false;             // every
            case 7: push.call(target, value); // filterOut
          }
        }
      }
      return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
    };
  };

  var arrayIteration = {
    // `Array.prototype.forEach` method
    // https://tc39.es/ecma262/#sec-array.prototype.foreach
    forEach: createMethod$1(0),
    // `Array.prototype.map` method
    // https://tc39.es/ecma262/#sec-array.prototype.map
    map: createMethod$1(1),
    // `Array.prototype.filter` method
    // https://tc39.es/ecma262/#sec-array.prototype.filter
    filter: createMethod$1(2),
    // `Array.prototype.some` method
    // https://tc39.es/ecma262/#sec-array.prototype.some
    some: createMethod$1(3),
    // `Array.prototype.every` method
    // https://tc39.es/ecma262/#sec-array.prototype.every
    every: createMethod$1(4),
    // `Array.prototype.find` method
    // https://tc39.es/ecma262/#sec-array.prototype.find
    find: createMethod$1(5),
    // `Array.prototype.findIndex` method
    // https://tc39.es/ecma262/#sec-array.prototype.findIndex
    findIndex: createMethod$1(6),
    // `Array.prototype.filterOut` method
    // https://github.com/tc39/proposal-array-filtering
    filterOut: createMethod$1(7)
  };

  var fails$c = fails$i;
  var wellKnownSymbol$d = wellKnownSymbol$f;
  var V8_VERSION = engineV8Version;

  var SPECIES$2 = wellKnownSymbol$d('species');

  var arrayMethodHasSpeciesSupport$1 = function (METHOD_NAME) {
    // We can't use this feature detection in V8 since it causes
    // deoptimization and serious performance degradation
    // https://github.com/zloirock/core-js/issues/677
    return V8_VERSION >= 51 || !fails$c(function () {
      var array = [];
      var constructor = array.constructor = {};
      constructor[SPECIES$2] = function () {
        return { foo: 1 };
      };
      return array[METHOD_NAME](Boolean).foo !== 1;
    });
  };

  var $$8 = _export;
  var $map$1 = arrayIteration.map;
  var arrayMethodHasSpeciesSupport = arrayMethodHasSpeciesSupport$1;

  var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('map');

  // `Array.prototype.map` method
  // https://tc39.es/ecma262/#sec-array.prototype.map
  // with adding support of @@species
  $$8({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT }, {
    map: function map(callbackfn /* , thisArg */) {
      return $map$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    }
  });

  var $$7 = _export;
  var isArray = isArray$2;

  var nativeReverse = [].reverse;
  var test$2 = [1, 2];

  // `Array.prototype.reverse` method
  // https://tc39.es/ecma262/#sec-array.prototype.reverse
  // fix for Safari 12.0 bug
  // https://bugs.webkit.org/show_bug.cgi?id=188794
  $$7({ target: 'Array', proto: true, forced: String(test$2) === String(test$2.reverse()) }, {
    reverse: function reverse() {
      // eslint-disable-next-line no-self-assign -- dirty hack
      if (isArray(this)) this.length = this.length;
      return nativeReverse.call(this);
    }
  });

  var fails$b = fails$i;

  var arrayMethodIsStrict$3 = function (METHOD_NAME, argument) {
    var method = [][METHOD_NAME];
    return !!method && fails$b(function () {
      // eslint-disable-next-line no-useless-call,no-throw-literal -- required for testing
      method.call(null, argument || function () { throw 1; }, 1);
    });
  };

  var $forEach$1 = arrayIteration.forEach;
  var arrayMethodIsStrict$2 = arrayMethodIsStrict$3;

  var STRICT_METHOD$2 = arrayMethodIsStrict$2('forEach');

  // `Array.prototype.forEach` method implementation
  // https://tc39.es/ecma262/#sec-array.prototype.foreach
  var arrayForEach = !STRICT_METHOD$2 ? function forEach(callbackfn /* , thisArg */) {
    return $forEach$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  } : [].forEach;

  var $$6 = _export;
  var forEach$1 = arrayForEach;

  // `Array.prototype.forEach` method
  // https://tc39.es/ecma262/#sec-array.prototype.foreach
  $$6({ target: 'Array', proto: true, forced: [].forEach != forEach$1 }, {
    forEach: forEach$1
  });

  var $$5 = _export;
  var fails$a = fails$i;
  var toObject$7 = toObject$9;
  var toPrimitive$1 = toPrimitive$4;

  var FORCED$5 = fails$a(function () {
    return new Date(NaN).toJSON() !== null
      || Date.prototype.toJSON.call({ toISOString: function () { return 1; } }) !== 1;
  });

  // `Date.prototype.toJSON` method
  // https://tc39.es/ecma262/#sec-date.prototype.tojson
  $$5({ target: 'Date', proto: true, forced: FORCED$5 }, {
    // eslint-disable-next-line no-unused-vars -- required for `.length`
    toJSON: function toJSON(key) {
      var O = toObject$7(this);
      var pv = toPrimitive$1(O);
      return typeof pv == 'number' && !isFinite(pv) ? null : O.toISOString();
    }
  });

  var $$4 = _export;

  // `URL.prototype.toJSON` method
  // https://url.spec.whatwg.org/#dom-url-tojson
  $$4({ target: 'URL', proto: true, enumerable: true }, {
    toJSON: function toJSON() {
      return URL.prototype.toString.call(this);
    }
  });

  var typedArrayConstructor = {exports: {}};

  var wellKnownSymbol$c = wellKnownSymbol$f;

  var ITERATOR$5 = wellKnownSymbol$c('iterator');
  var SAFE_CLOSING = false;

  try {
    var called = 0;
    var iteratorWithReturn = {
      next: function () {
        return { done: !!called++ };
      },
      'return': function () {
        SAFE_CLOSING = true;
      }
    };
    iteratorWithReturn[ITERATOR$5] = function () {
      return this;
    };
    // eslint-disable-next-line no-throw-literal -- required for testing
    Array.from(iteratorWithReturn, function () { throw 2; });
  } catch (error) { /* empty */ }

  var checkCorrectnessOfIteration$1 = function (exec, SKIP_CLOSING) {
    if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
    var ITERATION_SUPPORT = false;
    try {
      var object = {};
      object[ITERATOR$5] = function () {
        return {
          next: function () {
            return { done: ITERATION_SUPPORT = true };
          }
        };
      };
      exec(object);
    } catch (error) { /* empty */ }
    return ITERATION_SUPPORT;
  };

  var arrayBufferNative = typeof ArrayBuffer !== 'undefined' && typeof DataView !== 'undefined';

  var wellKnownSymbol$b = wellKnownSymbol$f;

  var TO_STRING_TAG$3 = wellKnownSymbol$b('toStringTag');
  var test$1 = {};

  test$1[TO_STRING_TAG$3] = 'z';

  var toStringTagSupport = String(test$1) === '[object z]';

  var TO_STRING_TAG_SUPPORT$2 = toStringTagSupport;
  var classofRaw = classofRaw$1;
  var wellKnownSymbol$a = wellKnownSymbol$f;

  var TO_STRING_TAG$2 = wellKnownSymbol$a('toStringTag');
  // ES3 wrong here
  var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) == 'Arguments';

  // fallback for IE11 Script Access Denied error
  var tryGet = function (it, key) {
    try {
      return it[key];
    } catch (error) { /* empty */ }
  };

  // getting tag from ES6+ `Object.prototype.toString`
  var classof$4 = TO_STRING_TAG_SUPPORT$2 ? classofRaw : function (it) {
    var O, tag, result;
    return it === undefined ? 'Undefined' : it === null ? 'Null'
      // @@toStringTag case
      : typeof (tag = tryGet(O = Object(it), TO_STRING_TAG$2)) == 'string' ? tag
      // builtinTag case
      : CORRECT_ARGUMENTS ? classofRaw(O)
      // ES3 arguments fallback
      : (result = classofRaw(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : result;
  };

  var fails$9 = fails$i;

  var correctPrototypeGetter = !fails$9(function () {
    function F() { /* empty */ }
    F.prototype.constructor = null;
    return Object.getPrototypeOf(new F()) !== F.prototype;
  });

  var has$4 = has$b;
  var toObject$6 = toObject$9;
  var sharedKey$1 = sharedKey$3;
  var CORRECT_PROTOTYPE_GETTER = correctPrototypeGetter;

  var IE_PROTO$1 = sharedKey$1('IE_PROTO');
  var ObjectPrototype$2 = Object.prototype;

  // `Object.getPrototypeOf` method
  // https://tc39.es/ecma262/#sec-object.getprototypeof
  var objectGetPrototypeOf = CORRECT_PROTOTYPE_GETTER ? Object.getPrototypeOf : function (O) {
    O = toObject$6(O);
    if (has$4(O, IE_PROTO$1)) return O[IE_PROTO$1];
    if (typeof O.constructor == 'function' && O instanceof O.constructor) {
      return O.constructor.prototype;
    } return O instanceof Object ? ObjectPrototype$2 : null;
  };

  var isObject$3 = isObject$9;

  var aPossiblePrototype$1 = function (it) {
    if (!isObject$3(it) && it !== null) {
      throw TypeError("Can't set " + String(it) + ' as a prototype');
    } return it;
  };

  /* eslint-disable no-proto -- safe */

  var anObject$4 = anObject$7;
  var aPossiblePrototype = aPossiblePrototype$1;

  // `Object.setPrototypeOf` method
  // https://tc39.es/ecma262/#sec-object.setprototypeof
  // Works with __proto__ only. Old v8 can't work with null proto objects.
  var objectSetPrototypeOf = Object.setPrototypeOf || ('__proto__' in {} ? function () {
    var CORRECT_SETTER = false;
    var test = {};
    var setter;
    try {
      setter = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').set;
      setter.call(test, []);
      CORRECT_SETTER = test instanceof Array;
    } catch (error) { /* empty */ }
    return function setPrototypeOf(O, proto) {
      anObject$4(O);
      aPossiblePrototype(proto);
      if (CORRECT_SETTER) setter.call(O, proto);
      else O.__proto__ = proto;
      return O;
    };
  }() : undefined);

  var NATIVE_ARRAY_BUFFER$1 = arrayBufferNative;
  var DESCRIPTORS$4 = descriptors;
  var global$7 = global$k;
  var isObject$2 = isObject$9;
  var has$3 = has$b;
  var classof$3 = classof$4;
  var createNonEnumerableProperty$4 = createNonEnumerableProperty$9;
  var redefine$3 = redefine$5.exports;
  var defineProperty$2 = objectDefineProperty.f;
  var getPrototypeOf$3 = objectGetPrototypeOf;
  var setPrototypeOf$4 = objectSetPrototypeOf;
  var wellKnownSymbol$9 = wellKnownSymbol$f;
  var uid = uid$3;

  var Int8Array$3 = global$7.Int8Array;
  var Int8ArrayPrototype = Int8Array$3 && Int8Array$3.prototype;
  var Uint8ClampedArray = global$7.Uint8ClampedArray;
  var Uint8ClampedArrayPrototype = Uint8ClampedArray && Uint8ClampedArray.prototype;
  var TypedArray$1 = Int8Array$3 && getPrototypeOf$3(Int8Array$3);
  var TypedArrayPrototype$1 = Int8ArrayPrototype && getPrototypeOf$3(Int8ArrayPrototype);
  var ObjectPrototype$1 = Object.prototype;
  var isPrototypeOf = ObjectPrototype$1.isPrototypeOf;

  var TO_STRING_TAG$1 = wellKnownSymbol$9('toStringTag');
  var TYPED_ARRAY_TAG$1 = uid('TYPED_ARRAY_TAG');
  // Fixing native typed arrays in Opera Presto crashes the browser, see #595
  var NATIVE_ARRAY_BUFFER_VIEWS$2 = NATIVE_ARRAY_BUFFER$1 && !!setPrototypeOf$4 && classof$3(global$7.opera) !== 'Opera';
  var TYPED_ARRAY_TAG_REQIRED = false;
  var NAME;

  var TypedArrayConstructorsList = {
    Int8Array: 1,
    Uint8Array: 1,
    Uint8ClampedArray: 1,
    Int16Array: 2,
    Uint16Array: 2,
    Int32Array: 4,
    Uint32Array: 4,
    Float32Array: 4,
    Float64Array: 8
  };

  var BigIntArrayConstructorsList = {
    BigInt64Array: 8,
    BigUint64Array: 8
  };

  var isView = function isView(it) {
    if (!isObject$2(it)) return false;
    var klass = classof$3(it);
    return klass === 'DataView'
      || has$3(TypedArrayConstructorsList, klass)
      || has$3(BigIntArrayConstructorsList, klass);
  };

  var isTypedArray$1 = function (it) {
    if (!isObject$2(it)) return false;
    var klass = classof$3(it);
    return has$3(TypedArrayConstructorsList, klass)
      || has$3(BigIntArrayConstructorsList, klass);
  };

  var aTypedArray$m = function (it) {
    if (isTypedArray$1(it)) return it;
    throw TypeError('Target is not a typed array');
  };

  var aTypedArrayConstructor$5 = function (C) {
    if (setPrototypeOf$4) {
      if (isPrototypeOf.call(TypedArray$1, C)) return C;
    } else for (var ARRAY in TypedArrayConstructorsList) if (has$3(TypedArrayConstructorsList, NAME)) {
      var TypedArrayConstructor = global$7[ARRAY];
      if (TypedArrayConstructor && (C === TypedArrayConstructor || isPrototypeOf.call(TypedArrayConstructor, C))) {
        return C;
      }
    } throw TypeError('Target is not a typed array constructor');
  };

  var exportTypedArrayMethod$n = function (KEY, property, forced) {
    if (!DESCRIPTORS$4) return;
    if (forced) for (var ARRAY in TypedArrayConstructorsList) {
      var TypedArrayConstructor = global$7[ARRAY];
      if (TypedArrayConstructor && has$3(TypedArrayConstructor.prototype, KEY)) {
        delete TypedArrayConstructor.prototype[KEY];
      }
    }
    if (!TypedArrayPrototype$1[KEY] || forced) {
      redefine$3(TypedArrayPrototype$1, KEY, forced ? property
        : NATIVE_ARRAY_BUFFER_VIEWS$2 && Int8ArrayPrototype[KEY] || property);
    }
  };

  var exportTypedArrayStaticMethod = function (KEY, property, forced) {
    var ARRAY, TypedArrayConstructor;
    if (!DESCRIPTORS$4) return;
    if (setPrototypeOf$4) {
      if (forced) for (ARRAY in TypedArrayConstructorsList) {
        TypedArrayConstructor = global$7[ARRAY];
        if (TypedArrayConstructor && has$3(TypedArrayConstructor, KEY)) {
          delete TypedArrayConstructor[KEY];
        }
      }
      if (!TypedArray$1[KEY] || forced) {
        // V8 ~ Chrome 49-50 `%TypedArray%` methods are non-writable non-configurable
        try {
          return redefine$3(TypedArray$1, KEY, forced ? property : NATIVE_ARRAY_BUFFER_VIEWS$2 && Int8Array$3[KEY] || property);
        } catch (error) { /* empty */ }
      } else return;
    }
    for (ARRAY in TypedArrayConstructorsList) {
      TypedArrayConstructor = global$7[ARRAY];
      if (TypedArrayConstructor && (!TypedArrayConstructor[KEY] || forced)) {
        redefine$3(TypedArrayConstructor, KEY, property);
      }
    }
  };

  for (NAME in TypedArrayConstructorsList) {
    if (!global$7[NAME]) NATIVE_ARRAY_BUFFER_VIEWS$2 = false;
  }

  // WebKit bug - typed arrays constructors prototype is Object.prototype
  if (!NATIVE_ARRAY_BUFFER_VIEWS$2 || typeof TypedArray$1 != 'function' || TypedArray$1 === Function.prototype) {
    // eslint-disable-next-line no-shadow -- safe
    TypedArray$1 = function TypedArray() {
      throw TypeError('Incorrect invocation');
    };
    if (NATIVE_ARRAY_BUFFER_VIEWS$2) for (NAME in TypedArrayConstructorsList) {
      if (global$7[NAME]) setPrototypeOf$4(global$7[NAME], TypedArray$1);
    }
  }

  if (!NATIVE_ARRAY_BUFFER_VIEWS$2 || !TypedArrayPrototype$1 || TypedArrayPrototype$1 === ObjectPrototype$1) {
    TypedArrayPrototype$1 = TypedArray$1.prototype;
    if (NATIVE_ARRAY_BUFFER_VIEWS$2) for (NAME in TypedArrayConstructorsList) {
      if (global$7[NAME]) setPrototypeOf$4(global$7[NAME].prototype, TypedArrayPrototype$1);
    }
  }

  // WebKit bug - one more object in Uint8ClampedArray prototype chain
  if (NATIVE_ARRAY_BUFFER_VIEWS$2 && getPrototypeOf$3(Uint8ClampedArrayPrototype) !== TypedArrayPrototype$1) {
    setPrototypeOf$4(Uint8ClampedArrayPrototype, TypedArrayPrototype$1);
  }

  if (DESCRIPTORS$4 && !has$3(TypedArrayPrototype$1, TO_STRING_TAG$1)) {
    TYPED_ARRAY_TAG_REQIRED = true;
    defineProperty$2(TypedArrayPrototype$1, TO_STRING_TAG$1, { get: function () {
      return isObject$2(this) ? this[TYPED_ARRAY_TAG$1] : undefined;
    } });
    for (NAME in TypedArrayConstructorsList) if (global$7[NAME]) {
      createNonEnumerableProperty$4(global$7[NAME], TYPED_ARRAY_TAG$1, NAME);
    }
  }

  var arrayBufferViewCore = {
    NATIVE_ARRAY_BUFFER_VIEWS: NATIVE_ARRAY_BUFFER_VIEWS$2,
    TYPED_ARRAY_TAG: TYPED_ARRAY_TAG_REQIRED && TYPED_ARRAY_TAG$1,
    aTypedArray: aTypedArray$m,
    aTypedArrayConstructor: aTypedArrayConstructor$5,
    exportTypedArrayMethod: exportTypedArrayMethod$n,
    exportTypedArrayStaticMethod: exportTypedArrayStaticMethod,
    isView: isView,
    isTypedArray: isTypedArray$1,
    TypedArray: TypedArray$1,
    TypedArrayPrototype: TypedArrayPrototype$1
  };

  /* eslint-disable no-new -- required for testing */

  var global$6 = global$k;
  var fails$8 = fails$i;
  var checkCorrectnessOfIteration = checkCorrectnessOfIteration$1;
  var NATIVE_ARRAY_BUFFER_VIEWS$1 = arrayBufferViewCore.NATIVE_ARRAY_BUFFER_VIEWS;

  var ArrayBuffer$3 = global$6.ArrayBuffer;
  var Int8Array$2 = global$6.Int8Array;

  var typedArrayConstructorsRequireWrappers = !NATIVE_ARRAY_BUFFER_VIEWS$1 || !fails$8(function () {
    Int8Array$2(1);
  }) || !fails$8(function () {
    new Int8Array$2(-1);
  }) || !checkCorrectnessOfIteration(function (iterable) {
    new Int8Array$2();
    new Int8Array$2(null);
    new Int8Array$2(1.5);
    new Int8Array$2(iterable);
  }, true) || fails$8(function () {
    // Safari (11+) bug - a reason why even Safari 13 should load a typed array polyfill
    return new Int8Array$2(new ArrayBuffer$3(2), 1, undefined).length !== 1;
  });

  var redefine$2 = redefine$5.exports;

  var redefineAll$1 = function (target, src, options) {
    for (var key in src) redefine$2(target, key, src[key], options);
    return target;
  };

  var anInstance$2 = function (it, Constructor, name) {
    if (!(it instanceof Constructor)) {
      throw TypeError('Incorrect ' + (name ? name + ' ' : '') + 'invocation');
    } return it;
  };

  var toInteger$3 = toInteger$6;
  var toLength$a = toLength$d;

  // `ToIndex` abstract operation
  // https://tc39.es/ecma262/#sec-toindex
  var toIndex$2 = function (it) {
    if (it === undefined) return 0;
    var number = toInteger$3(it);
    var length = toLength$a(number);
    if (number !== length) throw RangeError('Wrong length or index');
    return length;
  };

  // IEEE754 conversions based on https://github.com/feross/ieee754
  var abs = Math.abs;
  var pow = Math.pow;
  var floor$1 = Math.floor;
  var log = Math.log;
  var LN2 = Math.LN2;

  var pack = function (number, mantissaLength, bytes) {
    var buffer = new Array(bytes);
    var exponentLength = bytes * 8 - mantissaLength - 1;
    var eMax = (1 << exponentLength) - 1;
    var eBias = eMax >> 1;
    var rt = mantissaLength === 23 ? pow(2, -24) - pow(2, -77) : 0;
    var sign = number < 0 || number === 0 && 1 / number < 0 ? 1 : 0;
    var index = 0;
    var exponent, mantissa, c;
    number = abs(number);
    // eslint-disable-next-line no-self-compare -- NaN check
    if (number != number || number === Infinity) {
      // eslint-disable-next-line no-self-compare -- NaN check
      mantissa = number != number ? 1 : 0;
      exponent = eMax;
    } else {
      exponent = floor$1(log(number) / LN2);
      if (number * (c = pow(2, -exponent)) < 1) {
        exponent--;
        c *= 2;
      }
      if (exponent + eBias >= 1) {
        number += rt / c;
      } else {
        number += rt * pow(2, 1 - eBias);
      }
      if (number * c >= 2) {
        exponent++;
        c /= 2;
      }
      if (exponent + eBias >= eMax) {
        mantissa = 0;
        exponent = eMax;
      } else if (exponent + eBias >= 1) {
        mantissa = (number * c - 1) * pow(2, mantissaLength);
        exponent = exponent + eBias;
      } else {
        mantissa = number * pow(2, eBias - 1) * pow(2, mantissaLength);
        exponent = 0;
      }
    }
    for (; mantissaLength >= 8; buffer[index++] = mantissa & 255, mantissa /= 256, mantissaLength -= 8);
    exponent = exponent << mantissaLength | mantissa;
    exponentLength += mantissaLength;
    for (; exponentLength > 0; buffer[index++] = exponent & 255, exponent /= 256, exponentLength -= 8);
    buffer[--index] |= sign * 128;
    return buffer;
  };

  var unpack = function (buffer, mantissaLength) {
    var bytes = buffer.length;
    var exponentLength = bytes * 8 - mantissaLength - 1;
    var eMax = (1 << exponentLength) - 1;
    var eBias = eMax >> 1;
    var nBits = exponentLength - 7;
    var index = bytes - 1;
    var sign = buffer[index--];
    var exponent = sign & 127;
    var mantissa;
    sign >>= 7;
    for (; nBits > 0; exponent = exponent * 256 + buffer[index], index--, nBits -= 8);
    mantissa = exponent & (1 << -nBits) - 1;
    exponent >>= -nBits;
    nBits += mantissaLength;
    for (; nBits > 0; mantissa = mantissa * 256 + buffer[index], index--, nBits -= 8);
    if (exponent === 0) {
      exponent = 1 - eBias;
    } else if (exponent === eMax) {
      return mantissa ? NaN : sign ? -Infinity : Infinity;
    } else {
      mantissa = mantissa + pow(2, mantissaLength);
      exponent = exponent - eBias;
    } return (sign ? -1 : 1) * mantissa * pow(2, exponent - mantissaLength);
  };

  var ieee754 = {
    pack: pack,
    unpack: unpack
  };

  var toObject$5 = toObject$9;
  var toAbsoluteIndex$3 = toAbsoluteIndex$5;
  var toLength$9 = toLength$d;

  // `Array.prototype.fill` method implementation
  // https://tc39.es/ecma262/#sec-array.prototype.fill
  var arrayFill$1 = function fill(value /* , start = 0, end = @length */) {
    var O = toObject$5(this);
    var length = toLength$9(O.length);
    var argumentsLength = arguments.length;
    var index = toAbsoluteIndex$3(argumentsLength > 1 ? arguments[1] : undefined, length);
    var end = argumentsLength > 2 ? arguments[2] : undefined;
    var endPos = end === undefined ? length : toAbsoluteIndex$3(end, length);
    while (endPos > index) O[index++] = value;
    return O;
  };

  var defineProperty$1 = objectDefineProperty.f;
  var has$2 = has$b;
  var wellKnownSymbol$8 = wellKnownSymbol$f;

  var TO_STRING_TAG = wellKnownSymbol$8('toStringTag');

  var setToStringTag$3 = function (it, TAG, STATIC) {
    if (it && !has$2(it = STATIC ? it : it.prototype, TO_STRING_TAG)) {
      defineProperty$1(it, TO_STRING_TAG, { configurable: true, value: TAG });
    }
  };

  var global$5 = global$k;
  var DESCRIPTORS$3 = descriptors;
  var NATIVE_ARRAY_BUFFER = arrayBufferNative;
  var createNonEnumerableProperty$3 = createNonEnumerableProperty$9;
  var redefineAll = redefineAll$1;
  var fails$7 = fails$i;
  var anInstance$1 = anInstance$2;
  var toInteger$2 = toInteger$6;
  var toLength$8 = toLength$d;
  var toIndex$1 = toIndex$2;
  var IEEE754 = ieee754;
  var getPrototypeOf$2 = objectGetPrototypeOf;
  var setPrototypeOf$3 = objectSetPrototypeOf;
  var getOwnPropertyNames$1 = objectGetOwnPropertyNames.f;
  var defineProperty = objectDefineProperty.f;
  var arrayFill = arrayFill$1;
  var setToStringTag$2 = setToStringTag$3;
  var InternalStateModule$2 = internalState;

  var getInternalState$2 = InternalStateModule$2.get;
  var setInternalState$2 = InternalStateModule$2.set;
  var ARRAY_BUFFER = 'ArrayBuffer';
  var DATA_VIEW = 'DataView';
  var PROTOTYPE$1 = 'prototype';
  var WRONG_LENGTH$1 = 'Wrong length';
  var WRONG_INDEX = 'Wrong index';
  var NativeArrayBuffer = global$5[ARRAY_BUFFER];
  var $ArrayBuffer = NativeArrayBuffer;
  var $DataView = global$5[DATA_VIEW];
  var $DataViewPrototype = $DataView && $DataView[PROTOTYPE$1];
  var ObjectPrototype = Object.prototype;
  var RangeError$2 = global$5.RangeError;

  var packIEEE754 = IEEE754.pack;
  var unpackIEEE754 = IEEE754.unpack;

  var packInt8 = function (number) {
    return [number & 0xFF];
  };

  var packInt16 = function (number) {
    return [number & 0xFF, number >> 8 & 0xFF];
  };

  var packInt32 = function (number) {
    return [number & 0xFF, number >> 8 & 0xFF, number >> 16 & 0xFF, number >> 24 & 0xFF];
  };

  var unpackInt32 = function (buffer) {
    return buffer[3] << 24 | buffer[2] << 16 | buffer[1] << 8 | buffer[0];
  };

  var packFloat32 = function (number) {
    return packIEEE754(number, 23, 4);
  };

  var packFloat64 = function (number) {
    return packIEEE754(number, 52, 8);
  };

  var addGetter$1 = function (Constructor, key) {
    defineProperty(Constructor[PROTOTYPE$1], key, { get: function () { return getInternalState$2(this)[key]; } });
  };

  var get = function (view, count, index, isLittleEndian) {
    var intIndex = toIndex$1(index);
    var store = getInternalState$2(view);
    if (intIndex + count > store.byteLength) throw RangeError$2(WRONG_INDEX);
    var bytes = getInternalState$2(store.buffer).bytes;
    var start = intIndex + store.byteOffset;
    var pack = bytes.slice(start, start + count);
    return isLittleEndian ? pack : pack.reverse();
  };

  var set = function (view, count, index, conversion, value, isLittleEndian) {
    var intIndex = toIndex$1(index);
    var store = getInternalState$2(view);
    if (intIndex + count > store.byteLength) throw RangeError$2(WRONG_INDEX);
    var bytes = getInternalState$2(store.buffer).bytes;
    var start = intIndex + store.byteOffset;
    var pack = conversion(+value);
    for (var i = 0; i < count; i++) bytes[start + i] = pack[isLittleEndian ? i : count - i - 1];
  };

  if (!NATIVE_ARRAY_BUFFER) {
    $ArrayBuffer = function ArrayBuffer(length) {
      anInstance$1(this, $ArrayBuffer, ARRAY_BUFFER);
      var byteLength = toIndex$1(length);
      setInternalState$2(this, {
        bytes: arrayFill.call(new Array(byteLength), 0),
        byteLength: byteLength
      });
      if (!DESCRIPTORS$3) this.byteLength = byteLength;
    };

    $DataView = function DataView(buffer, byteOffset, byteLength) {
      anInstance$1(this, $DataView, DATA_VIEW);
      anInstance$1(buffer, $ArrayBuffer, DATA_VIEW);
      var bufferLength = getInternalState$2(buffer).byteLength;
      var offset = toInteger$2(byteOffset);
      if (offset < 0 || offset > bufferLength) throw RangeError$2('Wrong offset');
      byteLength = byteLength === undefined ? bufferLength - offset : toLength$8(byteLength);
      if (offset + byteLength > bufferLength) throw RangeError$2(WRONG_LENGTH$1);
      setInternalState$2(this, {
        buffer: buffer,
        byteLength: byteLength,
        byteOffset: offset
      });
      if (!DESCRIPTORS$3) {
        this.buffer = buffer;
        this.byteLength = byteLength;
        this.byteOffset = offset;
      }
    };

    if (DESCRIPTORS$3) {
      addGetter$1($ArrayBuffer, 'byteLength');
      addGetter$1($DataView, 'buffer');
      addGetter$1($DataView, 'byteLength');
      addGetter$1($DataView, 'byteOffset');
    }

    redefineAll($DataView[PROTOTYPE$1], {
      getInt8: function getInt8(byteOffset) {
        return get(this, 1, byteOffset)[0] << 24 >> 24;
      },
      getUint8: function getUint8(byteOffset) {
        return get(this, 1, byteOffset)[0];
      },
      getInt16: function getInt16(byteOffset /* , littleEndian */) {
        var bytes = get(this, 2, byteOffset, arguments.length > 1 ? arguments[1] : undefined);
        return (bytes[1] << 8 | bytes[0]) << 16 >> 16;
      },
      getUint16: function getUint16(byteOffset /* , littleEndian */) {
        var bytes = get(this, 2, byteOffset, arguments.length > 1 ? arguments[1] : undefined);
        return bytes[1] << 8 | bytes[0];
      },
      getInt32: function getInt32(byteOffset /* , littleEndian */) {
        return unpackInt32(get(this, 4, byteOffset, arguments.length > 1 ? arguments[1] : undefined));
      },
      getUint32: function getUint32(byteOffset /* , littleEndian */) {
        return unpackInt32(get(this, 4, byteOffset, arguments.length > 1 ? arguments[1] : undefined)) >>> 0;
      },
      getFloat32: function getFloat32(byteOffset /* , littleEndian */) {
        return unpackIEEE754(get(this, 4, byteOffset, arguments.length > 1 ? arguments[1] : undefined), 23);
      },
      getFloat64: function getFloat64(byteOffset /* , littleEndian */) {
        return unpackIEEE754(get(this, 8, byteOffset, arguments.length > 1 ? arguments[1] : undefined), 52);
      },
      setInt8: function setInt8(byteOffset, value) {
        set(this, 1, byteOffset, packInt8, value);
      },
      setUint8: function setUint8(byteOffset, value) {
        set(this, 1, byteOffset, packInt8, value);
      },
      setInt16: function setInt16(byteOffset, value /* , littleEndian */) {
        set(this, 2, byteOffset, packInt16, value, arguments.length > 2 ? arguments[2] : undefined);
      },
      setUint16: function setUint16(byteOffset, value /* , littleEndian */) {
        set(this, 2, byteOffset, packInt16, value, arguments.length > 2 ? arguments[2] : undefined);
      },
      setInt32: function setInt32(byteOffset, value /* , littleEndian */) {
        set(this, 4, byteOffset, packInt32, value, arguments.length > 2 ? arguments[2] : undefined);
      },
      setUint32: function setUint32(byteOffset, value /* , littleEndian */) {
        set(this, 4, byteOffset, packInt32, value, arguments.length > 2 ? arguments[2] : undefined);
      },
      setFloat32: function setFloat32(byteOffset, value /* , littleEndian */) {
        set(this, 4, byteOffset, packFloat32, value, arguments.length > 2 ? arguments[2] : undefined);
      },
      setFloat64: function setFloat64(byteOffset, value /* , littleEndian */) {
        set(this, 8, byteOffset, packFloat64, value, arguments.length > 2 ? arguments[2] : undefined);
      }
    });
  } else {
    /* eslint-disable no-new -- required for testing */
    if (!fails$7(function () {
      NativeArrayBuffer(1);
    }) || !fails$7(function () {
      new NativeArrayBuffer(-1);
    }) || fails$7(function () {
      new NativeArrayBuffer();
      new NativeArrayBuffer(1.5);
      new NativeArrayBuffer(NaN);
      return NativeArrayBuffer.name != ARRAY_BUFFER;
    })) {
    /* eslint-enable no-new -- required for testing */
      $ArrayBuffer = function ArrayBuffer(length) {
        anInstance$1(this, $ArrayBuffer);
        return new NativeArrayBuffer(toIndex$1(length));
      };
      var ArrayBufferPrototype = $ArrayBuffer[PROTOTYPE$1] = NativeArrayBuffer[PROTOTYPE$1];
      for (var keys = getOwnPropertyNames$1(NativeArrayBuffer), j = 0, key; keys.length > j;) {
        if (!((key = keys[j++]) in $ArrayBuffer)) {
          createNonEnumerableProperty$3($ArrayBuffer, key, NativeArrayBuffer[key]);
        }
      }
      ArrayBufferPrototype.constructor = $ArrayBuffer;
    }

    // WebKit bug - the same parent prototype for typed arrays and data view
    if (setPrototypeOf$3 && getPrototypeOf$2($DataViewPrototype) !== ObjectPrototype) {
      setPrototypeOf$3($DataViewPrototype, ObjectPrototype);
    }

    // iOS Safari 7.x bug
    var testView = new $DataView(new $ArrayBuffer(2));
    var nativeSetInt8 = $DataViewPrototype.setInt8;
    testView.setInt8(0, 2147483648);
    testView.setInt8(1, 2147483649);
    if (testView.getInt8(0) || !testView.getInt8(1)) redefineAll($DataViewPrototype, {
      setInt8: function setInt8(byteOffset, value) {
        nativeSetInt8.call(this, byteOffset, value << 24 >> 24);
      },
      setUint8: function setUint8(byteOffset, value) {
        nativeSetInt8.call(this, byteOffset, value << 24 >> 24);
      }
    }, { unsafe: true });
  }

  setToStringTag$2($ArrayBuffer, ARRAY_BUFFER);
  setToStringTag$2($DataView, DATA_VIEW);

  var arrayBuffer = {
    ArrayBuffer: $ArrayBuffer,
    DataView: $DataView
  };

  var toInteger$1 = toInteger$6;

  var toPositiveInteger$1 = function (it) {
    var result = toInteger$1(it);
    if (result < 0) throw RangeError("The argument can't be less than 0");
    return result;
  };

  var toPositiveInteger = toPositiveInteger$1;

  var toOffset$2 = function (it, BYTES) {
    var offset = toPositiveInteger(it);
    if (offset % BYTES) throw RangeError('Wrong offset');
    return offset;
  };

  var internalObjectKeys = objectKeysInternal;
  var enumBugKeys$1 = enumBugKeys$3;

  // `Object.keys` method
  // https://tc39.es/ecma262/#sec-object.keys
  var objectKeys$1 = Object.keys || function keys(O) {
    return internalObjectKeys(O, enumBugKeys$1);
  };

  var DESCRIPTORS$2 = descriptors;
  var definePropertyModule$3 = objectDefineProperty;
  var anObject$3 = anObject$7;
  var objectKeys = objectKeys$1;

  // `Object.defineProperties` method
  // https://tc39.es/ecma262/#sec-object.defineproperties
  var objectDefineProperties = DESCRIPTORS$2 ? Object.defineProperties : function defineProperties(O, Properties) {
    anObject$3(O);
    var keys = objectKeys(Properties);
    var length = keys.length;
    var index = 0;
    var key;
    while (length > index) definePropertyModule$3.f(O, key = keys[index++], Properties[key]);
    return O;
  };

  var getBuiltIn$1 = getBuiltIn$4;

  var html$1 = getBuiltIn$1('document', 'documentElement');

  var anObject$2 = anObject$7;
  var defineProperties = objectDefineProperties;
  var enumBugKeys = enumBugKeys$3;
  var hiddenKeys = hiddenKeys$4;
  var html = html$1;
  var documentCreateElement = documentCreateElement$1;
  var sharedKey = sharedKey$3;

  var GT = '>';
  var LT = '<';
  var PROTOTYPE = 'prototype';
  var SCRIPT = 'script';
  var IE_PROTO = sharedKey('IE_PROTO');

  var EmptyConstructor = function () { /* empty */ };

  var scriptTag = function (content) {
    return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
  };

  // Create object with fake `null` prototype: use ActiveX Object with cleared prototype
  var NullProtoObjectViaActiveX = function (activeXDocument) {
    activeXDocument.write(scriptTag(''));
    activeXDocument.close();
    var temp = activeXDocument.parentWindow.Object;
    activeXDocument = null; // avoid memory leak
    return temp;
  };

  // Create object with fake `null` prototype: use iframe Object with cleared prototype
  var NullProtoObjectViaIFrame = function () {
    // Thrash, waste and sodomy: IE GC bug
    var iframe = documentCreateElement('iframe');
    var JS = 'java' + SCRIPT + ':';
    var iframeDocument;
    iframe.style.display = 'none';
    html.appendChild(iframe);
    // https://github.com/zloirock/core-js/issues/475
    iframe.src = String(JS);
    iframeDocument = iframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.write(scriptTag('document.F=Object'));
    iframeDocument.close();
    return iframeDocument.F;
  };

  // Check for document.domain and active x support
  // No need to use active x approach when document.domain is not set
  // see https://github.com/es-shims/es5-shim/issues/150
  // variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
  // avoid IE GC bug
  var activeXDocument;
  var NullProtoObject = function () {
    try {
      /* global ActiveXObject -- old IE */
      activeXDocument = document.domain && new ActiveXObject('htmlfile');
    } catch (error) { /* ignore */ }
    NullProtoObject = activeXDocument ? NullProtoObjectViaActiveX(activeXDocument) : NullProtoObjectViaIFrame();
    var length = enumBugKeys.length;
    while (length--) delete NullProtoObject[PROTOTYPE][enumBugKeys[length]];
    return NullProtoObject();
  };

  hiddenKeys[IE_PROTO] = true;

  // `Object.create` method
  // https://tc39.es/ecma262/#sec-object.create
  var objectCreate = Object.create || function create(O, Properties) {
    var result;
    if (O !== null) {
      EmptyConstructor[PROTOTYPE] = anObject$2(O);
      result = new EmptyConstructor();
      EmptyConstructor[PROTOTYPE] = null;
      // add "__proto__" for Object.getPrototypeOf polyfill
      result[IE_PROTO] = O;
    } else result = NullProtoObject();
    return Properties === undefined ? result : defineProperties(result, Properties);
  };

  var iterators = {};

  var classof$2 = classof$4;
  var Iterators$4 = iterators;
  var wellKnownSymbol$7 = wellKnownSymbol$f;

  var ITERATOR$4 = wellKnownSymbol$7('iterator');

  var getIteratorMethod$1 = function (it) {
    if (it != undefined) return it[ITERATOR$4]
      || it['@@iterator']
      || Iterators$4[classof$2(it)];
  };

  var wellKnownSymbol$6 = wellKnownSymbol$f;
  var Iterators$3 = iterators;

  var ITERATOR$3 = wellKnownSymbol$6('iterator');
  var ArrayPrototype$1 = Array.prototype;

  // check on default Array iterator
  var isArrayIteratorMethod$1 = function (it) {
    return it !== undefined && (Iterators$3.Array === it || ArrayPrototype$1[ITERATOR$3] === it);
  };

  var toObject$4 = toObject$9;
  var toLength$7 = toLength$d;
  var getIteratorMethod = getIteratorMethod$1;
  var isArrayIteratorMethod = isArrayIteratorMethod$1;
  var bind = functionBindContext;
  var aTypedArrayConstructor$4 = arrayBufferViewCore.aTypedArrayConstructor;

  var typedArrayFrom$1 = function from(source /* , mapfn, thisArg */) {
    var O = toObject$4(source);
    var argumentsLength = arguments.length;
    var mapfn = argumentsLength > 1 ? arguments[1] : undefined;
    var mapping = mapfn !== undefined;
    var iteratorMethod = getIteratorMethod(O);
    var i, length, result, step, iterator, next;
    if (iteratorMethod != undefined && !isArrayIteratorMethod(iteratorMethod)) {
      iterator = iteratorMethod.call(O);
      next = iterator.next;
      O = [];
      while (!(step = next.call(iterator)).done) {
        O.push(step.value);
      }
    }
    if (mapping && argumentsLength > 2) {
      mapfn = bind(mapfn, arguments[2], 2);
    }
    length = toLength$7(O.length);
    result = new (aTypedArrayConstructor$4(this))(length);
    for (i = 0; length > i; i++) {
      result[i] = mapping ? mapfn(O[i], i) : O[i];
    }
    return result;
  };

  var getBuiltIn = getBuiltIn$4;
  var definePropertyModule$2 = objectDefineProperty;
  var wellKnownSymbol$5 = wellKnownSymbol$f;
  var DESCRIPTORS$1 = descriptors;

  var SPECIES$1 = wellKnownSymbol$5('species');

  var setSpecies$1 = function (CONSTRUCTOR_NAME) {
    var Constructor = getBuiltIn(CONSTRUCTOR_NAME);
    var defineProperty = definePropertyModule$2.f;

    if (DESCRIPTORS$1 && Constructor && !Constructor[SPECIES$1]) {
      defineProperty(Constructor, SPECIES$1, {
        configurable: true,
        get: function () { return this; }
      });
    }
  };

  var isObject$1 = isObject$9;
  var setPrototypeOf$2 = objectSetPrototypeOf;

  // makes subclassing work correct for wrapped built-ins
  var inheritIfRequired$1 = function ($this, dummy, Wrapper) {
    var NewTarget, NewTargetPrototype;
    if (
      // it can work only with native `setPrototypeOf`
      setPrototypeOf$2 &&
      // we haven't completely correct pre-ES6 way for getting `new.target`, so use this
      typeof (NewTarget = dummy.constructor) == 'function' &&
      NewTarget !== Wrapper &&
      isObject$1(NewTargetPrototype = NewTarget.prototype) &&
      NewTargetPrototype !== Wrapper.prototype
    ) setPrototypeOf$2($this, NewTargetPrototype);
    return $this;
  };

  var $$3 = _export;
  var global$4 = global$k;
  var DESCRIPTORS = descriptors;
  var TYPED_ARRAYS_CONSTRUCTORS_REQUIRES_WRAPPERS = typedArrayConstructorsRequireWrappers;
  var ArrayBufferViewCore$m = arrayBufferViewCore;
  var ArrayBufferModule$1 = arrayBuffer;
  var anInstance = anInstance$2;
  var createPropertyDescriptor$1 = createPropertyDescriptor$4;
  var createNonEnumerableProperty$2 = createNonEnumerableProperty$9;
  var toLength$6 = toLength$d;
  var toIndex = toIndex$2;
  var toOffset$1 = toOffset$2;
  var toPrimitive = toPrimitive$4;
  var has$1 = has$b;
  var classof$1 = classof$4;
  var isObject = isObject$9;
  var create$2 = objectCreate;
  var setPrototypeOf$1 = objectSetPrototypeOf;
  var getOwnPropertyNames = objectGetOwnPropertyNames.f;
  var typedArrayFrom = typedArrayFrom$1;
  var forEach = arrayIteration.forEach;
  var setSpecies = setSpecies$1;
  var definePropertyModule$1 = objectDefineProperty;
  var getOwnPropertyDescriptorModule = objectGetOwnPropertyDescriptor;
  var InternalStateModule$1 = internalState;
  var inheritIfRequired = inheritIfRequired$1;

  var getInternalState$1 = InternalStateModule$1.get;
  var setInternalState$1 = InternalStateModule$1.set;
  var nativeDefineProperty = definePropertyModule$1.f;
  var nativeGetOwnPropertyDescriptor = getOwnPropertyDescriptorModule.f;
  var round = Math.round;
  var RangeError$1 = global$4.RangeError;
  var ArrayBuffer$2 = ArrayBufferModule$1.ArrayBuffer;
  var DataView$2 = ArrayBufferModule$1.DataView;
  var NATIVE_ARRAY_BUFFER_VIEWS = ArrayBufferViewCore$m.NATIVE_ARRAY_BUFFER_VIEWS;
  var TYPED_ARRAY_TAG = ArrayBufferViewCore$m.TYPED_ARRAY_TAG;
  var TypedArray = ArrayBufferViewCore$m.TypedArray;
  var TypedArrayPrototype = ArrayBufferViewCore$m.TypedArrayPrototype;
  var aTypedArrayConstructor$3 = ArrayBufferViewCore$m.aTypedArrayConstructor;
  var isTypedArray = ArrayBufferViewCore$m.isTypedArray;
  var BYTES_PER_ELEMENT = 'BYTES_PER_ELEMENT';
  var WRONG_LENGTH = 'Wrong length';

  var fromList = function (C, list) {
    var index = 0;
    var length = list.length;
    var result = new (aTypedArrayConstructor$3(C))(length);
    while (length > index) result[index] = list[index++];
    return result;
  };

  var addGetter = function (it, key) {
    nativeDefineProperty(it, key, { get: function () {
      return getInternalState$1(this)[key];
    } });
  };

  var isArrayBuffer = function (it) {
    var klass;
    return it instanceof ArrayBuffer$2 || (klass = classof$1(it)) == 'ArrayBuffer' || klass == 'SharedArrayBuffer';
  };

  var isTypedArrayIndex = function (target, key) {
    return isTypedArray(target)
      && typeof key != 'symbol'
      && key in target
      && String(+key) == String(key);
  };

  var wrappedGetOwnPropertyDescriptor = function getOwnPropertyDescriptor(target, key) {
    return isTypedArrayIndex(target, key = toPrimitive(key, true))
      ? createPropertyDescriptor$1(2, target[key])
      : nativeGetOwnPropertyDescriptor(target, key);
  };

  var wrappedDefineProperty = function defineProperty(target, key, descriptor) {
    if (isTypedArrayIndex(target, key = toPrimitive(key, true))
      && isObject(descriptor)
      && has$1(descriptor, 'value')
      && !has$1(descriptor, 'get')
      && !has$1(descriptor, 'set')
      // TODO: add validation descriptor w/o calling accessors
      && !descriptor.configurable
      && (!has$1(descriptor, 'writable') || descriptor.writable)
      && (!has$1(descriptor, 'enumerable') || descriptor.enumerable)
    ) {
      target[key] = descriptor.value;
      return target;
    } return nativeDefineProperty(target, key, descriptor);
  };

  if (DESCRIPTORS) {
    if (!NATIVE_ARRAY_BUFFER_VIEWS) {
      getOwnPropertyDescriptorModule.f = wrappedGetOwnPropertyDescriptor;
      definePropertyModule$1.f = wrappedDefineProperty;
      addGetter(TypedArrayPrototype, 'buffer');
      addGetter(TypedArrayPrototype, 'byteOffset');
      addGetter(TypedArrayPrototype, 'byteLength');
      addGetter(TypedArrayPrototype, 'length');
    }

    $$3({ target: 'Object', stat: true, forced: !NATIVE_ARRAY_BUFFER_VIEWS }, {
      getOwnPropertyDescriptor: wrappedGetOwnPropertyDescriptor,
      defineProperty: wrappedDefineProperty
    });

    typedArrayConstructor.exports = function (TYPE, wrapper, CLAMPED) {
      var BYTES = TYPE.match(/\d+$/)[0] / 8;
      var CONSTRUCTOR_NAME = TYPE + (CLAMPED ? 'Clamped' : '') + 'Array';
      var GETTER = 'get' + TYPE;
      var SETTER = 'set' + TYPE;
      var NativeTypedArrayConstructor = global$4[CONSTRUCTOR_NAME];
      var TypedArrayConstructor = NativeTypedArrayConstructor;
      var TypedArrayConstructorPrototype = TypedArrayConstructor && TypedArrayConstructor.prototype;
      var exported = {};

      var getter = function (that, index) {
        var data = getInternalState$1(that);
        return data.view[GETTER](index * BYTES + data.byteOffset, true);
      };

      var setter = function (that, index, value) {
        var data = getInternalState$1(that);
        if (CLAMPED) value = (value = round(value)) < 0 ? 0 : value > 0xFF ? 0xFF : value & 0xFF;
        data.view[SETTER](index * BYTES + data.byteOffset, value, true);
      };

      var addElement = function (that, index) {
        nativeDefineProperty(that, index, {
          get: function () {
            return getter(this, index);
          },
          set: function (value) {
            return setter(this, index, value);
          },
          enumerable: true
        });
      };

      if (!NATIVE_ARRAY_BUFFER_VIEWS) {
        TypedArrayConstructor = wrapper(function (that, data, offset, $length) {
          anInstance(that, TypedArrayConstructor, CONSTRUCTOR_NAME);
          var index = 0;
          var byteOffset = 0;
          var buffer, byteLength, length;
          if (!isObject(data)) {
            length = toIndex(data);
            byteLength = length * BYTES;
            buffer = new ArrayBuffer$2(byteLength);
          } else if (isArrayBuffer(data)) {
            buffer = data;
            byteOffset = toOffset$1(offset, BYTES);
            var $len = data.byteLength;
            if ($length === undefined) {
              if ($len % BYTES) throw RangeError$1(WRONG_LENGTH);
              byteLength = $len - byteOffset;
              if (byteLength < 0) throw RangeError$1(WRONG_LENGTH);
            } else {
              byteLength = toLength$6($length) * BYTES;
              if (byteLength + byteOffset > $len) throw RangeError$1(WRONG_LENGTH);
            }
            length = byteLength / BYTES;
          } else if (isTypedArray(data)) {
            return fromList(TypedArrayConstructor, data);
          } else {
            return typedArrayFrom.call(TypedArrayConstructor, data);
          }
          setInternalState$1(that, {
            buffer: buffer,
            byteOffset: byteOffset,
            byteLength: byteLength,
            length: length,
            view: new DataView$2(buffer)
          });
          while (index < length) addElement(that, index++);
        });

        if (setPrototypeOf$1) setPrototypeOf$1(TypedArrayConstructor, TypedArray);
        TypedArrayConstructorPrototype = TypedArrayConstructor.prototype = create$2(TypedArrayPrototype);
      } else if (TYPED_ARRAYS_CONSTRUCTORS_REQUIRES_WRAPPERS) {
        TypedArrayConstructor = wrapper(function (dummy, data, typedArrayOffset, $length) {
          anInstance(dummy, TypedArrayConstructor, CONSTRUCTOR_NAME);
          return inheritIfRequired(function () {
            if (!isObject(data)) return new NativeTypedArrayConstructor(toIndex(data));
            if (isArrayBuffer(data)) return $length !== undefined
              ? new NativeTypedArrayConstructor(data, toOffset$1(typedArrayOffset, BYTES), $length)
              : typedArrayOffset !== undefined
                ? new NativeTypedArrayConstructor(data, toOffset$1(typedArrayOffset, BYTES))
                : new NativeTypedArrayConstructor(data);
            if (isTypedArray(data)) return fromList(TypedArrayConstructor, data);
            return typedArrayFrom.call(TypedArrayConstructor, data);
          }(), dummy, TypedArrayConstructor);
        });

        if (setPrototypeOf$1) setPrototypeOf$1(TypedArrayConstructor, TypedArray);
        forEach(getOwnPropertyNames(NativeTypedArrayConstructor), function (key) {
          if (!(key in TypedArrayConstructor)) {
            createNonEnumerableProperty$2(TypedArrayConstructor, key, NativeTypedArrayConstructor[key]);
          }
        });
        TypedArrayConstructor.prototype = TypedArrayConstructorPrototype;
      }

      if (TypedArrayConstructorPrototype.constructor !== TypedArrayConstructor) {
        createNonEnumerableProperty$2(TypedArrayConstructorPrototype, 'constructor', TypedArrayConstructor);
      }

      if (TYPED_ARRAY_TAG) {
        createNonEnumerableProperty$2(TypedArrayConstructorPrototype, TYPED_ARRAY_TAG, CONSTRUCTOR_NAME);
      }

      exported[CONSTRUCTOR_NAME] = TypedArrayConstructor;

      $$3({
        global: true, forced: TypedArrayConstructor != NativeTypedArrayConstructor, sham: !NATIVE_ARRAY_BUFFER_VIEWS
      }, exported);

      if (!(BYTES_PER_ELEMENT in TypedArrayConstructor)) {
        createNonEnumerableProperty$2(TypedArrayConstructor, BYTES_PER_ELEMENT, BYTES);
      }

      if (!(BYTES_PER_ELEMENT in TypedArrayConstructorPrototype)) {
        createNonEnumerableProperty$2(TypedArrayConstructorPrototype, BYTES_PER_ELEMENT, BYTES);
      }

      setSpecies(CONSTRUCTOR_NAME);
    };
  } else typedArrayConstructor.exports = function () { /* empty */ };

  var createTypedArrayConstructor$1 = typedArrayConstructor.exports;

  // `Float32Array` constructor
  // https://tc39.es/ecma262/#sec-typedarray-objects
  createTypedArrayConstructor$1('Float32', function (init) {
    return function Float32Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });

  var toObject$3 = toObject$9;
  var toAbsoluteIndex$2 = toAbsoluteIndex$5;
  var toLength$5 = toLength$d;

  var min$1 = Math.min;

  // `Array.prototype.copyWithin` method implementation
  // https://tc39.es/ecma262/#sec-array.prototype.copywithin
  var arrayCopyWithin = [].copyWithin || function copyWithin(target /* = 0 */, start /* = 0, end = @length */) {
    var O = toObject$3(this);
    var len = toLength$5(O.length);
    var to = toAbsoluteIndex$2(target, len);
    var from = toAbsoluteIndex$2(start, len);
    var end = arguments.length > 2 ? arguments[2] : undefined;
    var count = min$1((end === undefined ? len : toAbsoluteIndex$2(end, len)) - from, len - to);
    var inc = 1;
    if (from < to && to < from + count) {
      inc = -1;
      from += count - 1;
      to += count - 1;
    }
    while (count-- > 0) {
      if (from in O) O[to] = O[from];
      else delete O[to];
      to += inc;
      from += inc;
    } return O;
  };

  var ArrayBufferViewCore$l = arrayBufferViewCore;
  var $copyWithin = arrayCopyWithin;

  var aTypedArray$l = ArrayBufferViewCore$l.aTypedArray;
  var exportTypedArrayMethod$m = ArrayBufferViewCore$l.exportTypedArrayMethod;

  // `%TypedArray%.prototype.copyWithin` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.copywithin
  exportTypedArrayMethod$m('copyWithin', function copyWithin(target, start /* , end */) {
    return $copyWithin.call(aTypedArray$l(this), target, start, arguments.length > 2 ? arguments[2] : undefined);
  });

  var ArrayBufferViewCore$k = arrayBufferViewCore;
  var $every = arrayIteration.every;

  var aTypedArray$k = ArrayBufferViewCore$k.aTypedArray;
  var exportTypedArrayMethod$l = ArrayBufferViewCore$k.exportTypedArrayMethod;

  // `%TypedArray%.prototype.every` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.every
  exportTypedArrayMethod$l('every', function every(callbackfn /* , thisArg */) {
    return $every(aTypedArray$k(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  });

  var ArrayBufferViewCore$j = arrayBufferViewCore;
  var $fill = arrayFill$1;

  var aTypedArray$j = ArrayBufferViewCore$j.aTypedArray;
  var exportTypedArrayMethod$k = ArrayBufferViewCore$j.exportTypedArrayMethod;

  // `%TypedArray%.prototype.fill` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.fill
  // eslint-disable-next-line no-unused-vars -- required for `.length`
  exportTypedArrayMethod$k('fill', function fill(value /* , start, end */) {
    return $fill.apply(aTypedArray$j(this), arguments);
  });

  var anObject$1 = anObject$7;
  var aFunction$2 = aFunction$4;
  var wellKnownSymbol$4 = wellKnownSymbol$f;

  var SPECIES = wellKnownSymbol$4('species');

  // `SpeciesConstructor` abstract operation
  // https://tc39.es/ecma262/#sec-speciesconstructor
  var speciesConstructor$5 = function (O, defaultConstructor) {
    var C = anObject$1(O).constructor;
    var S;
    return C === undefined || (S = anObject$1(C)[SPECIES]) == undefined ? defaultConstructor : aFunction$2(S);
  };

  var aTypedArrayConstructor$2 = arrayBufferViewCore.aTypedArrayConstructor;
  var speciesConstructor$4 = speciesConstructor$5;

  var typedArrayFromSpeciesAndList = function (instance, list) {
    var C = speciesConstructor$4(instance, instance.constructor);
    var index = 0;
    var length = list.length;
    var result = new (aTypedArrayConstructor$2(C))(length);
    while (length > index) result[index] = list[index++];
    return result;
  };

  var ArrayBufferViewCore$i = arrayBufferViewCore;
  var $filter = arrayIteration.filter;
  var fromSpeciesAndList = typedArrayFromSpeciesAndList;

  var aTypedArray$i = ArrayBufferViewCore$i.aTypedArray;
  var exportTypedArrayMethod$j = ArrayBufferViewCore$i.exportTypedArrayMethod;

  // `%TypedArray%.prototype.filter` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.filter
  exportTypedArrayMethod$j('filter', function filter(callbackfn /* , thisArg */) {
    var list = $filter(aTypedArray$i(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    return fromSpeciesAndList(this, list);
  });

  var ArrayBufferViewCore$h = arrayBufferViewCore;
  var $find = arrayIteration.find;

  var aTypedArray$h = ArrayBufferViewCore$h.aTypedArray;
  var exportTypedArrayMethod$i = ArrayBufferViewCore$h.exportTypedArrayMethod;

  // `%TypedArray%.prototype.find` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.find
  exportTypedArrayMethod$i('find', function find(predicate /* , thisArg */) {
    return $find(aTypedArray$h(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
  });

  var ArrayBufferViewCore$g = arrayBufferViewCore;
  var $findIndex = arrayIteration.findIndex;

  var aTypedArray$g = ArrayBufferViewCore$g.aTypedArray;
  var exportTypedArrayMethod$h = ArrayBufferViewCore$g.exportTypedArrayMethod;

  // `%TypedArray%.prototype.findIndex` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.findindex
  exportTypedArrayMethod$h('findIndex', function findIndex(predicate /* , thisArg */) {
    return $findIndex(aTypedArray$g(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
  });

  var ArrayBufferViewCore$f = arrayBufferViewCore;
  var $forEach = arrayIteration.forEach;

  var aTypedArray$f = ArrayBufferViewCore$f.aTypedArray;
  var exportTypedArrayMethod$g = ArrayBufferViewCore$f.exportTypedArrayMethod;

  // `%TypedArray%.prototype.forEach` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.foreach
  exportTypedArrayMethod$g('forEach', function forEach(callbackfn /* , thisArg */) {
    $forEach(aTypedArray$f(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  });

  var ArrayBufferViewCore$e = arrayBufferViewCore;
  var $includes = arrayIncludes.includes;

  var aTypedArray$e = ArrayBufferViewCore$e.aTypedArray;
  var exportTypedArrayMethod$f = ArrayBufferViewCore$e.exportTypedArrayMethod;

  // `%TypedArray%.prototype.includes` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.includes
  exportTypedArrayMethod$f('includes', function includes(searchElement /* , fromIndex */) {
    return $includes(aTypedArray$e(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
  });

  var ArrayBufferViewCore$d = arrayBufferViewCore;
  var $indexOf = arrayIncludes.indexOf;

  var aTypedArray$d = ArrayBufferViewCore$d.aTypedArray;
  var exportTypedArrayMethod$e = ArrayBufferViewCore$d.exportTypedArrayMethod;

  // `%TypedArray%.prototype.indexOf` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.indexof
  exportTypedArrayMethod$e('indexOf', function indexOf(searchElement /* , fromIndex */) {
    return $indexOf(aTypedArray$d(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
  });

  var wellKnownSymbol$3 = wellKnownSymbol$f;
  var create$1 = objectCreate;
  var definePropertyModule = objectDefineProperty;

  var UNSCOPABLES = wellKnownSymbol$3('unscopables');
  var ArrayPrototype = Array.prototype;

  // Array.prototype[@@unscopables]
  // https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
  if (ArrayPrototype[UNSCOPABLES] == undefined) {
    definePropertyModule.f(ArrayPrototype, UNSCOPABLES, {
      configurable: true,
      value: create$1(null)
    });
  }

  // add a key to Array.prototype[@@unscopables]
  var addToUnscopables$1 = function (key) {
    ArrayPrototype[UNSCOPABLES][key] = true;
  };

  var fails$6 = fails$i;
  var getPrototypeOf$1 = objectGetPrototypeOf;
  var createNonEnumerableProperty$1 = createNonEnumerableProperty$9;
  var has = has$b;
  var wellKnownSymbol$2 = wellKnownSymbol$f;

  var ITERATOR$2 = wellKnownSymbol$2('iterator');
  var BUGGY_SAFARI_ITERATORS$1 = false;

  var returnThis$2 = function () { return this; };

  // `%IteratorPrototype%` object
  // https://tc39.es/ecma262/#sec-%iteratorprototype%-object
  var IteratorPrototype$2, PrototypeOfArrayIteratorPrototype, arrayIterator;

  if ([].keys) {
    arrayIterator = [].keys();
    // Safari 8 has buggy iterators w/o `next`
    if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS$1 = true;
    else {
      PrototypeOfArrayIteratorPrototype = getPrototypeOf$1(getPrototypeOf$1(arrayIterator));
      if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype$2 = PrototypeOfArrayIteratorPrototype;
    }
  }

  var NEW_ITERATOR_PROTOTYPE = IteratorPrototype$2 == undefined || fails$6(function () {
    var test = {};
    // FF44- legacy iterators case
    return IteratorPrototype$2[ITERATOR$2].call(test) !== test;
  });

  if (NEW_ITERATOR_PROTOTYPE) IteratorPrototype$2 = {};

  // 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
  if (!has(IteratorPrototype$2, ITERATOR$2)) {
    createNonEnumerableProperty$1(IteratorPrototype$2, ITERATOR$2, returnThis$2);
  }

  var iteratorsCore = {
    IteratorPrototype: IteratorPrototype$2,
    BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS$1
  };

  var IteratorPrototype$1 = iteratorsCore.IteratorPrototype;
  var create = objectCreate;
  var createPropertyDescriptor = createPropertyDescriptor$4;
  var setToStringTag$1 = setToStringTag$3;
  var Iterators$2 = iterators;

  var returnThis$1 = function () { return this; };

  var createIteratorConstructor$1 = function (IteratorConstructor, NAME, next) {
    var TO_STRING_TAG = NAME + ' Iterator';
    IteratorConstructor.prototype = create(IteratorPrototype$1, { next: createPropertyDescriptor(1, next) });
    setToStringTag$1(IteratorConstructor, TO_STRING_TAG, false);
    Iterators$2[TO_STRING_TAG] = returnThis$1;
    return IteratorConstructor;
  };

  var $$2 = _export;
  var createIteratorConstructor = createIteratorConstructor$1;
  var getPrototypeOf = objectGetPrototypeOf;
  var setPrototypeOf = objectSetPrototypeOf;
  var setToStringTag = setToStringTag$3;
  var createNonEnumerableProperty = createNonEnumerableProperty$9;
  var redefine$1 = redefine$5.exports;
  var wellKnownSymbol$1 = wellKnownSymbol$f;
  var Iterators$1 = iterators;
  var IteratorsCore = iteratorsCore;

  var IteratorPrototype = IteratorsCore.IteratorPrototype;
  var BUGGY_SAFARI_ITERATORS = IteratorsCore.BUGGY_SAFARI_ITERATORS;
  var ITERATOR$1 = wellKnownSymbol$1('iterator');
  var KEYS = 'keys';
  var VALUES = 'values';
  var ENTRIES = 'entries';

  var returnThis = function () { return this; };

  var defineIterator$1 = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
    createIteratorConstructor(IteratorConstructor, NAME, next);

    var getIterationMethod = function (KIND) {
      if (KIND === DEFAULT && defaultIterator) return defaultIterator;
      if (!BUGGY_SAFARI_ITERATORS && KIND in IterablePrototype) return IterablePrototype[KIND];
      switch (KIND) {
        case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
        case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
        case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
      } return function () { return new IteratorConstructor(this); };
    };

    var TO_STRING_TAG = NAME + ' Iterator';
    var INCORRECT_VALUES_NAME = false;
    var IterablePrototype = Iterable.prototype;
    var nativeIterator = IterablePrototype[ITERATOR$1]
      || IterablePrototype['@@iterator']
      || DEFAULT && IterablePrototype[DEFAULT];
    var defaultIterator = !BUGGY_SAFARI_ITERATORS && nativeIterator || getIterationMethod(DEFAULT);
    var anyNativeIterator = NAME == 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
    var CurrentIteratorPrototype, methods, KEY;

    // fix native
    if (anyNativeIterator) {
      CurrentIteratorPrototype = getPrototypeOf(anyNativeIterator.call(new Iterable()));
      if (IteratorPrototype !== Object.prototype && CurrentIteratorPrototype.next) {
        if (getPrototypeOf(CurrentIteratorPrototype) !== IteratorPrototype) {
          if (setPrototypeOf) {
            setPrototypeOf(CurrentIteratorPrototype, IteratorPrototype);
          } else if (typeof CurrentIteratorPrototype[ITERATOR$1] != 'function') {
            createNonEnumerableProperty(CurrentIteratorPrototype, ITERATOR$1, returnThis);
          }
        }
        // Set @@toStringTag to native iterators
        setToStringTag(CurrentIteratorPrototype, TO_STRING_TAG, true);
      }
    }

    // fix Array#{values, @@iterator}.name in V8 / FF
    if (DEFAULT == VALUES && nativeIterator && nativeIterator.name !== VALUES) {
      INCORRECT_VALUES_NAME = true;
      defaultIterator = function values() { return nativeIterator.call(this); };
    }

    // define iterator
    if (IterablePrototype[ITERATOR$1] !== defaultIterator) {
      createNonEnumerableProperty(IterablePrototype, ITERATOR$1, defaultIterator);
    }
    Iterators$1[NAME] = defaultIterator;

    // export additional methods
    if (DEFAULT) {
      methods = {
        values: getIterationMethod(VALUES),
        keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
        entries: getIterationMethod(ENTRIES)
      };
      if (FORCED) for (KEY in methods) {
        if (BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
          redefine$1(IterablePrototype, KEY, methods[KEY]);
        }
      } else $$2({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME }, methods);
    }

    return methods;
  };

  var toIndexedObject$1 = toIndexedObject$5;
  var addToUnscopables = addToUnscopables$1;
  var Iterators = iterators;
  var InternalStateModule = internalState;
  var defineIterator = defineIterator$1;

  var ARRAY_ITERATOR = 'Array Iterator';
  var setInternalState = InternalStateModule.set;
  var getInternalState = InternalStateModule.getterFor(ARRAY_ITERATOR);

  // `Array.prototype.entries` method
  // https://tc39.es/ecma262/#sec-array.prototype.entries
  // `Array.prototype.keys` method
  // https://tc39.es/ecma262/#sec-array.prototype.keys
  // `Array.prototype.values` method
  // https://tc39.es/ecma262/#sec-array.prototype.values
  // `Array.prototype[@@iterator]` method
  // https://tc39.es/ecma262/#sec-array.prototype-@@iterator
  // `CreateArrayIterator` internal method
  // https://tc39.es/ecma262/#sec-createarrayiterator
  var es_array_iterator = defineIterator(Array, 'Array', function (iterated, kind) {
    setInternalState(this, {
      type: ARRAY_ITERATOR,
      target: toIndexedObject$1(iterated), // target
      index: 0,                          // next index
      kind: kind                         // kind
    });
  // `%ArrayIteratorPrototype%.next` method
  // https://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next
  }, function () {
    var state = getInternalState(this);
    var target = state.target;
    var kind = state.kind;
    var index = state.index++;
    if (!target || index >= target.length) {
      state.target = undefined;
      return { value: undefined, done: true };
    }
    if (kind == 'keys') return { value: index, done: false };
    if (kind == 'values') return { value: target[index], done: false };
    return { value: [index, target[index]], done: false };
  }, 'values');

  // argumentsList[@@iterator] is %ArrayProto_values%
  // https://tc39.es/ecma262/#sec-createunmappedargumentsobject
  // https://tc39.es/ecma262/#sec-createmappedargumentsobject
  Iterators.Arguments = Iterators.Array;

  // https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
  addToUnscopables('keys');
  addToUnscopables('values');
  addToUnscopables('entries');

  var global$3 = global$k;
  var ArrayBufferViewCore$c = arrayBufferViewCore;
  var ArrayIterators = es_array_iterator;
  var wellKnownSymbol = wellKnownSymbol$f;

  var ITERATOR = wellKnownSymbol('iterator');
  var Uint8Array$2 = global$3.Uint8Array;
  var arrayValues = ArrayIterators.values;
  var arrayKeys = ArrayIterators.keys;
  var arrayEntries = ArrayIterators.entries;
  var aTypedArray$c = ArrayBufferViewCore$c.aTypedArray;
  var exportTypedArrayMethod$d = ArrayBufferViewCore$c.exportTypedArrayMethod;
  var nativeTypedArrayIterator = Uint8Array$2 && Uint8Array$2.prototype[ITERATOR];

  var CORRECT_ITER_NAME = !!nativeTypedArrayIterator
    && (nativeTypedArrayIterator.name == 'values' || nativeTypedArrayIterator.name == undefined);

  var typedArrayValues = function values() {
    return arrayValues.call(aTypedArray$c(this));
  };

  // `%TypedArray%.prototype.entries` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.entries
  exportTypedArrayMethod$d('entries', function entries() {
    return arrayEntries.call(aTypedArray$c(this));
  });
  // `%TypedArray%.prototype.keys` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.keys
  exportTypedArrayMethod$d('keys', function keys() {
    return arrayKeys.call(aTypedArray$c(this));
  });
  // `%TypedArray%.prototype.values` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.values
  exportTypedArrayMethod$d('values', typedArrayValues, !CORRECT_ITER_NAME);
  // `%TypedArray%.prototype[@@iterator]` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype-@@iterator
  exportTypedArrayMethod$d(ITERATOR, typedArrayValues, !CORRECT_ITER_NAME);

  var ArrayBufferViewCore$b = arrayBufferViewCore;

  var aTypedArray$b = ArrayBufferViewCore$b.aTypedArray;
  var exportTypedArrayMethod$c = ArrayBufferViewCore$b.exportTypedArrayMethod;
  var $join = [].join;

  // `%TypedArray%.prototype.join` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.join
  // eslint-disable-next-line no-unused-vars -- required for `.length`
  exportTypedArrayMethod$c('join', function join(separator) {
    return $join.apply(aTypedArray$b(this), arguments);
  });

  var toIndexedObject = toIndexedObject$5;
  var toInteger = toInteger$6;
  var toLength$4 = toLength$d;
  var arrayMethodIsStrict$1 = arrayMethodIsStrict$3;

  var min = Math.min;
  var nativeLastIndexOf = [].lastIndexOf;
  var NEGATIVE_ZERO = !!nativeLastIndexOf && 1 / [1].lastIndexOf(1, -0) < 0;
  var STRICT_METHOD$1 = arrayMethodIsStrict$1('lastIndexOf');
  var FORCED$4 = NEGATIVE_ZERO || !STRICT_METHOD$1;

  // `Array.prototype.lastIndexOf` method implementation
  // https://tc39.es/ecma262/#sec-array.prototype.lastindexof
  var arrayLastIndexOf = FORCED$4 ? function lastIndexOf(searchElement /* , fromIndex = @[*-1] */) {
    // convert -0 to +0
    if (NEGATIVE_ZERO) return nativeLastIndexOf.apply(this, arguments) || 0;
    var O = toIndexedObject(this);
    var length = toLength$4(O.length);
    var index = length - 1;
    if (arguments.length > 1) index = min(index, toInteger(arguments[1]));
    if (index < 0) index = length + index;
    for (;index >= 0; index--) if (index in O && O[index] === searchElement) return index || 0;
    return -1;
  } : nativeLastIndexOf;

  var ArrayBufferViewCore$a = arrayBufferViewCore;
  var $lastIndexOf = arrayLastIndexOf;

  var aTypedArray$a = ArrayBufferViewCore$a.aTypedArray;
  var exportTypedArrayMethod$b = ArrayBufferViewCore$a.exportTypedArrayMethod;

  // `%TypedArray%.prototype.lastIndexOf` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.lastindexof
  // eslint-disable-next-line no-unused-vars -- required for `.length`
  exportTypedArrayMethod$b('lastIndexOf', function lastIndexOf(searchElement /* , fromIndex */) {
    return $lastIndexOf.apply(aTypedArray$a(this), arguments);
  });

  var ArrayBufferViewCore$9 = arrayBufferViewCore;
  var $map = arrayIteration.map;
  var speciesConstructor$3 = speciesConstructor$5;

  var aTypedArray$9 = ArrayBufferViewCore$9.aTypedArray;
  var aTypedArrayConstructor$1 = ArrayBufferViewCore$9.aTypedArrayConstructor;
  var exportTypedArrayMethod$a = ArrayBufferViewCore$9.exportTypedArrayMethod;

  // `%TypedArray%.prototype.map` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.map
  exportTypedArrayMethod$a('map', function map(mapfn /* , thisArg */) {
    return $map(aTypedArray$9(this), mapfn, arguments.length > 1 ? arguments[1] : undefined, function (O, length) {
      return new (aTypedArrayConstructor$1(speciesConstructor$3(O, O.constructor)))(length);
    });
  });

  var aFunction$1 = aFunction$4;
  var toObject$2 = toObject$9;
  var IndexedObject = indexedObject;
  var toLength$3 = toLength$d;

  // `Array.prototype.{ reduce, reduceRight }` methods implementation
  var createMethod = function (IS_RIGHT) {
    return function (that, callbackfn, argumentsLength, memo) {
      aFunction$1(callbackfn);
      var O = toObject$2(that);
      var self = IndexedObject(O);
      var length = toLength$3(O.length);
      var index = IS_RIGHT ? length - 1 : 0;
      var i = IS_RIGHT ? -1 : 1;
      if (argumentsLength < 2) while (true) {
        if (index in self) {
          memo = self[index];
          index += i;
          break;
        }
        index += i;
        if (IS_RIGHT ? index < 0 : length <= index) {
          throw TypeError('Reduce of empty array with no initial value');
        }
      }
      for (;IS_RIGHT ? index >= 0 : length > index; index += i) if (index in self) {
        memo = callbackfn(memo, self[index], index, O);
      }
      return memo;
    };
  };

  var arrayReduce = {
    // `Array.prototype.reduce` method
    // https://tc39.es/ecma262/#sec-array.prototype.reduce
    left: createMethod(false),
    // `Array.prototype.reduceRight` method
    // https://tc39.es/ecma262/#sec-array.prototype.reduceright
    right: createMethod(true)
  };

  var ArrayBufferViewCore$8 = arrayBufferViewCore;
  var $reduce = arrayReduce.left;

  var aTypedArray$8 = ArrayBufferViewCore$8.aTypedArray;
  var exportTypedArrayMethod$9 = ArrayBufferViewCore$8.exportTypedArrayMethod;

  // `%TypedArray%.prototype.reduce` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduce
  exportTypedArrayMethod$9('reduce', function reduce(callbackfn /* , initialValue */) {
    return $reduce(aTypedArray$8(this), callbackfn, arguments.length, arguments.length > 1 ? arguments[1] : undefined);
  });

  var ArrayBufferViewCore$7 = arrayBufferViewCore;
  var $reduceRight = arrayReduce.right;

  var aTypedArray$7 = ArrayBufferViewCore$7.aTypedArray;
  var exportTypedArrayMethod$8 = ArrayBufferViewCore$7.exportTypedArrayMethod;

  // `%TypedArray%.prototype.reduceRicht` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduceright
  exportTypedArrayMethod$8('reduceRight', function reduceRight(callbackfn /* , initialValue */) {
    return $reduceRight(aTypedArray$7(this), callbackfn, arguments.length, arguments.length > 1 ? arguments[1] : undefined);
  });

  var ArrayBufferViewCore$6 = arrayBufferViewCore;

  var aTypedArray$6 = ArrayBufferViewCore$6.aTypedArray;
  var exportTypedArrayMethod$7 = ArrayBufferViewCore$6.exportTypedArrayMethod;
  var floor = Math.floor;

  // `%TypedArray%.prototype.reverse` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.reverse
  exportTypedArrayMethod$7('reverse', function reverse() {
    var that = this;
    var length = aTypedArray$6(that).length;
    var middle = floor(length / 2);
    var index = 0;
    var value;
    while (index < middle) {
      value = that[index];
      that[index++] = that[--length];
      that[length] = value;
    } return that;
  });

  var ArrayBufferViewCore$5 = arrayBufferViewCore;
  var toLength$2 = toLength$d;
  var toOffset = toOffset$2;
  var toObject$1 = toObject$9;
  var fails$5 = fails$i;

  var aTypedArray$5 = ArrayBufferViewCore$5.aTypedArray;
  var exportTypedArrayMethod$6 = ArrayBufferViewCore$5.exportTypedArrayMethod;

  var FORCED$3 = fails$5(function () {
    /* global Int8Array -- safe */
    new Int8Array(1).set({});
  });

  // `%TypedArray%.prototype.set` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.set
  exportTypedArrayMethod$6('set', function set(arrayLike /* , offset */) {
    aTypedArray$5(this);
    var offset = toOffset(arguments.length > 1 ? arguments[1] : undefined, 1);
    var length = this.length;
    var src = toObject$1(arrayLike);
    var len = toLength$2(src.length);
    var index = 0;
    if (len + offset > length) throw RangeError('Wrong length');
    while (index < len) this[offset + index] = src[index++];
  }, FORCED$3);

  var ArrayBufferViewCore$4 = arrayBufferViewCore;
  var speciesConstructor$2 = speciesConstructor$5;
  var fails$4 = fails$i;

  var aTypedArray$4 = ArrayBufferViewCore$4.aTypedArray;
  var aTypedArrayConstructor = ArrayBufferViewCore$4.aTypedArrayConstructor;
  var exportTypedArrayMethod$5 = ArrayBufferViewCore$4.exportTypedArrayMethod;
  var $slice$1 = [].slice;

  var FORCED$2 = fails$4(function () {
    /* global Int8Array -- safe */
    new Int8Array(1).slice();
  });

  // `%TypedArray%.prototype.slice` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.slice
  exportTypedArrayMethod$5('slice', function slice(start, end) {
    var list = $slice$1.call(aTypedArray$4(this), start, end);
    var C = speciesConstructor$2(this, this.constructor);
    var index = 0;
    var length = list.length;
    var result = new (aTypedArrayConstructor(C))(length);
    while (length > index) result[index] = list[index++];
    return result;
  }, FORCED$2);

  var ArrayBufferViewCore$3 = arrayBufferViewCore;
  var $some = arrayIteration.some;

  var aTypedArray$3 = ArrayBufferViewCore$3.aTypedArray;
  var exportTypedArrayMethod$4 = ArrayBufferViewCore$3.exportTypedArrayMethod;

  // `%TypedArray%.prototype.some` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.some
  exportTypedArrayMethod$4('some', function some(callbackfn /* , thisArg */) {
    return $some(aTypedArray$3(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  });

  var ArrayBufferViewCore$2 = arrayBufferViewCore;

  var aTypedArray$2 = ArrayBufferViewCore$2.aTypedArray;
  var exportTypedArrayMethod$3 = ArrayBufferViewCore$2.exportTypedArrayMethod;
  var $sort = [].sort;

  // `%TypedArray%.prototype.sort` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.sort
  exportTypedArrayMethod$3('sort', function sort(comparefn) {
    return $sort.call(aTypedArray$2(this), comparefn);
  });

  var ArrayBufferViewCore$1 = arrayBufferViewCore;
  var toLength$1 = toLength$d;
  var toAbsoluteIndex$1 = toAbsoluteIndex$5;
  var speciesConstructor$1 = speciesConstructor$5;

  var aTypedArray$1 = ArrayBufferViewCore$1.aTypedArray;
  var exportTypedArrayMethod$2 = ArrayBufferViewCore$1.exportTypedArrayMethod;

  // `%TypedArray%.prototype.subarray` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.subarray
  exportTypedArrayMethod$2('subarray', function subarray(begin, end) {
    var O = aTypedArray$1(this);
    var length = O.length;
    var beginIndex = toAbsoluteIndex$1(begin, length);
    return new (speciesConstructor$1(O, O.constructor))(
      O.buffer,
      O.byteOffset + beginIndex * O.BYTES_PER_ELEMENT,
      toLength$1((end === undefined ? length : toAbsoluteIndex$1(end, length)) - beginIndex)
    );
  });

  var global$2 = global$k;
  var ArrayBufferViewCore = arrayBufferViewCore;
  var fails$3 = fails$i;

  var Int8Array$1 = global$2.Int8Array;
  var aTypedArray = ArrayBufferViewCore.aTypedArray;
  var exportTypedArrayMethod$1 = ArrayBufferViewCore.exportTypedArrayMethod;
  var $toLocaleString = [].toLocaleString;
  var $slice = [].slice;

  // iOS Safari 6.x fails here
  var TO_LOCALE_STRING_BUG = !!Int8Array$1 && fails$3(function () {
    $toLocaleString.call(new Int8Array$1(1));
  });

  var FORCED$1 = fails$3(function () {
    return [1, 2].toLocaleString() != new Int8Array$1([1, 2]).toLocaleString();
  }) || !fails$3(function () {
    Int8Array$1.prototype.toLocaleString.call([1, 2]);
  });

  // `%TypedArray%.prototype.toLocaleString` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.tolocalestring
  exportTypedArrayMethod$1('toLocaleString', function toLocaleString() {
    return $toLocaleString.apply(TO_LOCALE_STRING_BUG ? $slice.call(aTypedArray(this)) : aTypedArray(this), arguments);
  }, FORCED$1);

  var exportTypedArrayMethod = arrayBufferViewCore.exportTypedArrayMethod;
  var fails$2 = fails$i;
  var global$1 = global$k;

  var Uint8Array$1 = global$1.Uint8Array;
  var Uint8ArrayPrototype = Uint8Array$1 && Uint8Array$1.prototype || {};
  var arrayToString = [].toString;
  var arrayJoin = [].join;

  if (fails$2(function () { arrayToString.call({}); })) {
    arrayToString = function toString() {
      return arrayJoin.call(this);
    };
  }

  var IS_NOT_ARRAY_METHOD = Uint8ArrayPrototype.toString != arrayToString;

  // `%TypedArray%.prototype.toString` method
  // https://tc39.es/ecma262/#sec-%typedarray%.prototype.tostring
  exportTypedArrayMethod('toString', arrayToString, IS_NOT_ARRAY_METHOD);

  var TO_STRING_TAG_SUPPORT$1 = toStringTagSupport;
  var classof = classof$4;

  // `Object.prototype.toString` method implementation
  // https://tc39.es/ecma262/#sec-object.prototype.tostring
  var objectToString = TO_STRING_TAG_SUPPORT$1 ? {}.toString : function toString() {
    return '[object ' + classof(this) + ']';
  };

  var TO_STRING_TAG_SUPPORT = toStringTagSupport;
  var redefine = redefine$5.exports;
  var toString = objectToString;

  // `Object.prototype.toString` method
  // https://tc39.es/ecma262/#sec-object.prototype.tostring
  if (!TO_STRING_TAG_SUPPORT) {
    redefine(Object.prototype, 'toString', toString, { unsafe: true });
  }

  var $$1 = _export;
  var fails$1 = fails$i;
  var ArrayBufferModule = arrayBuffer;
  var anObject = anObject$7;
  var toAbsoluteIndex = toAbsoluteIndex$5;
  var toLength = toLength$d;
  var speciesConstructor = speciesConstructor$5;

  var ArrayBuffer$1 = ArrayBufferModule.ArrayBuffer;
  var DataView$1 = ArrayBufferModule.DataView;
  var nativeArrayBufferSlice = ArrayBuffer$1.prototype.slice;

  var INCORRECT_SLICE = fails$1(function () {
    return !new ArrayBuffer$1(2).slice(1, undefined).byteLength;
  });

  // `ArrayBuffer.prototype.slice` method
  // https://tc39.es/ecma262/#sec-arraybuffer.prototype.slice
  $$1({ target: 'ArrayBuffer', proto: true, unsafe: true, forced: INCORRECT_SLICE }, {
    slice: function slice(start, end) {
      if (nativeArrayBufferSlice !== undefined && end === undefined) {
        return nativeArrayBufferSlice.call(anObject(this), start); // FF fix
      }
      var length = anObject(this).byteLength;
      var first = toAbsoluteIndex(start, length);
      var fin = toAbsoluteIndex(end === undefined ? length : end, length);
      var result = new (speciesConstructor(this, ArrayBuffer$1))(toLength(fin - first));
      var viewSource = new DataView$1(this);
      var viewTarget = new DataView$1(result);
      var index = 0;
      while (first < fin) {
        viewTarget.setUint8(index++, viewSource.getUint8(first++));
      } return result;
    }
  });

  var createTypedArrayConstructor = typedArrayConstructor.exports;

  // `Uint8Array` constructor
  // https://tc39.es/ecma262/#sec-typedarray-objects
  createTypedArrayConstructor('Uint8', function (init) {
    return function Uint8Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });

  var $ = _export;
  var aFunction = aFunction$4;
  var toObject = toObject$9;
  var fails = fails$i;
  var arrayMethodIsStrict = arrayMethodIsStrict$3;

  var test = [];
  var nativeSort = test.sort;

  // IE8-
  var FAILS_ON_UNDEFINED = fails(function () {
    test.sort(undefined);
  });
  // V8 bug
  var FAILS_ON_NULL = fails(function () {
    test.sort(null);
  });
  // Old WebKit
  var STRICT_METHOD = arrayMethodIsStrict('sort');

  var FORCED = FAILS_ON_UNDEFINED || !FAILS_ON_NULL || !STRICT_METHOD;

  // `Array.prototype.sort` method
  // https://tc39.es/ecma262/#sec-array.prototype.sort
  $({ target: 'Array', proto: true, forced: FORCED }, {
    sort: function sort(comparefn) {
      return comparefn === undefined
        ? nativeSort.call(toObject(this))
        : nativeSort.call(toObject(this), aFunction(comparefn));
    }
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function doubleToTwoFloats(value) {
    var high, low, tempHigh;

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

  function mix(x, y, a) {
    return x + (y - x) * a;
  }

  var Vector2 = /*#__PURE__*/function () {
    function Vector2() {
      var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      _classCallCheck(this, Vector2);

      this.x = x;
      this.y = y;
    }

    _createClass(Vector2, [{
      key: "set",
      value: function set(x, y) {
        this.x = x;
        this.y = y;
        return this;
      }
    }, {
      key: "setX",
      value: function setX(x) {
        this.x = x;
        return this;
      }
    }, {
      key: "setY",
      value: function setY(y) {
        this.y = y;
        return this;
      }
    }, {
      key: "clone",
      value: function clone() {
        return new this.constructor(this.x, this.y);
      }
    }, {
      key: "copy",
      value: function copy(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
      }
    }, {
      key: "add",
      value: function add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
      }
    }, {
      key: "addScalar",
      value: function addScalar(s) {
        this.x += s;
        this.y += s;
        return this;
      }
    }, {
      key: "addVectors",
      value: function addVectors(a, b) {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
        return this;
      }
    }, {
      key: "addScaledVector",
      value: function addScaledVector(v, s) {
        this.x += v.x * s;
        this.y += v.y * s;
        return this;
      }
    }, {
      key: "sub",
      value: function sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
      }
    }, {
      key: "subScalar",
      value: function subScalar(s) {
        this.x -= s;
        this.y -= s;
        return this;
      }
    }, {
      key: "subVectors",
      value: function subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        return this;
      }
    }, {
      key: "multiply",
      value: function multiply(v) {
        this.x *= v.x;
        this.y *= v.y;
        return this;
      }
    }, {
      key: "multiplyScalar",
      value: function multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
      }
    }, {
      key: "divide",
      value: function divide(v) {
        this.x /= v.x;
        this.y /= v.y;
        return this;
      }
    }, {
      key: "divideScalar",
      value: function divideScalar(scalar) {
        return this.multiplyScalar(1 / scalar);
      }
    }, {
      key: "dot",
      value: function dot(v) {
        return this.x * v.x + this.y * v.y;
      }
    }, {
      key: "cross",
      value: function cross(v) {
        return this.x * v.y - this.y * v.x;
      }
    }, {
      key: "lengthSq",
      value: function lengthSq() {
        return this.x * this.x + this.y * this.y;
      }
    }, {
      key: "length",
      value: function length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
      }
    }, {
      key: "normalize",
      value: function normalize() {
        return this.divideScalar(this.length() || 1);
      }
    }, {
      key: "angle",
      value: function angle() {
        // computes the angle in radians with respect to the positive x-axis
        var angle = Math.atan2(-this.y, -this.x) + Math.PI;
        return angle;
      }
    }, {
      key: "distanceTo",
      value: function distanceTo(v) {
        return Math.sqrt(this.distanceToSquared(v));
      }
    }, {
      key: "distanceToSquared",
      value: function distanceToSquared(v) {
        var dx = this.x - v.x,
            dy = this.y - v.y;
        return dx * dx + dy * dy;
      }
    }, {
      key: "equals",
      value: function equals(v) {
        return v.x === this.x && v.y === this.y;
      }
    }, {
      key: "rotateAround",
      value: function rotateAround(center, angle) {
        var c = Math.cos(angle),
            s = Math.sin(angle);
        var x = this.x - center.x;
        var y = this.y - center.y;
        this.x = x * c - y * s + center.x;
        this.y = x * s + y * c + center.y;
        return this;
      }
    }, {
      key: "random",
      value: function random() {
        this.x = Math.random();
        this.y = Math.random();
        return this;
      }
    }, {
      key: "floor",
      value: function floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
      }
    }]);

    return Vector2;
  }();

  var RadToDeg = 180 / Math.PI;

  function tessellateLineRound(geometry) {
    if (geometry.type.toLowerCase() !== 'polyline') throw new Error('geometry type is not polyline');
    return geometry.paths.map(_tessellatePath);

    function _tessellatePath(path) {
      if (path.length < 2) {
        console.warn("path's point length < 2, ignored");
        return null;
      }

      var vertices = [],
          indices = [],
          segaments = []; // 0       1     2
      // before  cur  after

      var state = {
        distance: 0,
        d01: new Vector2(),
        //direction
        d12: new Vector2(),
        n01: new Vector2(),
        // normal
        n12: new Vector2(),
        l01: 0,
        // length
        l12: 0
      };
      var v2 = new Vector2();

      for (var i = 0; i < path.length; i++) {
        var before = path[i - 1],
            cur = path[i],
            after = path[i + 1];

        if (!before) {
          v2.set(after[0] - cur[0], after[1] - cur[1]);
          state.l12 = v2.length();
          v2.normalize();
          state.d12.copy(v2);
          state.n12.set(-v2.y, v2.x); // ccw 90

          segaments.push([{
            x: cur[0],
            y: cur[1],
            xOffset: state.n12.x,
            yOffset: state.n12.y,
            distance: state.distance,
            disWidthDelta: 0,
            //拐角圆弧的距离插值数, 以半宽度为基准
            side: 1
          }, {
            x: cur[0],
            y: cur[1],
            xOffset: -state.n12.x,
            yOffset: -state.n12.y,
            distance: state.distance,
            disWidthDelta: 0,
            side: -1
          }]);
        } else if (!after) {
          var distance = state.distance,
              n01 = state.n01;
          segaments.push([{
            x: cur[0],
            y: cur[1],
            xOffset: n01.x,
            yOffset: n01.y,
            distance: distance,
            disWidthDelta: 0,
            side: 1
          }, {
            x: cur[0],
            y: cur[1],
            xOffset: -n01.x,
            yOffset: -n01.y,
            distance: distance,
            disWidthDelta: 0,
            side: -1
          }]);
        } else {
          v2.set(after[0] - cur[0], after[1] - cur[1]);
          state.l12 = v2.length();
          v2.normalize();
          state.d12.copy(v2);
          state.n12.set(-v2.y, v2.x);
          var _n = state.n01,
              n12 = state.n12,
              _distance = state.distance;
          var iscw = _n.cross(n12) <= 0;
          v2.addVectors(_n, n12).normalize();
          v2.multiplyScalar(1 / _n.dot(v2)); // v2 here is offset

          var disWidthDelta = new Vector2().subVectors(v2, _n).length();
          var p1 = void 0,
              p0 = void 0,
              p2 = void 0;

          if (iscw) {
            v2.multiplyScalar(-1);
            p1 = {
              x: cur[0],
              y: cur[1],
              xOffset: v2.x,
              yOffset: v2.y,
              distance: _distance,
              disWidthDelta: null,
              //to do interpolation
              side: -1,
              cw: true,
              n01: _n.clone(),
              n12: n12.clone()
            };
            p0 = {
              x: cur[0],
              y: cur[1],
              xOffset: v2.x + _n.x * 2,
              yOffset: v2.y + _n.y * 2,
              distance: _distance,
              disWidthDelta: -disWidthDelta,
              side: 1
            };
            p2 = {
              x: cur[0],
              y: cur[1],
              xOffset: v2.x + n12.x * 2,
              yOffset: v2.y + n12.y * 2,
              distance: _distance,
              disWidthDelta: +disWidthDelta,
              side: 1
            };
          } else {
            p1 = {
              x: cur[0],
              y: cur[1],
              xOffset: v2.x,
              yOffset: v2.y,
              distance: _distance,
              disWidthDelta: null,
              side: 1,
              cw: false,
              n01: _n.clone(),
              n12: n12.clone()
            };
            p0 = {
              x: cur[0],
              y: cur[1],
              xOffset: v2.x - 2 * _n.x,
              yOffset: v2.y - 2 * _n.y,
              distance: _distance,
              disWidthDelta: -disWidthDelta,
              side: -1
            };
            p2 = {
              x: cur[0],
              y: cur[1],
              xOffset: v2.x - 2 * n12.x,
              yOffset: v2.y - 2 * n12.y,
              distance: _distance,
              disWidthDelta: disWidthDelta,
              side: -1
            };
          }

          segaments.push([p0, p1, p2]);
        } //update state


        state.distance += state.l12;
        state.l01 = state.l12;
        state.l12 = 0;
        state.d01.copy(state.d12);
        state.n01.copy(state.n12);
      }

      while (segaments.length) {
        var pArr0 = segaments.shift();
        var pArr1 = segaments.shift();

        if (pArr1.length === 2) {
          var l = vertices.length;
          vertices.push(pArr0[0], pArr0[1], pArr1[0], pArr1[1]);
          indices.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
        } else {
          var _pArr = _slicedToArray(pArr0, 2),
              s0 = _pArr[0],
              s1 = _pArr[1],
              _pArr2 = _slicedToArray(pArr1, 3),
              _p = _pArr2[0],
              _p2 = _pArr2[1],
              _p3 = _pArr2[2];

          var _n2 = _p2.n01,
              _n3 = _p2.n12,
              cw = _p2.cw,
              xOffset = _p2.xOffset,
              yOffset = _p2.yOffset;
          var _l = vertices.length;

          if (cw) {
            vertices.push(s0, s1, _p, _objectSpread2(_objectSpread2({}, _p2), {}, {
              disWidthDelta: _p.disWidthDelta
            }));
          } else {
            vertices.push(s0, s1, _objectSpread2(_objectSpread2({}, _p2), {}, {
              disWidthDelta: _p.disWidthDelta
            }), _p);
          }

          indices.push(_l, _l + 1, _l + 2, _l + 1, _l + 3, _l + 2);
          var angle = Math.acos(_n2.dot(_n3)) * RadToDeg;
          var per = angle ? Math.ceil(angle / 30) : 0; //Interpolation

          var inters = vecInterpolation(_n2.clone().multiplyScalar(2 * (cw ? 1 : -1)), _n3.clone().multiplyScalar(2 * (cw ? 1 : -1)), _p.disWidthDelta, _p3.disWidthDelta, cw, per + 2);

          for (var _i = 0; _i < inters.length - 1; _i++) {
            var bp = inters[_i],
                ap = inters[_i + 1];
            _l = vertices.length;

            var t1 = _objectSpread2(_objectSpread2({}, _p), {}, {
              xOffset: xOffset + bp.vec.x,
              yOffset: yOffset + bp.vec.y,
              disWidthDelta: bp.val
            }),
                t2 = _objectSpread2(_objectSpread2({}, _p2), {}, {
              disWidthDelta: (bp.val + ap.val) * 0.5
            }),
                t3 = _objectSpread2(_objectSpread2({}, _p), {}, {
              xOffset: xOffset + ap.vec.x,
              yOffset: yOffset + ap.vec.y,
              disWidthDelta: ap.val
            });

            vertices.push(t1, t2, t3);
            cw ? indices.push(_l, _l + 1, _l + 2) : indices.push(_l, _l + 2, _l + 1);
          }

          var v = [_objectSpread2(_objectSpread2({}, _p2), {}, {
            disWidthDelta: _p3.disWidthDelta
          }), _p3];
          cw && v.reverse();
          segaments.unshift(v);
        }
      }

      vertices.forEach(function (v) {
        //the offset is calc in world coord, y axis is upward
        //but offset is use in screen coord, y axis is downward, flip
        v.yOffset *= -1;
        delete v.cw;
        delete v.n01;
        delete v.n12;
      });
      return {
        vertices: vertices,
        indices: indices,
        totalDis: state.distance
      };

      function vecInterpolation(n1, n2, range1, range2) {
        var cw = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;
        var nums = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 5;
        var angle = Math.acos(n1.dot(n2) / (n1.length() * n2.length())) || 0;
        var per = (cw ? -1 : 1) * angle / (nums - 1),
            perVal = (range2 - range1) / (nums - 1);
        var cos = Math.cos(per),
            sin = Math.sin(per);
        var res = [];

        for (var _i2 = 0; _i2 < nums; _i2++) {
          var vec = void 0;

          if (_i2 === 0) {
            vec = {
              x: n1.x,
              y: n1.y
            };
          } else {
            var _before = res[_i2 - 1].vec;
            vec = {
              x: _before.x * cos - _before.y * sin,
              y: _before.x * sin + _before.y * cos
            };
          }

          res.push({
            vec: vec,
            val: perVal * _i2 + range1
          });
        }

        return res;
      }
    }
  }

  function tessellateFlowLine(params) {
    return projection__namespace.load().then(function () {
      var _JSON$parse = JSON.parse(params),
          sr = _JSON$parse.sr,
          geometry = _JSON$parse.geometry;

      sr = new SpatialReference__default['default'](sr);
      geometry = geometryEngine__namespace.simplify(geometry);

      if (!sr.equals(geometry.spatialReference)) {
        geometry = projection__namespace.project(geometry, sr);
      }

      return {
        mesh: tessellateLineRound(geometry),
        extent: geometry.extent.toJSON()
      };
    });
  }
  function createRasterFlowLineMesh(_ref) {
    var data = _ref.data,
        setting = _ref.setting;
    data.data = new Float32Array(data.data);
    var sampler = createSampler(data);
    var paths = buildRasterPaths(setting, sampler, data.width, data.height);

    var _toBuffer = toBuffer(paths),
        buffer1 = _toBuffer.buffer1,
        buffer2 = _toBuffer.buffer2,
        buffer3 = _toBuffer.buffer3;

    return {
      result: {
        buffer1: buffer1.buffer,
        buffer2: buffer2.buffer,
        buffer3: buffer3.buffer
      },
      transferList: [buffer1.buffer, buffer2.buffer, buffer3.buffer]
    };

    function toBuffer(paths) {
      var segmentCount = 0;

      for (var i = 0; i < paths.length; i++) {
        segmentCount += paths[i].length - 1;
      }

      var n = segmentCount * 4;
      var buffer1 = new Float32Array(n);
      var buffer2 = new Float32Array(n);
      var buffer3 = new Float32Array(n);
      var cursor = 0;

      for (var _i3 = 0; _i3 < paths.length; _i3++) {
        var path = paths[_i3];
        var totalTime = path[path.length - 1].t;
        var timeSeed = Math.random();
        var pointCount = path.length;

        for (var j = 0, limit = pointCount - 2; j <= limit; j++) {
          var c = cursor * 4;
          var c1 = c + 1,
              c2 = c + 2,
              c3 = c + 3;
          var p0 = j === 0 ? path[0] : path[j - 1];
          var p1 = path[j];
          var p2 = path[j + 1];
          var p3 = j === limit ? path[j + 1] : path[j + 2];
          buffer1[c] = p0.x;
          buffer1[c1] = p0.y;
          buffer1[c2] = p1.x;
          buffer1[c3] = p1.y;
          buffer2[c] = p2.x;
          buffer2[c1] = p2.y;
          buffer2[c2] = p3.x;
          buffer2[c3] = p3.y;
          buffer3[c] = p1.t;
          buffer3[c1] = p2.t;
          buffer3[c2] = totalTime;
          buffer3[c3] = timeSeed;
          cursor++;
        }
      }

      return {
        buffer1: buffer1,
        buffer2: buffer2,
        buffer3: buffer3
      };
    }

    function buildRasterPaths(setting, sampler, width, height) {
      var result = [];

      var _setting$limitRange = _slicedToArray(setting.limitRange, 4),
          xmin = _setting$limitRange[0],
          xmax = _setting$limitRange[1],
          ymin = _setting$limitRange[2],
          ymax = _setting$limitRange[3];

      var scaleRatio = 1 / setting.lineCollisionWidth;

      if (scaleRatio > 1) {
        // when x < 1, 1 / x increase vary fast
        scaleRatio = Math.min(Math.pow(scaleRatio, 0.5), 10);
      }

      var stencilWidth = Math.round((xmax - xmin) * scaleRatio),
          stencilHeight = Math.round((ymax - ymin) * scaleRatio),
          collideStencil = new Uint8Array(stencilWidth * stencilHeight);
      var f = [];

      for (var i = 0; i < height; i += setting.lineSpacing) {
        if (i !== clamp(i, ymin, ymax)) continue;

        for (var j = 0; j < width; j += setting.lineSpacing) {
          if (j !== clamp(j, xmin, xmax)) continue;
          f.push({
            x: j,
            y: i,
            sort: Math.random()
          });
        }
      }

      f.sort(function (a, b) {
        return a.sort - b.sort;
      });
      var rangeChecker = createRangeCheck(setting.limitRange);

      for (var _i4 = 0, _f = f; _i4 < _f.length; _i4++) {
        var _f$_i = _f[_i4],
            x = _f$_i.x,
            y = _f$_i.y;

        if (Math.random() < setting.density) {
          var points = buildPath(setting, sampler, x, y, collideStencil, stencilWidth, stencilHeight, scaleRatio, setting.limitRange, rangeChecker);

          if (points.length > 2) {
            result.push(points);
          }
        }
      }

      return result;
    }

    function buildPath(setting, sampler, startX, startY, stencil, stencilWidth, stencilHeight, scaleRatio, limitRange, inRange) {
      var points = [];
      var time = 0;
      var curPoint = new Vector2(startX, startY);
      var lastDir = new Vector2();
      var curDir = new Vector2();

      var _vec2 = new Vector2();

      points.push({
        x: startX,
        y: startY,
        t: time
      });

      for (var i = 0; i < setting.verticesPerLine; i++) {
        if (i && !inRange(curPoint.x, curPoint.y)) break;

        var uv = _vec2.set.apply(_vec2, _toConsumableArray(sampler(curPoint.x, curPoint.y))).multiplyScalar(setting.velocityScale);

        var speed = uv.length();
        if (speed < setting.minSpeedThreshold) break;
        curDir.copy(uv).multiplyScalar(1 / speed);

        var nextPoint = _vec2.copy(curPoint).addScaledVector(curDir, setting.segmentLength);

        time += setting.segmentLength / speed;
        if (i && Math.acos(curDir.dot(lastDir)) > setting.maxTurnAngle) break;

        if (setting.mergeLines) {
          var _limitRange = _slicedToArray(limitRange, 4),
              xmin = _limitRange[0];
              _limitRange[1];
              var ymin = _limitRange[2];
              _limitRange[3];

          var x = Math.round((nextPoint.x - xmin) * scaleRatio);
          var y = Math.round((nextPoint.y - ymin) * scaleRatio);
          if (x < 0 || x > stencilWidth - 1 || y < 0 || y > stencilHeight - 1) break;
          var stencilVal = stencil[y * stencilWidth + x];
          if (stencilVal > 0) break;
          stencil[y * stencilWidth + x] = 1;
        }

        points.push({
          x: nextPoint.x,
          y: nextPoint.y,
          t: time
        });
        lastDir.copy(curDir);
        curPoint.copy(nextPoint);
      }

      return points;
    }

    function createSampler(data) {
      var width = data.width,
          height = data.height,
          arr = data.data,
          noDataValue = data.noDataValue; //  00————————10  ——— X
      //  |         |
      //  |  .(x,y) |
      //  |         |
      //  01————————11
      //  |
      //  Y
      //bilinear interpolation

      return function (x, y) {
        var p00 = new Vector2(x, y).floor();
        if (p00.x < 0 || p00.x >= width || p00.y < 0 || p00.y >= height) return [0, 0];
        x -= p00.x;
        y -= p00.y;
        var dx = p00.x < width - 1 ? 1 : 0,
            dy = p00.y < height - 1 ? 1 : 0;
        var i00 = p00.y * width + p00.x;
        var i10 = p00.y * width + (p00.x + dx);
        var i01 = (p00.y + dy) * width + p00.x;
        var i11 = (p00.y + dy) * width + (p00.x + dx);

        var _map = [i00, i01, i10, i11].map(function (index) {
          var value = arr[2 * index];
          return value === noDataValue ? 0 : value;
        }),
            _map2 = _slicedToArray(_map, 4),
            u00 = _map2[0],
            u01 = _map2[1],
            u10 = _map2[2],
            u11 = _map2[3];

        var _map3 = [i00, i01, i10, i11].map(function (index) {
          var value = arr[2 * index + 1];
          return value === noDataValue ? 0 : value;
        }),
            _map4 = _slicedToArray(_map3, 4),
            v00 = _map4[0],
            v01 = _map4[1],
            v10 = _map4[2],
            v11 = _map4[3];

        return [mix(mix(u00, u01, y), mix(u10, u11, y), x), mix(mix(v00, v01, y), mix(v10, v11, y), x)];
      };
    }

    function createRangeCheck(limit) {
      var _limit = _slicedToArray(limit, 4),
          xmin = _limit[0],
          xmax = _limit[1],
          ymin = _limit[2],
          ymax = _limit[3];

      return function (x, y) {
        return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
      };
    }
  }
  function projectTINMesh(_ref2) {
    var data = _ref2.data,
        sourceSR = _ref2.sourceSR,
        targetSR = _ref2.targetSR;
    return projection__namespace.load().then(function () {
      debugger;
      var vertex = new Float32Array(data);
      var sr = new SpatialReference__default['default'](targetSR);
      var projectVertex = new Float32Array(vertex.length * 2);

      for (var i = 0; i < vertex.length; i += 2) {
        var i2 = i * 2,
            i4 = i * 4;
        var point = {
          x: vertex[i2],
          y: vertex[i2 + 1],
          spatialReference: sourceSR
        };
        var projectPoint = projection__namespace.project(point, sr);

        var _doubleToTwoFloats = doubleToTwoFloats(projectPoint.x),
            _doubleToTwoFloats2 = _slicedToArray(_doubleToTwoFloats, 2),
            hx = _doubleToTwoFloats2[0],
            lx = _doubleToTwoFloats2[1];

        var _doubleToTwoFloats3 = doubleToTwoFloats(projectPoint.y),
            _doubleToTwoFloats4 = _slicedToArray(_doubleToTwoFloats3, 2),
            hy = _doubleToTwoFloats4[0],
            ly = _doubleToTwoFloats4[1];

        projectVertex[i4] = hx;
        projectVertex[i4 + 1] = hy;
        projectVertex[i4 + 2] = lx;
        projectVertex[i4 + 3] = ly;
      }

      return {
        result: {
          buffer: projectVertex.buffer
        },
        transferList: [projectVertex.buffer]
      };
    });
  }

  exports.createRasterFlowLineMesh = createRasterFlowLineMesh;
  exports.projectTINMesh = projectTINMesh;
  exports.tessellateFlowLine = tessellateFlowLine;

  Object.defineProperty(exports, '__esModule', { value: true });

});
