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

	if(obj == null || typeof obj !== "object" || _.isArray(obj)) {
		return obj;
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
		return x.get();
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
		if(obj instanceof type_info.type) {
			return _.extend({ type: type_info.name }, obj.serialize());
		}
	}
};

red.stringify = function(obj) {
	return JSON.stringify(red.serialize(obj));
};

// === DESERIALIZE ===

var deserialized_objs;
var deserialized_obj_vals;
var deserializing = false;
red.deserialize = function(serialized_obj) {
	var is_init_serial_call = false;
	if(deserializing === false) {
		is_init_serial_call = true;
		deserializing = true;
		deserialized_objs = serialized_obj.serialized_objs;
		deserialized_obj_vals = [];
		return red.deserialize(serialized_obj.root);
	}
	
	if(serialized_obj == null || typeof serialized_obj !== "object" || _.isArray(serialized_obj)) { return serialized_obj; }

	var obj = get_deserialized_obj(serialized_obj);


	if(is_init_serial_call) {
		deserializing = false;
		delete deserialized_objs;
		delete deserialized_obj_vals;
	}

	return obj;
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
	}
};


var deserialize_map = function(obj) {
	return cjs.map(obj.keys, obj.values);
};

var deserialize_array = function(obj) {
	return cjs.array(obj.values);
};

red.destringify = function(str) {
	return red.deserialize(JSON.parse(str));
};

}(red));
