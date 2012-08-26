(function(red) {
var cjs = red.cjs, _ = cjs._;
var RedStatefulProp = function(options) {
	options = options || {};
	this._direct_values = cjs.create("map");
};
(function(my) {
	var proto = my.prototype;

	//
	// === PARENTAGE ===
	//
	proto.get_stateful_obj_context = function(context) {
		while(context) {
			if(context.last() instanceof red.RedStatefulObj) {
				return context;
			}
			context = context.pop();
		}
		return undefined;
	};

	var state_basis = function(state) {
		var basis = state.get_basis();
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
		this._direct_values.set(state, value);
	};
	proto.unset = proto._unset_direct_value_for_state = function(state) {
		state = state_basis(state);
		this._direct_values.unset(state);
	};
	proto._direct_value_for_state = function(state) {
		state = state_basis(state);
		return this._direct_values.get(state);
	};
	proto._has_direct_value_for_state = function(state) {
		state = state_basis(state);
		return this._direct_values.has_key(state);
	};
	
	//
	// === INHERITED VALUES ===
	//
	proto._get_inherits_from = function(context) {
		var stateful_obj_context = this.get_stateful_obj_context();
		if(_.isUndefined(stateful_obj_context)) {
			return [];
		}
		var my_name = stateful_obj_context.name_for_prop(this);
		if(_.isUndefined(my_name)) {
			return [];
		}
		var inherited_props = stateful_obj_context._get_all_inherited_props(my_name);
		return inherited_props;
	};

	//
	// === VALUES ===
	//
	proto.get_states = function(context) {
		var stateful_obj_context = this.get_stateful_obj_context();
		return stateful_obj_context.get_states(context);
	};
	proto.get_values = function(context) {
		var states = this.get_states();
		var inherits_from = this._get_inherits_from(context);
	};
	var get_value_for_state = function(state, stateful_prop, inherits_from) {
		var direct_value = stateful_prop._direct_value_for_state(state);
		if(!_.isUndefined(direct_value)) {
			return direct_value;
		}
	};
}(RedStatefulProp));

red.RedStatefulProp = RedStatefulProp;
cjs.define("red_stateful_prop", function(options) {
	var prop = new RedStatefulProp(options);
	return prop;
});

}(red));
