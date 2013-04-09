/*jslint nomen: true  vars: true */
/*global red,esprima,able,uid,console,window */

var Set = (function (root) {
    "use strict";
    //
    // ============== UTILITY FUNCTIONS ============== 
    //
    var construct = function (constructor, args) {
        var F = function () { return constructor.apply(this, args); };
        F.prototype = constructor.prototype;
        return new F();
    };
    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
    var slice = ArrayProto.slice,
        toString = ObjProto.toString,
        nativeForEach      = ArrayProto.forEach,
        nativeMap          = ArrayProto.map;
    var eqeqeq = function (a, b) { return a === b; };
    // Is a given value an array?
    // Delegates to ECMA5's native Array.isArray
    var isArray = Array.isArray || function (obj) {
        return toString.call(obj) === '[object Array]';
    };
    var isString = function (obj) {
        return toString.call(obj) === '[object String]';
    };
    var extend = function (obj) {
        var i, prop, len = arguments.length;
        for (i = 1; i < len; i += 1) {
            var source = arguments[i];
            for (prop in source) {
                if (source.hasOwnProperty(prop)) {
                    obj[prop] = source[prop];
                }
            }
        }
        return obj;
    };
    
    var defaulthash = function (key) { return key.toString(); };
    var get_str_hash_fn = function (prop_name) {
        return function (key) {
            return key[prop_name]();
        };
    };
    var Set = function (options) {
        options = extend({
            hash: defaulthash,
            equals: eqeqeq,
            value: []
        }, options);
        this._equality_check = options.equals;
        this._hash = isString(options.hash) ? get_str_hash_fn(options.hash) : options.hash;
    
        this._hashed_values = {};
        this.value = [];
        this.add.apply(this, options.value);
    };
    
    (function (my) {
        var proto = my.prototype;
        proto.add = function () {
            var lenj = arguments.length;
            var value_len = this.value.length;
            var info, j;
            for (j = 0; j < lenj; j += 1) {
                var item = arguments[j];
                info = this.add_to_hash(item, value_len);
                if (info) {
                    this.value[value_len] = info;
                    value_len += 1;
                }
            }
            return this;
        };
        proto.add_at = function (index) {
            var lenj = arguments.length;
            var info, i, j;
            for (j = 1; j < lenj; j += 1) {
                var item = arguments[j];
                info = this.add_to_hash(item, index);
                if (info) {
                    this.value.splice(index, 0, info);
                    index += 1;
                }
            }
    
            var len = this.value.length;
            for (i = index; i < len; i += 1) {
                this.value[i].index = i;
            }
    
            return this;
        };
        proto.remove = function () {
            var leni = arguments.length;
            var i, j, k;
            for (i = 0; i < leni; i += 1) {
                var arg = arguments[i];
                var hash_val = this._hash(arg);
    
                var hashed_values = this._hashed_values[hash_val];
                if (hashed_values) {
                    var lenj = hashed_values.length;
                    for (j = 0; j < lenj; j += 1) {
                        var hvj = hashed_values[j];
                        if (this._equality_check(hvj.item, arg)) {
                            if (lenj === 1) {
                                delete this._hashed_values[hash_val];
                            } else {
                                hashed_values.splice(j, 1);
                            }
                            var hvj_index = hvj.index;
                            this.value.splice(hvj_index, 1);
                            var len = this.value.length;
                            for (k = hvj_index; k < len; k += 1) {
                                this.value[k].index = k;
                            }
                            break;
                        }
                    }
                }
            }
            return this;
        };
        proto.contains = function (item) {
            var hash_val = this._hash(item);
            var hash_arr = this._hashed_values[hash_val];
            if (isArray(hash_arr)) {
                var i, len = hash_arr.length, eq = this._equality_check;
                for (i = 0; i < len; i += 1) {
                    if (eq(hash_arr[i].item, item)) {
                        return true;
                    }
                }
                return false;
            } else {
                return false;
            }
        };
        proto.add_to_hash = function (item, index) {
            var hash_val = this._hash(item);
            var hash_arr = this._hashed_values[hash_val];
    
            var info = {
                item: item,
                index: index
            };
            if (isArray(hash_arr)) {
                var i, len = hash_arr.length, eq = this._equality_check;
                for (i = 0; i < len; i += 1) {
                    if (eq(hash_arr[i].item, item)) {
                        return false;
                    }
                }
                hash_arr[i] = info;
            } else {
                this._hashed_values[hash_val] = [info];
            }
            return info;
        };
        proto.each = function (func, context) {
            context = context || window;
            var i;
            for (i = 0; i < this.value.length; i += 1) {
                if (func.call(context, this.value[i].item, i) === false) {
                    break;
                }
            }
            return this;
        };
        proto.len = function () {
            return this.value.length;
        };
        proto.item = function (i) {
            return this.value[i] ? this.value[i].item : undefined;
        };
        proto.toArray = function () {
            var len = this.value.length;
            var rv = [];
            var i;
            for (i = 0; i < len; i += 1) {
                rv[i] = this.value[i].item;
            }
            return rv;
        };
    }(Set));
    
    return Set;
}(this));
