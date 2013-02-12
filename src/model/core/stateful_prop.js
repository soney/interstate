(function(red) {
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

red.StatefulProp = function(options, defer_initialization) {
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
			equals: red.check_pointer_equality,
			hash: "hash"
		});
		this._can_inherit = options.can_inherit !== false;
		this._ignore_inherited_in_contexts = _.isArray(options.ignore_inherited_in_contexts) ? options.ignore_inherited_in_contexts : [];
		this._direct_values.set_hash("hash");
	};

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

	proto.get_statecharts = function(context) {
		var SOandC = red.find_stateful_obj_and_context(context);
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
		var stateful_obj_and_context = red.find_stateful_obj_and_context(context);
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
	
	proto.get_entries = function(context) {
		var inherits_from = this._get_inherits_from(context);
		var entries = this._get_direct_entries();
		entries.concat.apply(entries, _.map(inherits_from, function(i_from) {
			return inherits_from._get_direct_entries();
		}));
		return entries;
	};
	proto.get_state_specs = function(pcontext) {
		var stateful_obj_and_context = red.find_stateful_obj_and_context(pcontext);
		var stateful_obj_context = stateful_obj_and_context.context;
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
	proto.get_value_and_from_state = function(pcontext) {
		var value_for_pcontext = this.get_value_for_context(pcontext);
		return value_for_pcontext.get_value_and_from_state();
	};
	proto.get_value_for_context = function(pcontext) {
		return this._values_per_context.get_or_put(pcontext, function() {
			return this.create_contextual_value(pcontext);
		}, this);
	};
	proto.create_contextual_value = function(pcontext) {
		return new StatefulPropContextualVal({
			context: pcontext,
			stateful_prop: this
		});
	};
	proto.hash = function() {
		return this.id;
	};
	proto.destroy = function() {
		var contextual_values = this._values_per_context.values();
		_.each(contextual_values, function(cv) {
			cv.destroy();
		});
		this._values_per_context.destroy();
		this._direct_values.destroy();
	};

	proto.serialize = function() {
		return {
			direct_values: red.serialize(this._direct_values)
			, can_inherit: red.serialize(this._can_inherit)
			, ignore_inherited_in_contexts: red.serialize(this._ignore_inherited_in_contexts)
		};
	};
	my.deserialize = function(obj) {
		var rv = new red.StatefulProp(undefined, true);
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
}(red.StatefulProp));

red.define("stateful_prop", function(options) {
	var prop = new red.StatefulProp(options);
	return prop;
});

var StatefulPropContextualVal = function(options) {
	options = options || {};
	this.id = _.uniqueId();
	this._context = options.context;
	this._stateful_prop = options.stateful_prop;
	this._last_value = undefined;
	this._from_state = undefined;
	this._value = new cjs.Constraint(_.bind(this.getter, this), false, {
		check_on_nullify: true
	});
	this._value.onChange(_.bind(function() {
		if(red.event_queue.end_queue_round === 3 || red.event_queue_round === 4) {
			this._value.update();
		}
	}, this));
	_.defer(_.bind(function() {
		this._value.update();
	}, this));
};
(function(my) {
	var proto = my.prototype;
	proto.hash = function() {
		return this.id;
	};
	proto.get_value_and_from_state = function() {
		var value = this.get_value();
		var from_state = this.get_from_state();
		return {
			value: value,
			state: from_state
		};
	};
	proto.get_value = function() {
		var value = this._value.get();
		return value;
	};
	proto.get_from_state = function() {
		return this._from_state;
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
	proto.getter = function() {
		var parent = this.get_stateful_prop(),
			my_context = this.get_context();

		var rv = false, from_state = false;
		var state_vals = [];

		if(parent._can_inherit === false) {
			var SOandC = red.find_stateful_obj_and_context(my_context);
			var statechart = SOandC.stateful_obj.get_statechart_for_context(SOandC.context);
			var direct_values = parent._direct_values;
			direct_values.each_key(function(key) {
				if(key instanceof red.State) {
					try {
						var state = red.find_equivalent_state(key, statechart);
						if(state.is_active()) {
							state_vals.push({
								key: key,
								state: state,
								direct_values: direct_values,
								statechart_order: j
							});
						}
					} catch(e) {
						return true;
					}
				} else {
					try {
						var transition = red.find_equivalent_transition(key, statechart);
						if(transition.is_active()) {
							rv = direct_values.get(key);
							from_state = transition;
							return false;
						}
					} catch(e) {
						return true;
					}
				}
			});

		} else {
			var SOandC = red.find_stateful_obj_and_context(my_context);
			var stateful_obj = SOandC.stateful_obj;
			var stateful_obj_context = SOandC.context;
			var my_name = stateful_obj.direct_props().keyForValue(parent);
			var protos_and_me = ([stateful_obj]).concat(stateful_obj._get_proto_vals(stateful_obj_context));
			var statecharts = _.compact(_.map(protos_and_me, function(x) {
				if(x instanceof red.StatefulObj) {
					return x.get_statechart_for_context(stateful_obj_context);
				}
			}));
			var inherits_from = _.compact(_.map(protos_and_me, function(x) {
				return x.direct_props().get(my_name);
			}));

			var i, j, leni = inherits_from.length, lenj = statecharts.length;
			for(i = 0; i<leni; i++) {
				var ifrom = inherits_from[i];
				var direct_values = ifrom._direct_values;

				direct_values.each_key(function(key) {
					if(key instanceof red.State) {
						for(j = 0; j<lenj; j++) {
							try {
								var state = red.find_equivalent_state(key, statecharts[j]);
								if(state.is_active()) {
									state_vals.push({
										key: key,
										state: state,
										direct_values: direct_values,
										statechart_order: j
									});
								}
							} catch(e) {
								continue;
							}
						}
					} else {
						for(j = 0; j<lenj; j++) {
							try {
								var transition = red.find_equivalent_transition(key, statecharts[j]);
								if(transition.is_active()) {
									rv = direct_values.get(key);
									from_state = transition;
									return false;
								}
							} catch(e) {
								continue;
							}
						}
					}
				});
			}
		}

		if(rv) {
			this._from_state = from_state;
			this._last_value = rv;
			return rv;
		}

		var sv_len = state_vals.length;
		if(sv_len > 0) {
			var info = state_vals[0];
			var info_i;
			for(i = 1; i<sv_len; i++) {
				info_i = state_vals[i];
				if(info_i.statechart_order < info.statechart_order) {
					info = info_i;
				} else if(info_i.statechart_order === info.statechart_order) {
					if(info_i.state.order(info.state) < 0) {
						info = info_i;
					}
				}
			}
			var rv = info.direct_values.get(info.key);
			this._last_value = rv;
			this._from_state = info.state;
			return rv;
		} else {
			return this._last_value;
		}
	};
	proto.destroy = function() {
		this._value.destroy();
	};
}(StatefulPropContextualVal));

}(red));
