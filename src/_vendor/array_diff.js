/*jslint nomen: true, vars: true, plusplus:true */
/*global red,esprima,able,uid,console,window */

var getArrayDiff = (function (root) {
	"use strict";
	//
	// ============== UTILITY FUNCTIONS ============== 
	//
	var construct = function (constructor, args) {
		var F = function () { return constructor.apply(this, args); };
		F.prototype = constructor.prototype;
		return new F();
	};
	var ArrayProto = Array.prototype,
		ObjProto = Object.prototype,
		FuncProto = Function.prototype;

	var slice = ArrayProto.slice,
		toString = ObjProto.toString,
		nativeForEach      = ArrayProto.forEach,
		nativeKeys         = Object.keys,
		nativeMap          = ArrayProto.map;

	var hOP = Object.prototype.hasOwnProperty;
	var has = function (obj, key) {
		return hOP.call(obj, key);
	};

	// Establish the object that gets returned to break out of a loop iteration.
	var breaker = {};

	//Bind a function to a context
	var bind = function (func, context) {
		return function () { return func.apply(context, arguments); };
	};

	var keys = nativeKeys || function (obj) {
		if (obj !== Object(obj)) { throw new TypeError('Invalid object'); }
		var keys = [];
		var key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) {
				keys[keys.length] = key;
			}
		}
		return keys;
	};

	// Retrieve the values of an object's properties.
	var values = function (obj) {
		var values = [];
		var key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) {
				values.push(obj[key]);
			}
		}
		return values;
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

	// Is a given variable an object?
	var isObject = function (obj) {
		return obj === Object(obj);
	};

	// Is a given variable an arguments object?
	var isArguments = function (obj) {
		return toString.call(obj) === '[object Arguments]';
	};
	 
	// Keep the identity function around for default iterators.
	var identity = function (value) {
		return value;
	};

	// Safely convert anything iterable into a real, live array.
	var toArray = function (obj) {
		if (!obj) { return []; }
		if (isArray(obj)) { return slice.call(obj); }
		if (isArguments(obj)) { return slice.call(obj); }
		if (obj.toArray && isFunction(obj.toArray)) { return obj.toArray(); }
		return values(obj);
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

	var extend = function (obj) {
		var args = slice.call(arguments, 1),
			i,
			prop,
			len = args.length;
		for (i = 0; i < len; i += 1) {
			var source = args[i];
			for (prop in source) {
				if (source.hasOwnProperty(prop)) {
					obj[prop] = source[prop];
				}
			}
		}
		return obj;
	};
	var each = function (obj, iterator, context) {
		var i, l, key;
		if (!obj) { return; }
		if (nativeForEach && obj.forEach === nativeForEach) {
			obj.forEach(iterator, context);
		} else if (obj.length === +obj.length) {
			l = obj.length;
			for (i = 0; i < l; i += 1) {
				if (obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj) === breaker) { return; }
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

	var last = function (arr) {
		return arr[arr.length - 1];
	};

	var nativeFilter = Array.prototype.filter;
	var filter = function (obj, iterator, context) {
		var results = [];
		if (!obj) { return results; }
		if (nativeFilter && obj.filter === nativeFilter) { return obj.filter(iterator, context); }
		var i, len = obj.length, value;
		for (i = 0; i < len; i += 1) {
			value = obj[i];
			if (iterator.call(context, value, i, obj)) { results.push(value); }
		}
		return results;
	};

		
	// Clone
	var clone = function (obj) {
		if (!isObject(obj)) { return obj; }
		return isArray(obj) ? obj.slice() : extend({}, obj);
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


	//Longest common subsequence
	//http://rosettacode.org/wiki/Longest_common_subsequence#JavaScript
	var indexed_lcs = (function () {
		var popsym = function (index, x, y, symbols, r, n, equality_check) {
			var s = x[index],
				pos = symbols[s] + 1;
			pos = index_of(y, s, pos > r ? pos : r, equality_check);
			if (pos === -1) { pos = n; }
			symbols[s] = pos;
			return pos;
		};
		return function (x, y, equality_check) {
			var symbols = {}, r = 0, p = 0, p1, L = 0, idx, i, m = x.length, n = y.length, S = new Array(m < n ? n : m);
			if (n === 0 || m === 0) { return []; }
			p1 = popsym(0, x, y, symbols, r, n, equality_check);
			for (i = 0; i < m; i += 1) {
				p = (r === p) ? p1 : popsym(i, x, y, symbols, r, n, equality_check);
				p1 = popsym(i + 1, x, y, symbols, r, n, equality_check);

				if (p > p1) {
					i += 1;
					idx = p1;
				} else {
					idx = p;
				}

				if (idx === n || i === m) {
					p=popsym(i, x, y, symbols, r, n, equality_check);
				} else {
					r = idx;
					S[L] = {item: x[i], indicies: [i, idx]};
					L += 1;
				}
			}
			return S.slice(0,L);
		};
	}());

	var diff = function (x, y, equality_check) {
		equality_check = equality_check || eqeqeq;
		var i,j;
		var x_clone = x.slice(),
			y_clone = y.slice();
		var d = [], xi, yj, x_len = x_clone.length, found;
		for (i = 0; i < x_len; i += 1) {
			found = false;
			xi = x_clone[i];
			for(j = 0; j<y_clone.length; j++) {
				yj = y_clone[j];
				if (equality_check(xi, yj)) {
					found = true;
					y_clone.splice(j, 1);
					break;
				}
			}
			if (found === false) { d.push(xi); }
		}
		return d;
	};
	var dualized_intersection = function (x, y, equality_check) {
		equality_check = equality_check || eqeqeq;
		var i,j;
		var x_clone = x.slice(),
			y_clone = y.slice();
		var d = [], xi, yj, x_len = x_clone.length, found;
		for (i = 0; i < x_len; i += 1) {
			found = false;
			xi = x_clone[i];
			for (j = 0; j < y_clone.length; j += 1) {
				yj = y_clone[j];
				if (equality_check(xi, yj)) {
					d.push([xi, yj]);
					y_clone.splice(j, 1);
					break;
				}
			}
		}
		return d;
	};

	var array_source_map = function (from, to, equality_check) {
		equality_check = equality_check || eqeqeq;
		var item_aware_equality_check = function (a, b) {
			var a_item = a === undefined ? a : a.item;
			var b_item = b === undefined ? b : b.item;
			return equality_check(a_item, b_item);
		};
		var indexed_common_subsequence = map(indexed_lcs(from, to), function (info) { 
			return {item: info.item, from: info.indicies[0], to: info.indicies[1]};
		});

		var indexed_from = map(from, function (x,i) { return {item: x, index: i}; });
		var indexed_to = map(to, function (x,i) { return {item: x, index: i}; });

		var indexed_removed = diff(indexed_from, indexed_common_subsequence, item_aware_equality_check),
			indexed_added = diff(indexed_to, indexed_common_subsequence, item_aware_equality_check),
			indexed_moved = map(dualized_intersection(indexed_removed, indexed_added, item_aware_equality_check),
				function (info) {
					var from = info[0].index,
						from_item = info[0].item,
						to = info[1].index,
						to_item = info[1].item;
					return {item: to_item, from: from, to: to, from_item: from_item, to_item: to_item};
				}
			);
		indexed_added = diff(indexed_added, indexed_moved, item_aware_equality_check);
		indexed_removed = diff(indexed_removed, indexed_moved, item_aware_equality_check);

		var to_mappings = map(to, function (item, index) {
				var info;

				var info_index = index_where(indexed_added, function (info) {
					return info.index === index;
				});
				if (info_index >= 0) {
					info = indexed_added[info_index];
					return { to: index, to_item: item, item: item };
				}

				info_index = index_where(indexed_moved, function (info) {
					return info.to === index;
				});
				if (info_index >= 0) {
					info = indexed_moved[info_index];
					return { to: index, to_item: item, item: item, from: info.from, from_item: info.from_item };
				}

				info_index = index_where(indexed_common_subsequence, function (info) {
					return info.to === index;
				});
				if (info_index >= 0) {
					info = indexed_common_subsequence[info_index];
					return { to: index, to_item: item, item: item, from: info.from, from_item: from[info.from] };
				}
			});
		var removed_mappings = map(indexed_removed, function (info) {
			return { from: info.index, from_item: info.item };
		});
		var mappings = to_mappings.concat(removed_mappings);
		return mappings;
	};

	var get_array_diff = function (from_val, to_val, equality_check) {
		equality_check = equality_check || eqeqeq;
		var source_map = array_source_map(from_val, to_val, equality_check);
		var rearranged_array = source_map.slice().sort(function (a,b) {
			var a_has_from = has(a, "from"),
				b_has_from = has(b, "from");
			if (a_has_from && b_has_from) { return a.from - b.from; }
			else if (a_has_from && !b_has_from) { return -1; }
			else if (!a_has_from && b_has_from) { return 1; }
			else { return 0; }
		});
		var added = filter(source_map, function (info) { return !has(info, "from"); }), // back to front
			removed = filter(rearranged_array, function (info) { return !has(info, "to"); }).reverse(), // back to front
			index_changed = filter(source_map, function (info) { return has(info, "from") && has(info, "to") && info.from !== info.to; }),
			moved = [];

		each(removed, function (info) { rearranged_array.splice(info.from, 1); });
		each(added, function (info) { rearranged_array.splice(info.to, 0, info); });
		
		each(source_map, function (info, index) {
			if (has(info, "from") && has(info, "to")) {
				if (rearranged_array[index] !== info) {
					var rearranged_array_info_index = index_of(rearranged_array, info, index);
					rearranged_array.splice(index, 0, rearranged_array.splice(rearranged_array_info_index, 1)[0]);
					moved.push({move_from: rearranged_array_info_index, insert_at: index, item: info.item, from: info.from, to: info.to});
				}
			}
		});
		rearranged_array = null;
		return { added: added, removed: removed, moved: moved, index_changed: index_changed , mapping: source_map};
	};

	var get_map_diff = function (key_diff, value_diff) {
		key_diff = clone(key_diff);
		value_diff = clone(value_diff);
		var set = [], unset = [], key_change = [], value_change = [], index_changed = [], moved = [];
		var i, j, added_key, removed_key;
		for(i = 0; i<key_diff.added.length; i++) {
			added_key = key_diff.added[i];
			for(j = 0; j<key_diff.removed.length; j++) {
				removed_key = key_diff.removed[j];
				if (added_key.to === removed_key.from) {
					key_change.push({index: added_key.to, from: removed_key.from_item, to: added_key.item});
					
					key_diff.added.splice(i, 1);
					key_diff.removed.splice(j, 1);
					
					i -= 1;
					j -= 1;
					break;
				}
			}
		}
		for(i = 0; i<value_diff.added.length; i++) {
			var added_value = value_diff.added[i];
			for(j = 0; j<value_diff.removed.length; j++) {
				var removed_value = value_diff.removed[j];
				if (added_value.to === removed_value.from) {
					value_change.push({index: added_value.to, from: removed_value.from_item, to: added_value.item});
					
					value_diff.added.splice(i, 1);
					value_diff.removed.splice(j, 1);
					
					i -= 1;
					j -= 1;
					break;
				}
			}
		}
		for(i = 0; i<key_diff.added.length; i++) {
			added_key = key_diff.added[i];
			for(j = 0; j<value_diff.added.length; j++) {
				var added_val = value_diff.added[j];
				if (added_key.to === added_val.to) {
					set.push({index: added_key.to, key: added_key.item, value: added_val.item});
		
					key_diff.added.splice(i, 1);
					value_diff.added.splice(j, 1);
					
					i -= 1;
					j -= 1;
					break;
				}
			}
		}
		for(i = 0; i<key_diff.removed.length; i++) {
			removed_key = key_diff.removed[i];
			for(j = 0; j<value_diff.removed.length; j++) {
				var removed_val = value_diff.removed[j];
				if (removed_key.to === removed_val.to) {
					unset.push({from: removed_key.from, key: removed_key.from_item, value: removed_val.from_item});

					key_diff.removed.splice(i, 1);
					value_diff.removed.splice(j, 1);
					
					i -= 1;
					j -= 1;
					break;
				}
			}
		}

		for (i = 0; i<key_diff.moved.length; i++) {
			var moved_key = key_diff.moved[i];
			for (j = 0; j<value_diff.moved.length; j++) {
				var moved_val = value_diff.moved[j];
				if (moved_key.to === moved_val.to && moved_key.from === moved_val.from) {
					moved.push({from: moved_key.from, to: moved_key.to, key: moved_key.item, value: moved_val.item, insert_at: moved_key.insert_at});

					key_diff.moved.splice(i, 1);
					value_diff.moved.splice(j, 1);
					
					i -= 1;
					j -= 1;
					break;
				}
			}
		}
		for (i = 0; i<key_diff.index_changed.length; i++) {
			var index_changed_key = key_diff.index_changed[i];
			for (j = 0; j<value_diff.index_changed.length; j++) {
				var index_changed_val = value_diff.index_changed[j];
				if (index_changed_key.to === index_changed_val.to && index_changed_key.from === index_changed_val.from) {
					index_changed.push({from: index_changed_key.from, to: index_changed_key.to, key: index_changed_key.item, value: index_changed_val.item});

					key_diff.index_changed.splice(i, 1);
					value_diff.index_changed.splice(j, 1);
					
					i -= 1;
					j -= 1;
					break;
				}
			}
		}
		return { set: set, unset: unset, key_change: key_change, value_change: value_change, index_changed: index_changed, moved: moved};
	};

	window.get_obj_diff = function (from_obj, to_obj) {
		var from_keys = keys(from_obj),
			to_keys = keys(to_obj),
			from_values = values(from_obj),
			to_values = values(to_obj);
		var key_diff = get_array_diff(from_keys, to_keys),
			value_diff = get_array_diff(from_values, to_values);

		return get_map_diff(key_diff, value_diff);
		
	};

	/*
	var array_differ = function (val, equality_check) {
		var last_val = isArray(val) ? val : [];
		return function (val) {
			var diff = get_array_diff(last_val, val, equality_check);
			last_val = val;
			return diff;
		};
	};
	*/

	return get_array_diff;
}(this));
