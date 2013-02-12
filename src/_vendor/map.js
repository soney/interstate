var Map = (function (root) {
//
// ============== UTILITY FUNCTIONS ============== 
//
var construct = function(constructor, args) {
    var F = function() { return constructor.apply(this, args); }
    F.prototype = constructor.prototype;
    return new F();
};
var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
var slice = ArrayProto.slice,
	toString = ObjProto.toString,
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map;

var eqeqeq = function(a, b) { return a === b; };
// Return the first item in arr equal to item (where equality is defined in equality_check)
var index_of = function(arr, item, start_index, equality_check) {
	equality_check = equality_check || eqeqeq;
	return index_where(arr, function(x) { return equality_check(item, x); }, start_index);
};
// Is a given value an array?
// Delegates to ECMA5's native Array.isArray
var isArray = Array.isArray || function(obj) {
	return toString.call(obj) == '[object Array]';
};
var isString = function(obj) {
	return toString.call(obj) == '[object String]';
};
var extend = function(obj) {
	var i, len = arguments.length;
	for(i = 1; i<len; i++) {
		var source = arguments[i];
		for (var prop in source) {
			obj[prop] = source[prop];
		}
	}
	return obj;
};

var defaulthash = function(key) { return ""+key; };
var get_str_hash_fn = function(prop_name) {
	return function(key) {
		return key[prop_name]();
	};
};
var eqeqeq = function(a, b) { return a === b; };
var Map = function(options) {
	options = extend({
		hash: defaulthash,
		equals: eqeqeq,
		value: {},
		values: [],
		keys: []
	}, options);
	each(options.value, function(v, k) {
		options.keys.push(k);
		options.values.push(v);
	}, this);
	this._equality_check = options.equals;
	this._hash = isString(options.hash) ? get_str_hash_fn(options.hash) : options.hash;

	
	this._khash = {};
	this._ordered_values = [];

	var index = 0;
	each(options.keys, function(k, i) {
		var v = options.values[i];
		var hash = this._hash(k);
		var hash_arr = this._khash[hash];

		var info = { key: k, value: v };
		if(hash_arr) {
			hash_arr.push(info);
		} else {
			this._khash[hash] = [info];
		}
	}, this);
};

(function(my) {
	var proto = my.prototype;
	proto.set = function(key, value) {
		var hash = this._hash(k);
		var hash_arr = this._khash[hash];
		if(hash_arr) {
			for(var i = 0; i<len; i++) {
				var item_i = hash_arr[i];
				if(this._equality_check(item_i.key, key)) {
					item_i.value = value;
					return this;
				}
			}

			hash_arr.push({key: key, value: value});
			return this;
		} else {
			this._khash[hash] = [{key: key, value: value}];
			return this;
		}
	};
	proto.unset = function(key, value) {
		var hash = this._hash(k);
		var hash_arr = this._khash[hash];
		if(hash_arr) {
			for(var i = 0; i<len; i++) {
				var item_i = hash_arr[i];
				if(this._equality_check(item_i.key, key)) {
					hash_arr.splice(i, 1);
					if(len === 1) {
						delete this._khash[hash];
					}
					return this;
				}
			}
		}
		return this;
	};
	proto.get = function(key) {
		var hash = this._hash(k);
		var hash_arr = this._khash[hash];
		if(hash_arr) {
			var len = hash_arr.length;
			for(var i = 0; i<len; i++) {
				var item_i = hash_arr[i];
				if(this._equality_check(item_i.key, key)) {
					return item_i.value;
				}
			}
		}
		return undefined;
	};
}(Map));

return Map;
}(this));
