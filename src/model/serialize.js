(function(red) {
var cjs = red.cjs, _ = red._;

var red_types = [
	{name: "cell", type: red.RedCell}
	, {name: "stateful_obj", type: red.RedStatefulObj}
	, {name: "dict", type: red.RedDict}
	, {name: "stateful_prop", type: red.RedStatefulProp}
	, {name: "group", type: red.RedGroup}
];

red.serialize = function(red_obj) {
	if(red_obj == null || typeof red_obj !== "object") { return red_obj; }

	for(var i = 0; i<red_types.length; i++) {
		var type_info = red_types[i];
		var type = type_info.type;
		if(red_obj instanceof type_info.type) {
			return _.extend({ type: type_info.name }, red_obj.serialize());
		}
	}

	return red_obj;
};

red.deserialize = function(serialized_obj) {
	if(serialized_obj == null || typeof serialized_obj !== "object") { return serialized_obj; }

	var serialized_obj_type = serialized_obj.type;

	if(serialized_obj_type === "map") {
		return deserialize(serialized_obj);
	}

	for(var i = 0; i<red_types.length; i++) {
		var type_info = red_types[i];
		if(serialized_obj_type === type_info.name) {
			return type_info.type.deserialize(serialized_obj);
		}
	}

	return serialized_obj;
};

var serialize_map = function(map) {
	var keys = map.keys();
	var values = map.values();
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

var deserialize_map = function(obj) {
	return cjs.map(obj.keys, obj.values);
};

red.stringify = function(obj) {
	return JSON.stringify(red.serialize(obj));
};

red.destringify = function(str) {
	return red.deserialize(JSON.parse(str));
};

}(red));
