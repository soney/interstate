(function(red) {
var cjs = red.cjs, _ = red._;

var get_event_context = _.memoize(function(state, event) {
	return new red.EventContext(event);
}, function(state, event) {
	return state.hash();
});

var get_value_for_state = function(state, stateful_prop, inherits_from) {
	if(stateful_prop._has_direct_value_for_state(state)) {
		return stateful_prop._direct_value_for_state(state);
	} else {
		for(var i = 0; i<inherits_from.length; i++) {
			var i_from = inherits_from[i];
			if(i_from instanceof red.StatefulProp && i_from._has_direct_value_for_state(state)) {
				return i_from._direct_value_for_state(state);
			}
		}
		return undefined;
	}
};

red.StatefulProp = function(options, defer_initialization) {
	options = options || {};

	this._value = cjs();
	this.uid = options.uid || uid();
	red.register_uid(this.uid, this);

	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
};
(function(my) {
	var proto = my.prototype;

	proto.do_initialize = function(options) {
		red.install_instance_builtins(this, options, my);
		this.get_direct_values().set_hash("hash");
		this.used_start_transition = options.used_start_transition === true;

		this._can_inherit = options.can_inherit !== false;
		this._ignore_inherited_in_contexts = _.isArray(options.ignore_inherited_in_contexts) ? options.ignore_inherited_in_contexts : [];
		this._check_on_nullify = options.check_on_nullify === true;
	};

	my.builtins = {
		"direct_values": {
			default: function() { return cjs.map(); }
			, env_visible: false
		},

		"values_per_context": {
			default: function() {
				return cjs.map({
					equals: red.check_pointer_equality,
					hash: "hash"
				});
			},
			serialize: false
		},

		"statechart_parent": {
			default: function() {
				return "parent"
			}
		}
	};

	red.install_proto_builtins(proto, my.builtins);

	//
	// === PARENTAGE ===
	//

	var state_basis = function(state) {
		var basis = state.basis();
		if(_.isUndefined(basis)) {
			basis = state;
		}
		return basis;
	};


	//
	// === DIRECT VALUES ===
	//
	proto.set = proto._set_direct_value_for_state = function(state, value) {
		state = state_basis(state);
		this.get_direct_values().put(state, value);
	};
	proto.unset = proto._unset_direct_value_for_state = function(state) {
		var dvs = this.get_direct_values();
		state = state_basis(state);
		var val = dvs.get(state);
		if(val) {
			val.destroy();
		}
		dvs.remove(state);
	};
	proto._direct_value_for_state = function(state) {
		state = state_basis(state);
		return this.get_direct_values().get(state);
	};
	proto._has_direct_value_for_state = function(state) {
		state = state_basis(state);
		return this.get_direct_values().has(state);
	};
	
	proto.hash = function() {
		return this.uid;
	};
	proto.destroy = function() {
		var contextual_values = values_per_context.values();
		_.each(contextual_values, function(cv) {
			cv.destroy();
		});
		values_per_context.destroy();
		this.get_direct_values().destroy();
	};

	proto.clone = function() {
	};

	red.register_serializable_type("stateful_prop",
									function(x) { 
										return x instanceof my;
									},
									function(include_uid) {
										var args = _.toArray(arguments);
										var rv = {
											//direct_values: red.serialize.apply(red, ([this.get_direct_values()]).concat(arg_array))
											can_inherit: red.serialize.apply(red, ([this._can_inherit]).concat(args))
											, ignore_inherited_in_contexts: red.serialize.apply(red, ([this._ignore_inherited_in_contexts]).concat(args))
											, check_on_nullify: red.serialize.apply(red, ([this._check_on_nullify]).concat(args))
										};
										_.each(my.builtins, function(builtin, name) {
											if(builtin.serialize !== false) {
												var getter_name = builtin._get_getter_name();
												rv[name] = red.serialize.apply(red, ([this[getter_name]()]).concat(args));
											}
										}, this);
										if(include_uid) {
											rv.uid = this.uid;
										}
										return rv;
									},
									function(obj, options) {
										var rv = new my({uid: obj.uid}, true);

										var serialized_options = {};
										_.each(my.builtins, function(builtin, name) {
											if(builtin.serialize !== false) {
												serialized_options[name] = obj[name];
											}
										});

										var rest_args = _.rest(arguments, 2);
										rv.initialize = function() {
											options = _.extend({
												//direct_values: red.deserialize.apply(red, ([obj.direct_values]).concat(rest_args))
												can_inherit: red.deserialize.apply(red, ([obj.can_inherit, options]).concat(rest_args))
												, ignore_inherited_in_contexts: red.deserialize.apply(red, ([obj.ignore_inherited_in_contexts, options]).concat(rest_args))
												, check_on_nullify: red.deserialize.apply(red, ([obj.check_on_nullify, options]).concat(rest_args))
											}, options);
											_.each(serialized_options, function(serialized_option, name) {
												options[name] = red.deserialize.apply(red, ([serialized_option, options]).concat(rest_args));
											});
											this.do_initialize(options);
										};
										return rv;
									});
}(red.StatefulProp));

red.define("stateful_prop", function(options) {
	var prop = new red.StatefulProp(options);
	return prop;
});

}(red));
