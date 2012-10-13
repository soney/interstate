(function(red) {
var cjs = red.cjs, _ = red._;

// === SERIALIZE ===

var serialization_funcs = [
	  {name: "cell", type: red.RedCell }
	, {name: "stateful_obj", type: red.RedStatefulObj }
	, {name: "dict", type: red.RedDict }
	, {name: "stateful_prop", type: red.RedStatefulProp }
	, {name: "group", type: red.RedGroup }
	, {name: "red_dom_attachment", type: red.RedDomAttachment }
	, {name: "red_context", type: red.RedContext }
	, {name: "statechart_transition", type: red.StatechartTransition }
	, {name: "statechart", type: red.Statechart }
	, {name: "parsed_event", type: red.ParsedEvent }
];

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
		serialized_obj_values[obj_id] = do_serialize(obj);
	}
	return obj_id;
};

var create_or_get_serialized_obj = function(obj) {
	return {
		type: "pointer"
		, id: get_or_create_serialized_obj_id(obj)
	};
};

red.serialize = function(obj) {
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
		return _.map(obj, red.serialize);
	} else if(is_init_serial_call) {
		var serialized_obj = create_or_get_serialized_obj(obj);
		serializing = false;
		return {
			serialized_objs: serialized_obj_values
			, root: serialized_obj
		};
	} else {
		return create_or_get_serialized_obj(obj);
	}

};

var serialize_array = function(arr) {
	var serialized_values = _.map(arr.get(), function(x) {
		return red.serialize(x);
	});

	return ({
		type: "array"
		, values: serialized_values
	});
};

var serialize_map = function(map) {
	var serialized_keys = _.map(map.keys(), function(x) {
		return red.serialize(x);
	});
	var serialized_values = _.map(map.values(), function(x) {
		return red.serialize(x);
	});

	return ({
		type: "map"
		, keys: serialized_keys
		, values: serialized_values
	});
};


var do_serialize = function(obj) {
	if(cjs.is_map(obj)) { return serialize_map(obj); }
	else if(cjs.is_array(obj)) { return serialize_array(obj); }

	for(var i = 0; i<serialization_funcs.length; i++) {
		var type_info = serialization_funcs[i];
		var type = type_info.type;
		if(obj instanceof type) {
			return _.extend({ type: type_info.name }, obj.serialize());
		}
	}
	return obj;
};

red.stringify = function(obj) {
	return lzw_encode(JSON.stringify(red.serialize(obj)));
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

	if(serialized_obj_type === "map") { return deserialize_map(serialized_obj); }
	if(serialized_obj_type === "array") { return deserialize_array(serialized_obj); }

	for(var i = 0; i<serialization_funcs.length; i++) {
		var type_info = serialization_funcs[i];
		if(serialized_obj_type === type_info.name) {
			return type_info.type.deserialize(serialized_obj);
		}
	}
	return serialized_obj;
};

var get_deserialized_obj = function(serialized_obj) {
	if(serialized_obj.type === "pointer") {
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


var deserialize_map = function(obj) {
	return cjs.map(_.map(obj.keys, red.deserialize), _.map(obj.values, red.deserialize));
};

var deserialize_array = function(obj) {
	return cjs.array(_.map(obj.values, red.deserialize));
};

red.destringify = function(str) {
	return red.deserialize(JSON.parse(lzw_decode(str)));
};

}(red));
//http://stackoverflow.com/questions/294297/javascript-implementation-of-gzip
// LZW-compress a string
function lzw_encode(s) {
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
function lzw_decode(s) {
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
