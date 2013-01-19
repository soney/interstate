(function(red) {
var check_context_equality = function(itema, itemb) {
	if(itema instanceof red.RedContext && itemb instanceof red.RedContext) {
		return itema.eq(itemb);
	} else {
		return itema === itemb;
	}
};
var cjs = red.cjs, _ = red._;
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
var RedStatefulProp = function(options, defer_initialization) {
	options = options || {};

	this._value = cjs();
	this.id = _.uniqueId();

	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
};
(function(my) {
	var proto = my.prototype;

	proto.do_initialize = function(options) {
		this._direct_values = options.direct_values || cjs.map();
		this._values_per_context = cjs.map({
			hash: "hash"
		});
		this._can_inherit = options.can_inherit !== false;
		this._ignore_inherited_in_contexts = _.isArray(options.ignore_inherited_in_contexts) ? options.ignore_inherited_in_contexts : [];
		this._direct_values.set_hash("hash");
	};

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
				, context: one_level_above_context //.pop()
			};
		}
	};

	var state_basis = function(state) {
		var basis = state.basis();
		if(_.isUndefined(basis)) {
			basis = state;
		}
		return basis;
	};

	proto.get_statecharts = function(context) {
		var SOandC = this.get_stateful_obj_and_context(context);
		if(SOandC) {
			return SOandC.stateful_obj.get_statecharts(SOandC.context);
		} else {
			return [];
		}
	};


	//
	// === DIRECT VALUES ===
	//
	proto.set = proto._set_direct_value_for_state = function(state, value) {
		state = state_basis(state);
		this._direct_values.put(state, value);
	};
	proto.unset = proto._unset_direct_value_for_state = function(state) {
		state = state_basis(state);
		var val = this._direct_values.get(state);
		if(val) {
			val.destroy();
		}
		this._direct_values.unset(state);
	};
	proto._direct_value_for_state = function(state) {
		state = state_basis(state);
		return this._direct_values.get(state);
	};
	proto._has_direct_value_for_state = function(state) {
		state = state_basis(state);
		return this._direct_values.has(state);
	};
	
	//
	// === INHERITED VALUES ===
	//
	proto._get_inherits_from = function(context) {
		if(!this._can_inherit) {
			return [];
		}
		var stateful_obj_and_context = this.get_stateful_obj_and_context(context);
		//var stateful_obj_context = stateful_obj_and_context.context;
		var stateful_obj_context = context;
		var stateful_obj = stateful_obj_and_context.stateful_obj;


		if(_.isUndefined(stateful_obj_context)) {
			return [];
		}
		var my_name = stateful_obj.name_for_prop(this, stateful_obj_context);
		if(_.isUndefined(my_name)) {
			return [];
		}
		var inherited_props = stateful_obj._get_all_inherited_props(my_name, stateful_obj_context);
		return inherited_props;
	};

	//
	// === VALUES ===
	//
	proto.get_state_specs = function(context) {
		var stateful_obj_and_context = this.get_stateful_obj_and_context(context);
		//var stateful_obj_context = stateful_obj_and_context.context;
		var stateful_obj_context = context;
		var stateful_obj = stateful_obj_and_context.stateful_obj;
		return stateful_obj.get_state_specs(stateful_obj_context, this._can_inherit);
	};
	proto.get_value_specs = function(context) {
		var inherits_from = this._get_inherits_from(context);
		var state_specs = this.get_state_specs(context);
		var values = _.map(state_specs, function(state_spec) {
			return get_value_for_state(state_spec.state, this, inherits_from);
		}, this);
		var is_inheriteds = _.map(state_specs, function(state_spec) {
			return !this._has_direct_value_for_state(state_spec.state);
		}, this);

		var rv = [];
		var found_using_value = false;
		for(var i = 0; i<state_specs.length; i++) {
			var state_spec = state_specs[i];

			var state = state_spec.state;
			var active = state_spec.active;
			var value = values[i];
			var using = false;

			if(active && !_.isUndefined(value) && !found_using_value) {
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
	proto.get_value_for_state = function(state, context) {
		return value_for_state(state, this, this._get_inherits_from(context));
	};
	proto.get = function(context) {
		var value = this.get_value_for_context(context);
		return red.get_contextualizable(value.get(), context);
	};
	proto.get_value_for_context = function(context) {
		return this._values_per_context.get_or_put(context, function() {
			return this.create_contextual_value(context);
		}, this);
	};
	proto.create_contextual_value = function(context) {
		return new RedStatefulPropContextualVal({
			context: context,
			stateful_prop: this
		});
	};
	proto.hash = function() {
		return this.id;
	};

	proto.serialize = function() {
		return {
			direct_values: red.serialize(this._direct_values)
			, can_inherit: red.serialize(this._can_inherit)
			, ignore_inherited_in_contexts: red.serialize(this._ignore_inherited_in_contexts)
		};
	};
	my.deserialize = function(obj) {
		var rv = new RedStatefulProp(undefined, true);
		rv.initialize = function() {
			var options = {
				direct_values: red.deserialize(obj.direct_values)
				, can_inherit: red.deserialize(obj.can_inherit)
				, ignore_inherited_in_contexts: red.deserialize(obj.ignore_inherited_in_contexts)
			};
			this.do_initialize(options);
		};
		return rv;
	};
}(RedStatefulProp));

red.RedStatefulProp = RedStatefulProp;
red.define("stateful_prop", function(options) {
	var prop = new RedStatefulProp(options);
	return prop;
});

var RedStatefulPropContextualVal = function(options) {
	options = options || {};
	this.id = _.uniqueId();
	this._context = options.context;
	this._stateful_prop = options.stateful_prop;
	this._value = null;
	this.update_value();
};
(function(my) {
	var proto = my.prototype;
	proto.hash = function() {
		return this.id;
	};
	proto.get = function() {
		var statecharts = this.get_statecharts();
		return this._value;
	};
	proto.get_stateful_prop = function() {
		return this._stateful_prop;
	};
	proto.get_context = function() {
		return this._context;
	};
	proto.get_statecharts = function() {
		var parent = this.get_stateful_prop();
		return parent.get_statecharts(this.get_context());
	};

	proto.update_value = function() {
		var parent = this.get_stateful_prop(),
			context = this.get_context();
		var statecharts = parent.get_statecharts(context);
		var inherits_from = parent._get_inherits_from(context);

		red.event_queue.once("end_event_queue_round_0", function() {
			var active_transitions = _.map(statecharts, function(statechart) { 
				return statechart.get_active_transitions();
			});
			active_transitions = _.flatten(active_transitions);
			if(active_transitions.length > 0) {
				var active_state_values = _.map(active_transitions, function(transition) {
					return get_value_for_state(transition, parent, inherits_from);
				}, this);
				for(var i = 0; i<active_state_values.length; i++) {
					var asv = active_state_values[i];
					if(asv) {
						this._value = asv;
						return;
					}
				}
			}
		}, this);


		var active_states = _.map(statecharts, function(statechart) {
			return statechart.get_active_states();
		});
		active_states = _.flatten(active_states);

		var active_state_values = _.map(active_states, function(state) {
			return get_value_for_state(state, parent, inherits_from);
		}, this);
		for(var i = 0; i<active_state_values.length; i++) {
			var asv = active_state_values[i];
			if(asv) {
				this._value = asv;
				return;
			}
		}
	};

	proto.destroy = function() {
		
	};
}(RedStatefulPropContextualVal));

red.RedStatefulProp = RedStatefulProp;

}(red));
