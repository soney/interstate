(function(red) {
var cjs = red.cjs, _ = red._;
var do_compress = false;

// === SERIALIZE ===

var serialization_funcs = [ ];

red.register_serializable_type = function(name, instance_check, serialize, deserialize) {
	serialization_funcs.push({
		name: name,
		instance_check: instance_check,
		serialize: serialize,
		deserialize: deserialize
	});
};

red.register_serializable_type("cjs_array",
								function(x) {
									return cjs.is_array(x);
								},
								function() {
									var args = _.toArray(arguments);
									var serialized_value = _.map(this.toArray(), function(x) {
										return red.serialize.apply(red, ([x]).concat(args));
									});

									return {
										value: serialized_value
									};
								},
								function(obj) {
									return cjs.array({
										value: _.map(obj.value, red.deserialize)
									});
								});

red.register_serializable_type("cjs_map",
								function(x) {
									return cjs.is_map(x);
								},
								function() {
									var args = _.toArray(arguments);
									var serialized_keys = _.map(this.keys(), function(x) {
										return red.serialize.apply(red, ([x]).concat(args));
									});
									var serialized_values = _.map(this.values(), function(x) {
										return red.serialize.apply(red, ([x]).concat(args));
									});

									return {
										keys: serialized_keys
										, values: serialized_values
									};
								},
								function(obj) {
									return cjs.map({
										keys: _.map(obj.keys, red.deserialize),
										values: _.map(obj.values, red.deserialize)
									});
								});


var serializing = false;
var serialized_objs;
var serialized_obj_values;

var find_serialized_obj_id = function(obj) {
	for(var i = 0; i<serialized_objs.length; i++) {
		if(serialized_objs[i] === obj) { return i; }
	}
	return -1;
};

var get_or_create_serialized_obj_id = function(obj) {
	var obj_id = find_serialized_obj_id(obj);
	if(obj_id < 0) {
		obj_id = serialized_objs.length;
		serialized_objs.push(obj);
		serialized_obj_values[obj_id] = do_serialize.apply(this, arguments);
	}
	return obj_id;
};

var create_or_get_serialized_obj = function() {
	return {
		type: "$$pointer"
		, id: get_or_create_serialized_obj_id.apply(this, arguments)
	};
};

red.serialize = function(obj) {
	var serialize_args = _.rest(arguments);
	var is_init_serial_call = false;
	if(!serializing) {
		serializing = true;
		is_init_serial_call = true;
		serialized_objs = [];
		serialized_obj_values = [];
	}

	if(obj == null || typeof obj !== "object") {
		return obj;
	} else if(_.isArray(obj)) {
		return _.map(obj, function(o) {
			return red.serialize.apply(red, ([o]).concat(serialize_args));
		});
	} else if(is_init_serial_call) {
		var serialized_obj = create_or_get_serialized_obj.apply(this, arguments);
		serializing = false;
		return {
			serialized_objs: serialized_obj_values
			, root: serialized_obj
		};
	} else {
		return create_or_get_serialized_obj.apply(this, arguments);
	}

};

var do_serialize = function(obj) {
	for(var i = 0; i<serialization_funcs.length; i++) {
		var serialization_info = serialization_funcs[i];
		var type = serialization_info.type;
		if(serialization_info.instance_check(obj)) {
			return _.extend({ type: serialization_info.name }, serialization_info.serialize.apply(obj, _.rest(arguments)));
		}
	}
	return obj;
};

red.stringify = function() {
	var serialized_obj = red.serialize.apply(red, arguments);
	var stringified_obj = JSON.stringify(serialized_obj);

	if(do_compress) { return lzw_encode(stringified_obj); }
	else { return stringified_obj; }
};

// === DESERIALIZE ===

var deserialized_objs;
var deserialized_obj_vals;
var deserializing = false;
red.deserialize = function(serialized_obj) {
	if(deserializing === false) {
		deserializing = true;
		deserialized_objs = serialized_obj.serialized_objs;
		deserialized_obj_vals = [];

		var rv = red.deserialize(serialized_obj.root);

		delete deserialized_obj_vals;
		delete deserialized_objs;
		deserializing = false;

		return rv;
	}
	
	if(serialized_obj == null || typeof serialized_obj !== "object") { return serialized_obj; }
	else if(_.isArray(serialized_obj)) {
		return _.map(serialized_obj, red.deserialize);
	} else {
		return get_deserialized_obj(serialized_obj);
	}
};

var do_deserialize = function(serialized_obj) {
	var serialized_obj_type = serialized_obj.type;

	for(var i = 0; i<serialization_funcs.length; i++) {
		var serialization_info = serialization_funcs[i];
		if(serialized_obj_type === serialization_info.name) {
			return serialization_info.deserialize(serialized_obj);
		}
	}
	return serialized_obj;
};

var get_deserialized_obj = function(serialized_obj) {
	if(serialized_obj.type === "$$pointer") {
		var id = serialized_obj.id;
		var val = deserialized_obj_vals[id];
		if(val === undefined) {
			val = deserialized_obj_vals[id] = do_deserialize(deserialized_objs[id]);
			if(val.initialize) {
				val.initialize();
				delete val.initialize;
			}
		}
		return val;
	} else {
		return do_deserialize(serialized_obj);
	}
};


red.destringify = function(str) {
	if(do_compress) { return red.deserialize(JSON.parse(lzw_decode(str))); }
	else { return red.deserialize(JSON.parse(str)); }
};
/*

var storage_prefix = "_";
red.save = function(name) {
	if(!_.isString(name)) {
		name = "default";
	}
	name = storage_prefix+name;
	localStorage[name] = red.stringify(root);
	return ls();
};
red.open = red.load = function(name) {
	if(!_.isString(name)) {
		name = "default";
	}
	name = storage_prefix+name;
	root_view.environment("destroy");
	root.destroy();
	root = red.destringify(localStorage[name]);
	env = red.create("environment", {root: root});
	root_view.environment({controller: env});
	console.log(env.print());
};
red.ls = function() {
	return _.chain(localStorage)
			.keys()
			.filter(function(key) {
				return key.substr(0, storage_prefix.length) === storage_prefix
			})
			.map(function(key) {
					return key.slice(storage_prefix.length);
			})
			.value();
};
red.rm = function(name) {
	if(!_.isString(name)) {
		name = "default";
	}
	name = storage_prefix+name;
	delete localStorage[name];
	return ls();
};
*/

//http://stackoverflow.com/questions/294297/javascript-implementation-of-gzip
// LZW-compress a string
var lzw_encode = function(s) {
    var dict = {};
    var data = (s + "").split("");
    var out = [];
    var currChar;
    var phrase = data[0];
    var code = 256;
    for (var i=1; i<data.length; i++) {
        currChar=data[i];
        if (dict[phrase + currChar] != null) {
            phrase += currChar;
        }
        else {
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            dict[phrase + currChar] = code;
            code++;
            phrase=currChar;
        }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    for (var i=0; i<out.length; i++) {
        out[i] = String.fromCharCode(out[i]);
    }
    return out.join("");
}

// Decompress an LZW-encoded string
var lzw_decode = function(s) {
    var dict = {};
    var data = (s + "").split("");
    var currChar = data[0];
    var oldPhrase = currChar;
    var out = [currChar];
    var code = 256;
    var phrase;
    for (var i=1; i<data.length; i++) {
        var currCode = data[i].charCodeAt(0);
        if (currCode < 256) {
            phrase = data[i];
        }
        else {
           phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
        }
        out.push(phrase);
        currChar = phrase.charAt(0);
        dict[code] = oldPhrase + currChar;
        code++;
        oldPhrase = phrase;
    }
    return out.join("");
}

}(red));
