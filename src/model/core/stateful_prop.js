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
	var get_stateful_obj_context = function(context) {
		while(!context.is_empty()) {
			if(context.last() instanceof red.RedStatefulObj) {
				return context;
			}
			context = context.pop();
		}
		return undefined;
	};
	proto.get_stateful_obj_and_context = function(context) {
		var one_level_above_context = get_stateful_obj_context(context);
		if(_.isUndefined(one_level_above_context)) {
			return undefined;
		} else {
			return {
				stateful_obj: one_level_above_context.last()
				, context: one_level_above_context.pop()
			};
		}
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
		var stateful_obj_and_context = this.get_stateful_obj_and_context(context);
		var stateful_obj_context = stateful_obj_and_context.context;
		var stateful_obj = stateful_obj_and_context.stateful_obj;


		if(_.isUndefined(stateful_obj_context)) {
			return [];
		}
		var my_name = stateful_obj.name_for_prop(this);
		if(_.isUndefined(my_name)) {
			return [];
		}
		var inherited_props = stateful_obj._get_all_inherited_props(my_name);
		return inherited_props;
	};

	//
	// === VALUES ===
	//
	proto.get_state_specs = function(context) {
		var stateful_obj_and_context = this.get_stateful_obj_and_context(context);
		var stateful_obj_context = stateful_obj_and_context.context;
		var stateful_obj = stateful_obj_and_context.stateful_obj;
		return stateful_obj.get_state_specs(stateful_obj_context);
	};
	proto.get_value_specs = function(context) {
		var self = this;
		var inherits_from = this._get_inherits_from(context);
		var state_specs = this.get_state_specs(context);
		var values = _.map(state_specs, function(state_spec) {
			return get_value_for_state(state_spec.state, self, inherits_from);
		});
		var is_inheriteds = _.map(state_specs, function(state_spec) {
			return !self._has_direct_value_for_state(state_spec.state);
		});

		var rv = [];
		var found_using_value = false;
		for(var i = 0; i<state_specs.length; i++) {
			var state_spec = state_specs[i];

			var state = state_spec.state;
			var active = state_spec.active;
			var value = values[i];
			var using = false;

			if(!_.isUndefined(value) && !found_using_value) {
				found_using_value = using = true;
			}

			rv.push({
				state: state
				, active: active
				, value: value
				, using: using
			});
		}
		return rv;
	};
	var get_value_for_state = function(state, stateful_prop, inherits_from) {
		if(stateful_prop._has_direct_value_for_state(state)) {
			return stateful_prop._direct_value_for_state(state);
		} else {
			for(var i = 0; i<inherits_from.length; i++) {
				var i_from = inherits_from[i];
				if(i_from._has_direct_value_for_state(state)) {
					return i_from._direct_value_for_state(state);
				}
			}
			return undefined;
		}
	};
	proto.get = function(context) {
		var values = this.get_value_specs(context);
		for(var i = 0; i<values.length; i++) {
			var value = values[i];
			if(value.using) {
				var val = value.value;
				return red.get_contextualizable(val, context);
			}
		}
		return undefined;
	};
}(RedStatefulProp));

red.RedStatefulProp = RedStatefulProp;
cjs.define("red_stateful_prop", function(options) {
	var prop = new RedStatefulProp(options);
	return prop;
});

}(red));
