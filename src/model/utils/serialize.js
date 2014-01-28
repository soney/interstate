/*jslint nomen: true, vars: true, eqeq: true */
/*jshint eqnull: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs, _ = ist._;
	 
	//http://stackoverflow.com/questions/294297/javascript-implementation-of-gzip
	// LZW-compress a string
	function lzw_encode(s) {
		var dict = {},
			data = s.split(""),
			out = [],
			currChar,
			phrase = data[0],
			code = 256,
			i;
		for (i = 1; i < data.length; i += 1) {
			currChar = data[i];
			if (dict[phrase + currChar] != null) {
				phrase += currChar;
			} else {
				out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
				dict[phrase + currChar] = code;
				code += 1;
				phrase = currChar;
			}
		}
		out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
		for (i = 0; i < out.length; i += 1) {
			out[i] = String.fromCharCode(out[i]);
		}
		return out.join("");
	}

	// Decompress an LZW-encoded string
	function lzw_decode(s) {
		var dict = {},
			data = (s).split(""),
			currChar = data[0],
			oldPhrase = currChar,
			out = [currChar],
			code = 256,
			phrase,
			i;
		for (i = 1; i < data.length; i += 1) {
			var currCode = data[i].charCodeAt(0);
			if (currCode < 256) {
				phrase = data[i];
			} else {
				phrase = dict[currCode] || (oldPhrase + currChar);
			}
			out.push(phrase);
			currChar = phrase.charAt(0);
			dict[code] = oldPhrase + currChar;
			code += 1;
			oldPhrase = phrase;
		}
		return out.join("");
	}

	var POINTER_TYPE = "$$pointer";

	// === SERIALIZE ===

	var serialization_funcs = [ ];

	ist.register_serializable_type = function (name, instance_check, serialize, deserialize) {
		serialization_funcs.push({
			name: name,
			instance_check: instance_check,
			serialize: serialize,
			deserialize: deserialize
		});
	};

	ist.register_serializable_type("cjs_array",
		function (x) {
			return cjs.isArrayConstraint(x);
		},
		function () {
			var args = _.toArray(arguments);
			var serialized_value = _.map(this.toArray(), function (x) {
				return ist.serialize.apply(ist, ([x]).concat(args));
			});

			return {
				value: serialized_value
			};
		},
		function (obj) {
			var rest_args = _.rest(arguments);
			return cjs.array({
				value: _.map(obj.value, function (x) {
					return ist.deserialize.apply(ist, ([x]).concat(rest_args));
				})
			});
		});

	ist.register_serializable_type("cjs_map",
		function (x) {
			return cjs.isMapConstraint(x);
		},
		function () {
			var args = _.toArray(arguments);
			var serialized_keys = _.map(this.keys(), function (x) {
				return ist.serialize.apply(ist, ([x]).concat(args));
			});
			var serialized_values = _.map(this.values(), function (x) {
				return ist.serialize.apply(ist, ([x]).concat(args));
			});

			return {
				keys: serialized_keys,
				values: serialized_values
			};
		},
		function (obj) {
			var rest_args = _.rest(arguments);
			return cjs.map({
				keys: _.map(obj.keys, function (x) {
					return ist.deserialize.apply(ist, ([x]).concat(rest_args));
				}),
				values: _.map(obj.values, function (x) {
					return ist.deserialize.apply(ist, ([x]).concat(rest_args));
				})
			});
		});


	var serializing = false;
	var serialized_objs;
	var serialized_obj_values;

	var find_serialized_obj_id = function (obj) {
		return _.indexOf(serialized_objs, obj);
	};

	function do_serialize(obj) {
		var rest_args = _.rest(arguments),
			i;
		for (i = 0; i < serialization_funcs.length; i += 1) {
			var serialization_info = serialization_funcs[i];
			var type = serialization_info.type;
			if (serialization_info.instance_check(obj)) {
				return _.extend({ type: serialization_info.name }, serialization_info.serialize.apply(obj, rest_args));
			}
		}
		
		//Nothing found...do serialization by hand
		var rv = {};

		_.each(obj, function (value, key) {
			rv[key] = ist.serialize.apply(ist, ([value]).concat(rest_args));
		});

		return rv;
	}
	var get_or_create_serialized_obj_id = function (obj) {
		var obj_id = find_serialized_obj_id(obj);
		if (obj_id < 0) {
			obj_id = serialized_objs.length;
			serialized_objs.push(obj);
			serialized_obj_values[obj_id] = do_serialize.apply(this, arguments);
		}
		return obj_id;
	};

	var create_or_get_serialized_obj = function () {
		return {
			type: POINTER_TYPE,
			id: get_or_create_serialized_obj_id.apply(this, arguments)
		};
	};

	ist.serialize = function (obj) {
		var serialize_args = _.rest(arguments);
		var is_init_serial_call = false;
		if (!serializing) {
			serializing = true;
			is_init_serial_call = true;
			serialized_objs = [];
			serialized_obj_values = [];
		}

		if (obj == null || (typeof obj !== "object" && typeof obj !== "function")) {
			return obj;
		} else if (_.isArray(obj)) {
			return _.map(obj, function (o) {
				return ist.serialize.apply(ist, ([o]).concat(serialize_args));
			});
		} else if (is_init_serial_call) {
			var serialized_obj = create_or_get_serialized_obj.apply(this, arguments);
			serializing = false;
			var rv = {
				serialized_objs: serialized_obj_values,
				root: serialized_obj
			};
			serialized_objs = undefined;
			serialized_obj_values = undefined;
			return rv;
		} else {
			return create_or_get_serialized_obj.apply(this, arguments);
		}
	};



	ist.stringify = function () {
		var serialized_obj = ist.serialize.apply(ist, arguments);
		var stringified_obj = JSON.stringify(serialized_obj);
		return stringified_obj;
	};
	ist.stringify_and_compress = function () {
		var string = ist.stringify.apply(ist, arguments);
		return lzw_encode(string);
	};

	// === DESERIALIZE ===

	var deserialized_objs;
	var deserialized_obj_vals;
	var deserializing = false;
		
	var do_deserialize = function (serialized_obj) {
		var rest_args = _.rest(arguments);
		var serialized_obj_type = serialized_obj.type;
		var i;

		for (i = 0; i < serialization_funcs.length; i += 1) {
			var serialization_info = serialization_funcs[i];
			if (serialized_obj_type === serialization_info.name) {
				return serialization_info.deserialize.apply(serialization_info, ([serialized_obj]).concat(rest_args));
			}
		}

		var rv = {};
		_.each(serialized_obj, function (value, key) {
			rv[key] = ist.deserialize.apply(ist, ([value]).concat(rest_args));
		});

		return rv;
	};

	var get_deserialized_obj = function (serialized_obj) {
		var rest_args = _.rest(arguments);
		if (serialized_obj.type === POINTER_TYPE) {
			var id = serialized_obj.id;
			var val = deserialized_obj_vals[id];
			if (val === undefined) {
				val = deserialized_obj_vals[id] = do_deserialize.apply(this, ([deserialized_objs[id]]).concat(rest_args));
				if (val.initialize) {
					val.initialize();
					delete val.initialize;
				}
			}
			return val;
		} else {
			return do_deserialize.apply(this, ([serialized_obj]).concat(rest_args));
		}
	};

	ist.deserialize = function (serialized_obj) {
		var rest_args = _.rest(arguments);
		var rv;
		if (deserializing === false) {
			deserializing = true;

			try {
				deserialized_objs = serialized_obj.serialized_objs;
				deserialized_obj_vals = [];
				rv = ist.deserialize.apply(ist, ([serialized_obj.root]).concat(rest_args));
			} finally {
				deserialized_objs = deserialized_obj_vals = undefined;
				deserializing = false;
			}

			return rv;
		}
		
		if (serialized_obj == null || typeof serialized_obj !== "object") {
			return serialized_obj;
		} else if (_.isArray(serialized_obj)) {
			return _.map(serialized_obj, function (x) {
				return ist.deserialize.apply(ist, ([x]).concat(rest_args));
			});
		} else {
			return get_deserialized_obj.apply(this, ([serialized_obj]).concat(rest_args));
		}
	};


	ist.destringify = function (str) {
		var rest_args = _.rest(arguments);
		return ist.deserialize.apply(ist, ([JSON.parse(str)]).concat(rest_args));
	};
	ist.decompress_and_destringify = function (compressed_str) {
		var rest_args = _.rest(arguments);
		var str = lzw_decode(compressed_str);
		return ist.destringify.apply(ist, ([str]).concat(rest_args));
	};


	var type_maps = {};
	ist.loaded_program_name = cjs();

	ist.getSavedProgramMap = function(type) {
		if(!_.isString(type)) {
			type = "";
		}

		var val = {};
		_.each(ist.ls(type), function(prog_name) {
			var name = storage_prefix + prog_name + type_prefix + type,
				prog_str = window.localStorage.getItem(name);
			val[prog_name] = prog_str;
		});

		var map = cjs(val);
		var maps = type_maps[type];
		if(_.isArray(maps)) {
			type_maps[type].push(map);
		} else {
			type_maps[type] = [map];
		}

		var old_destroy = map.destroy;
		map.destroy = function() {
			if(type_maps[type].length === 1) {
				delete type_maps[type];
			} else {
				var index = type_maps[type].indexOf(map);
				type_maps[type].splice(index, 1);
			}
			old_destroy.apply(map, arguments);
		};
		map.savedType = function() {
			return type;
		};

		return map;
	};

	var storage_prefix = "_",
		type_prefix = "$";

	ist.save = function (root, name, type) {
		if (!_.isString(name)) {
			name = ist.loaded_program_name.get();
			if(!name) {
				var names = ist.ls(),
					original_name = "sketch_"+names.length,
					i = 0,
					name = original_name;

				while(names.indexOf(name)>=0) {
					name = original_name + "_" + i;
					i++;
				}
			}
		}
		if (!_.isString(type)) {
			type = "";
		}
		var storage_name = storage_prefix + name + type_prefix + type;
		var val = ist.stringify(root);
		window.localStorage.setItem(storage_name, val);
		_.each(type_maps[type], function(map) {
			map.item(name, val);
		});

		if(!type) { // program
			ist.setDefaultProgramName(name);
		}
		console.log("save ", name);

		return name;
	};
	ist.saveAndSetCurrent = function(root, name, type) {
		name = ist.save(root, name, type);
		ist.loaded_program_name.set(name);	
		return name;
	};
	ist.loadString = function(name, type) {
		var storage_name = storage_prefix + name + type_prefix + type;
		return window.localStorage.getItem(storage_name);
	};
	ist.load = function (name, type) {
		if (!_.isString(name)) {
			name = ist.getDefaultProgramName();
			if (!name) {
				return false;
			}
		}
		if (!_.isString(type)) {
			type = "";
		}

		var str = ist.loadString(name, type);
		if(!str) {
			return false;
		}
		try {
			var root = ist.destringify(str);
		} catch(e) {
			console.error("Error loading " + name + ":");
			console.error(e);
			return false;
		}
		console.log("load ", name);

		if(!type) { // program
			ist.loaded_program_name.set(name);	
			ist.setDefaultProgramName(name);
		}

		return root;
	};
	ist.ls = function (type) {
		var len = window.localStorage.length;
		var rv = [];
		var i;
		if (!_.isString(type)) {
			type = "";
		}
		var name_regex = new RegExp("^" + storage_prefix + "(.*)" + "\\" + type_prefix + type + "$");
		var match;
		for (i = 0; i < len; i += 1) {
			var key = window.localStorage.key(i);
			if ((match = key.match(name_regex))) {
				rv.push(match[1]);
			}
		}
		return rv;
	};
	ist.rm = function (name, type) {
		if (!_.isString(name)) {
			name = "default";
		}
		if (!_.isString(type)) {
			type = "";
		}
		var storage_name = storage_prefix + name + type_prefix + type;
		_.each(type_maps[type], function(map) {
			map.remove(name);
		});
		window.localStorage.removeItem(storage_name);
		return ist.ls();
	};
	ist.rename = function(from_name, to_name, type) {
		var storage_name = storage_prefix + name + type_prefix + type;
	};
	ist.nuke = function () {
		var program_names = ist.ls();
		_.each(program_names, ist.rm);
		_.each(type_maps, function(tm) {
			_.each(tm, function(map) {
				map.clear();
			});
		});
		return ist.ls();
	};

	var default_program_name = "IST_DEFAULT_PROGRAM";
	ist.getDefaultProgramName = function() {
		var rv = localStorage.getItem(default_program_name);
		return rv === null ? false : rv;
	};

	ist.setDefaultProgramName = function(name) {
		window.localStorage.setItem(default_program_name, name);
	};
}(interstate));
