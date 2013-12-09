/*global window,getArrayDiff */

(function () {
	"use strict";
	var _ = window._;
	var rdashAlpha = /-([a-z]|[0-9])/ig, rmsPrefix = /^-ms-/;
	var fcamelCase = function(all, letter) {
		return String(letter).toUpperCase();
	};
	var clone = _.clone;

	_.mixin({
		remove_index: function(arr, from, to) {
			//http://ejohn.org/blog/javascript-array-remove/
			var rest = arr.slice((to || from) + 1 || arr.length);
			arr.length = from < 0 ? arr.length + from : from;
			return arr.push.apply(arr, rest);
		},
		remove: function(arr, obj) {
			var objIndex = index_of(arr, obj);

			if(objIndex>=0) {
				remove_index(arr, objIndex);
			}
		},
		remove_all: function(arr, obj) {
			var objIndex;
			do {
				objIndex = index_of(arr, obj);

				if(objIndex>=0) {
					remove_index(arr, objIndex);
				}
			} while(objIndex >= 0);
		},
		index_of: function(arr, item, equality_check) {
			if(equality_check === undefined) { equality_check = function(a,b) { return a === b; }; }
			return index_where(arr, function(x) { return equality_check(item, x); });
		},
		index_where: function(arr, test) {
			var i, len = arr.length;
			for(i = 0; i<len; i++) {
				if(test(arr[i], i)) { return i; }
			}
			return -1;
		},
		clear: function(arr) {
			arr.length = 0;
		},
		insert_at: function(arr, item, index) {
			var rest;
			if(index===undefined) { return arr.push(item); }

			rest = arr.slice(index);
			arr.length = index;
			arr.push(item);
			return arr.push.apply(arr, rest);
		},
		set_index: function(arr, old_index, new_index) {
			if(old_index>=0 && old_index < arr.length && new_index>=0 && new_index < arr.length) {
				var obj = arr[old_index];
				remove_index(arr, old_index);
				/*
				if(new_index > old_index) {
					new_index--; //Account for the fact that the indicies shift
				}
				*/
				insert_at(arr, obj, new_index);
				return obj;
			}
			return false;
		},
		diff: cjs.arrayDiff,
		//function(oldArray, newArray, equality_check) {
			//return getArrayDiff(oldArray, newArray, equality_check);
		//},

		proto_extend: function (subClass, superClass) {
				var F = function() {};
				F.prototype = superClass.prototype;
				subClass.prototype = new F();
				subClass.prototype.constructor = subClass;
				
				subClass.superclass = superClass.prototype;
				if(superClass.prototype.constructor === Object.prototype.constructor) {
					superClass.prototype.constructor = superClass;
				}
			},
		// Convert dashed to camelCase; used by the css and data modules
		// Microsoft forgot to hump their vendor prefix (#9572)
		camel_case: function(string) {
				return string.replace( rmsPrefix, "ms-" ).replace(rdashAlpha, fcamelCase);
			},
		deepExtend: function(obj) {
				var parentRE = new RegExp("#{\\s*?_\\s*?}"),
				slice = Array.prototype.slice,
				hOP = Object.prototype.hasOwnProperty;
				var is_null_fn = _.bind(_.isNull, _);

				_.each(slice.call(arguments, 1), function(source) {
						for (var prop in source) {
							if (hOP.call(source, prop)) {
								if (_.isUndefined(obj[prop])) {
									obj[prop] = source[prop];
								} else if (_.isString(source[prop]) && parentRE.test(source[prop])) {
									if (_.isString(obj[prop])) {
									obj[prop] = source[prop].replace(parentRE, obj[prop]);
									}
								} else if (_.isArray(obj[prop]) || _.isArray(source[prop])){
									if (!_.isArray(obj[prop]) || !_.isArray(source[prop])){
										throw 'Error: Trying to combine an array with a non-array (' + prop + ')';
									} else {
										obj[prop] = _.reject(_.deepExtend(obj[prop], source[prop]), is_null_fn);
									}
								} else if (_.isObject(obj[prop]) || _.isObject(source[prop])){
									if (!_.isObject(obj[prop]) || !_.isObject(source[prop])){
										throw 'Error: Trying to combine an object with a non-object (' + prop + ')';
									} else {
										obj[prop] = _.deepExtend(obj[prop], source[prop]);
									}
								} else {
									obj[prop] = source[prop];
								}
							}
						}
				});
				return obj;
			}
	});
	_.isTextElement = function(obj) {
		return !!(obj && obj.nodeType === 3);
	};
	_.isCommentElement = function(obj) {
		return !!(obj && obj.nodeType === 8);
	};
	var index_of = _.index_of;
	var remove_index = _.remove_index;
	var index_where = _.index_where;
	var any = _.any;
	var insert_at = _.insert_at;
}());
