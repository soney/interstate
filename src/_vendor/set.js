var Set = (function (root) {
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
var Set = function(options) {
	options = extend({
		hash: defaulthash,
		equals: eqeqeq,
		value: [],
	}, options);
	this._equality_check = options.equals;
	this._hash = isString(options.hash) ? get_str_hash_fn(options.hash) : options.hash;

	this._hashed_values = {};
	this.value = [];
	this.add.apply(this, options.value);
};

(function(my) {
	var proto = my.prototype;
	proto.add = function() {
		var lenj = arguments.length;
		for(var j = 0; j<lenj; j++) {
			var item = arguments[j];
			if(this.add_to_hash(item)) {
				this.value.push(item);
			}
		}
		return this;
	};
	proto.add_at = function(index) {
		var lenj = arguments.length;
		for(var j = 1; j<lenj; j++) {
			var item = arguments[j];
			if(this.add_to_hash(item)) {
				this.value.splice(index, 0, item);
			}
		}
		return this;
	};
	proto.remove = function() {
		var leni = arguments.length;
		var i,j;
		for(i = 0; i<leni; i++) {
			var arg = arguments[i];
			var hash_val = this._hash(arg);

			var hashed_values = this._hashed_values[hash_val];
			if(hashed_values) {
				var lenj = hashed_values.length;
				for(j = 0; j<lenj; j++) {
					if(this._equality_check(hashed_values[j], arg)) {
						if(lenj === 1) {
							delete this._hashed_values[hash_val];
						} else {
							hashed_values.splice(j, 1);
						}
						break;
					}
				}
			}
		}
		return this;
	};
	proto.contains = function(item) {
		var hash_val = this._hash(item);
		var hash_arr = this._hashed_values[hash_val];
		if(isArray(hash_arr)) {
			var i, len = hash_arr.length, eq = this._equality_check;
			for(i = 0; i<len; i++) {
				if(eq(hash_arr[i], item)) {
					return true;
				}
			}
			return false;
		} else {
			return false;
		}
	};
	proto.add_to_hash = function(item) {
		var hash_val = this._hash(item);
		var hash_arr = this._hashed_values[hash_val];
		if(isArray(hash_arr)) {
			var i, len = hash_arr.length, eq = this._equality_check;
			for(i = 0; i<len; i++) {
				if(eq(hash_arr[i], item)) {
					return false;
				}
			}
			hash_arr[i] = item;
		} else {
			this._hashed_values[hash_val] = [item];
		}
		return true;
	};
	proto.each = function(func, context) {
		var context = context || window;
		for(var i = 0; i<this.value.length; i++) {
			if(func.call(context, this.value[i], i) === false) {
				break;
			}
		}
		return this;
	};
	proto.toArray = function() {
		return this.value;
	};
}(Set));

return Set;
}(this));
