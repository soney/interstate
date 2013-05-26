/*jslint nomen: true, vars: true */
/*global window */

var RedMap = (function (root) {
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
    
    // Establish the object that gets returned to break out of a loop iteration.
    var breaker = {};
    
    // Return a unique id when called
    var uniqueId = (function () {
        var id = 0;
        return function () { id += 1; return id; };
    }());
    
    //Bind a function to a context
    var bind = function (func, context) {
        return function () { return func.apply(context, arguments); };
    };
    
    // Remove every item from an array
    var clear = function (arr) {
        arr.length = 0;
    };
      
    // Is a given value a number?
    var isNumber = function (obj) {
        return toString.call(obj) === '[object Number]';
    };
    
    // Is a given value an array?
    // Delegates to ECMA5's native Array.isArray
    var isArray = Array.isArray || function (obj) {
        return toString.call(obj) === '[object Array]';
    };
      
    // Is a given value a DOM element?
    var isElement = function (obj) {
        return !!(obj && (obj.nodeType === 1 || obj.nodeType === 8 || obj.nodeType === 3));
    };
      
    // Is a given value a function?
    var isFunction = function (obj) {
        return toString.call(obj) === '[object Function]';
    };
    
    var isString = function (obj) {
        return toString.call(obj) === '[object String]';
    };

    var the_o = Object;
    // Is a given variable an object?
    var isObject = function (obj) {
        return obj === the_o(obj);
    };
    
    // Is a given variable an arguments object?
    var isArguments = function (obj) {
        return toString.call(obj) === '[object Arguments]';
    };
     
    // Keep the identity function around for default iterators.
    var identity = function (value) {
        return value;
    };
    
    // Set a constructor's prototype
    var proto_extend = function (subClass, superClass) {
        var F = function () {};
        F.prototype = superClass.prototype;
        subClass.prototype = new F();
        subClass.prototype.constructor = subClass;
        
        subClass.superclass = superClass.prototype;
        if (superClass.prototype.constructor === Object.prototype.constructor) {
            superClass.prototype.constructor = superClass;
        }
    };
    
    var hOP = Object.prototype.hasOwnProperty;
    var has = function (obj, key) {
        return hOP.call(obj, key);
    };
    
    var each = function (obj, iterator, context) {
        var i, key, l;
        if (!obj) { return; }
        if (nativeForEach && obj.forEach === nativeForEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
            for (i = 0, l = obj.length; i < l; i += 1) {
                if (has(obj, i) && iterator.call(context, obj[i], i, obj) === breaker) { return; }
            }
        } else {
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (iterator.call(context, obj[key], key, obj) === breaker) { return; }
                }
            }
        }
    };
    var map = function (obj, iterator, context) {
        var results = [];
        if (!obj) { return results; }
        if (nativeMap && obj.map === nativeMap) { return obj.map(iterator, context); }
        each(obj, function (value, index, list) {
            results[results.length] = iterator.call(context, value, index, list);
        });
        if (obj.length === +obj.length) { results.length = obj.length; }
        return results;
    };
        
    // Retrieve the values of an object's properties.
    var values = function (obj) {
        return map(obj, identity);
    };
    
    // Safely convert anything iterable into a real, live array.
    var toArray = function (obj) {
        if (!obj) { return []; }
        if (isArray(obj)) { return slice.call(obj); }
        if (isArguments(obj)) { return slice.call(obj); }
        if (obj.toArray && isFunction(obj.toArray)) { return obj.toArray(); }
        return values(obj);
    };
    
    var last = function (arr) {
        return arr[arr.length - 1];
    };
    
    var extend = function (obj) {
        var i, prop, len = arguments.length;
        var on_each_func = function (val, prop) {
            obj[prop] = val;
        };
        for (i = 1; i < len; i += 1) {
            each(arguments[i], on_each_func);
        }
        return obj;
    };
        
    // Return the first item in arr where test is true
    var index_where = function (arr, test, start_index) {
        var i, len = arr.length;
        if (isNumber(start_index)) {
            start_index = Math.round(start_index);
        } else {
            start_index = 0;
        }
        for (i = start_index; i < len; i += 1) {
            if (test(arr[i], i)) { return i; }
        }
        return -1;
    };
        
    var eqeqeq = function (a, b) { return a === b; };
    // Return the first item in arr equal to item (where equality is defined in equality_check)
    var index_of = function (arr, item, start_index, equality_check) {
        equality_check = equality_check || eqeqeq;
        return index_where(arr, function (x) { return equality_check(item, x); }, start_index);
    };
        
    // Remove an item in an array
    var remove = function (arr, obj) {
        var index = index_of(arr, obj);
        if (index >= 0) { arr.splice(index, 1); }
        return index;
    };
    // Clone
    var clone = function (obj) {
        if (!isObject(obj)) { return obj; }
        return isArray(obj) ? obj.slice() : extend({}, obj);
    };
    
    var defaulthash = function (key) { return key.toString(); };
    var get_str_hash_fn = function (prop_name) {
        return function (key) {
            return key[prop_name]();
        };
    };
    var Map = function (options) {
        options = extend({
            hash: defaulthash,
            equals: eqeqeq,
            value: {},
            values: [],
            keys: []
        }, options);
        each(options.value, function (v, k) {
            options.keys.push(k);
            options.values.push(v);
        }, this);
        this._equality_check = options.equals;
        this._hash = isString(options.hash) ? get_str_hash_fn(options.hash) : options.hash;
    
        
        this._khash = {};
        this._ordered_values = [];
    
        var index = 0;
        each(options.keys, function (k, i) {
            var v = options.values[i];
            var hash = this._hash(k);
            var hash_arr = this._khash[hash];
    
            var info = { key: k, value: v };
            if (hash_arr) {
                hash_arr.push(info);
            } else {
                this._khash[hash] = [info];
            }
            this._ordered_values[index] = info;
            index += 1;
        }, this);
    };
    
    (function (My) {
        var proto = My.prototype;
        proto.put = function (key, value) {
			var i;
            var hash = this._hash(key),
				hash_arr = this._khash[hash],
                info = {key: key, value: value};

            if (hash_arr) {
                var len = hash_arr.length;
                for (i = 0; i < len; i += 1) {
                    var item_i = hash_arr[i];
                    if (this._equality_check(item_i.key, key)) {
                        item_i.value = value;
                        return this;
                    }
                }
    
                hash_arr.push(info);
                this._ordered_values.push(info);
                return this;
            } else {
                this._khash[hash] = [info];
                this._ordered_values.push(info);
                return this;
            }
        };
        proto.remove = function (key) {
            var i, item_i, len;
            var hash = this._hash(key);
            var hash_arr = this._khash[hash];
            if (hash_arr) {
				len = hash_arr.length;
                for (i = 0; i < len; i += 1) {
                    item_i = hash_arr[i];
                    if (this._equality_check(item_i.key, key)) {
						//console.log(hash_arr, hash);
                        hash_arr.splice(i, 1);
                        if (len === 1) {
                            delete this._khash[hash];
                        }

						//Remove from ordered values before returning
						len = this._ordered_values.length;
						for (i = 0; i < len; i += 1) {
							item_i = this._ordered_values[i];
							if (this._equality_check(item_i.key, key)) {
								this._ordered_values.splice(i, 1);
								i--;
								len--;
							}
						}
                        return this;
                    }
                }
            }
            return this;
        };
        proto.get = function (key) {
            var hash = this._hash(key);
            var hash_arr = this._khash[hash];
            var i;
            if (hash_arr) {
                var len = hash_arr.length;
                for (i = 0; i < len; i += 1) {
                    var item_i = hash_arr[i];
                    if (this._equality_check(item_i.key, key)) {
                        return item_i.value;
                    }
                }
            }
            return undefined;
        };
        proto.has = function (key) {
            var i;
            var hash = this._hash(key);
            var hash_arr = this._khash[hash];
            if (hash_arr) {
                var len = hash_arr.length;
                for (i = 0; i < len; i += 1) {
                    var item_i = hash_arr[i];
                    if (this._equality_check(item_i.key, key)) {
                        return true;
                    }
                }
            }
            return false;
        };
        proto.get_or_put = function (key, create_fn, create_fn_context) {
            var hash = this._hash(key);
            var hash_arr = this._khash[hash];
            var context = create_fn_context || this;
            var value, i, info;
            if (hash_arr) {
                var len = hash_arr.length;
                for (i = 0; i < len; i += 1) {
                    var item_i = hash_arr[i];
                    if (this._equality_check(item_i.key, key)) {
                        return item_i.value;
                    }
                }
                value = create_fn.call(context, key);
                info = {key: key, value: value};
                hash_arr.push(info);
                this._ordered_values.push(info);
                return value;
            } else {
                value = create_fn.call(context, key);
                info = {key: key, value: value};
                this._khash[hash] = [info];
                this._ordered_values.push(info);
                return value;
            }
        };
        proto.keys = function () {
            var i;
            var rv = new Array(this._ordered_values.length);
            for (i = this._ordered_values.length - 1; i >= 0; i -= 1) {
                rv[i] = this._ordered_values[i].key;
            }
            return rv;
        };
        proto.values = function () {
            var i;
            var rv = new Array(this._ordered_values.length);
            for (i = this._ordered_values.length - 1; i >= 0; i -= 1) {
                rv[i] = this._ordered_values[i].value;
            }
            return rv;
        };
        proto.each = function (func, context) {
            context = context || window;
            each(this._ordered_values, function (ov) {
                func.call(context, ov.value, ov.key, ov.index);
            });
            return this;
        };
		proto.destroy = function() {};
    }(Map));
    
    return Map;
}(this));
