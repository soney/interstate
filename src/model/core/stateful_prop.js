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
		this._direct_values = options.direct_values || cjs.map();
		this._direct_values.set_hash("hash");

		this._values_per_context = cjs.map({
			equals: red.check_pointer_equality,
			hash: "hash"
		});
		this._can_inherit = options.can_inherit !== false;
		this._ignore_inherited_in_contexts = _.isArray(options.ignore_inherited_in_contexts) ? options.ignore_inherited_in_contexts : [];
		this._check_on_nullify = options.check_on_nullify === true;
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
		this._direct_values.remove(state);
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
		return get_value_for_state(state, this, this._get_inherits_from(context));
	};
	proto._get_value_and_from_state = function(pcontext) {
		var value_for_pcontext = this._get_value_for_context(pcontext);
		return value_for_pcontext.get_value_and_from_state();
	};
	proto._get_value_for_context = function(pcontext) {
		return this._values_per_context.get_or_put(pcontext, function() {
			return this.create_contextual_value(pcontext);
		}, this);
	};
	proto.get_pointer_for_context = function(pcontext) {
		var value_and_state = this._get_value_and_from_state(pcontext);
		var state = value_and_state.state,
			value = value_and_state.value;
		if(state && value) {
			var event = state._last_run_event,
			event_context = get_event_context(state, event);
			return pcontext.push(value, event_context);
		} else {
			return pcontext.push(value);
		}
	};
	proto.create_contextual_value = function(pcontext) {
		return new StatefulPropContextualVal({
			context: pcontext,
			stateful_prop: this
		});
	};
	proto.hash = function() {
		return this.uid;
	};
	proto.destroy = function() {
		var contextual_values = this._values_per_context.values();
		_.each(contextual_values, function(cv) {
			cv.destroy();
		});
		this._values_per_context.destroy();
		this._direct_values.destroy();
	};

	proto.clone = function() {
	};

	red.register_serializable_type("stateful_prop",
									function(x) { 
										return x instanceof my;
									},
									function(include_uid) {
										var arg_array = _.toArray(arguments);
										var rv = {
											direct_values: red.serialize.apply(red, ([this._direct_values]).concat(arg_array))
											, can_inherit: red.serialize.apply(red, ([this._can_inherit]).concat(arg_array))
											, ignore_inherited_in_contexts: red.serialize.apply(red, ([this._ignore_inherited_in_contexts]).concat(arg_array))
											, check_on_nullify: red.serialize.apply(red, ([this._check_on_nullify]).concat(arg_array))
										};
										if(include_uid) {
											rv.uid = this.uid;
										}
										return rv;
									},
									function(obj) {
										var rv = new my({uid: obj.uid}, true);
										rv.initialize = function() {
											var options = {
												direct_values: red.deserialize(obj.direct_values)
												, can_inherit: red.deserialize(obj.can_inherit)
												, ignore_inherited_in_contexts: red.deserialize(obj.ignore_inherited_in_contexts)
												, check_on_nullify: red.deserialize(obj.check_on_nullify)
											};
											this.do_initialize(options);
										};
										return rv;
									});
}(red.StatefulProp));

red.define("stateful_prop", function(options) {
	var prop = new red.StatefulProp(options);
	return prop;
});

var StatefulPropContextualVal = function(options) {
	options = options || {};
	this.transition_times_run = {};
	this.id = _.uniqueId();
	this._context = options.context;
	this._stateful_prop = options.stateful_prop;
	this._last_value = undefined;
	this._from_state = undefined;
	this._used_start_transition = false;
	this._value = new cjs.Constraint(_.bind(this.getter, this), false, {
		check_on_nullify: this._stateful_prop._check_on_nullify
	});
	this._value.onChange(_.bind(function() {
		if(red.event_queue.end_queue_round === 3 || red.event_queue_round === 4) {
			this._value.update();
		}
	}, this));
	_.defer(_.bind(function() {
		this._value.update();
	}, this));
	this.initialize();
};
(function(my) {
	var proto = my.prototype;
	proto.hash = function() {
		return this.id;
	};
	proto.traverse_values = function(on_state, on_transition, on_non_stateful) {
		var parent = this.get_stateful_prop(),
			my_context = this.get_context(),
			SOandC = red.find_stateful_obj_and_context(my_context);
		var do_break = false;
		var state_vals = [];
		if(parent._can_inherit === false) {
			var statechart = SOandC.stateful_obj.get_statechart_for_context(SOandC.context);
			var direct_values = parent._direct_values;
			direct_values.each_key(function(key, i) {
				if(key instanceof red.State) {
					try {
						var state = red.find_equivalent_state(key, statechart);
						if(on_state.call(this, state, key, i, direct_values) === false) {
							do_break = true;
							return false;
						}
					} catch(e) {
						return true;
					}
				} else {
					try {
						var transition = red.find_equivalent_transition(key, statechart);
						if(on_transitiion.call(this, transition, key, i, direct_values) === false) {
							do_break = true;
							return false;
						}
					} catch(e) {
						return true;
					}
				}
			}, this);
			if(do_break) {
				return;
			}
		} else {
			var stateful_obj = SOandC.stateful_obj;
			var stateful_obj_context = SOandC.context;
			
			var my_names = [];
			var i = my_context.indexOf(stateful_obj);
			var len = my_context.length();
			var item_im1 = my_context.points_at(i),
				item_i;

			i++;
			while(i<len) {
				item_i = my_context.points_at(i);
				var name = item_im1.name_for_prop(item_i, false);
				my_names.push(name);
				item_im1 = item_i;
				i++;
			}
			var protos_and_me = ([stateful_obj]).concat(stateful_obj._get_proto_vals(stateful_obj_context));
			var statecharts = _.compact(_.map(protos_and_me, function(x) {
				if(x instanceof red.StatefulObj) {
					return x.get_statechart_for_context(stateful_obj_context);
				}
			}));

			var my_names_len = my_names.length;
			var inherits_from = _.compact(_.map(protos_and_me, function(x) {
				var dict = x;
				for(i = 0; i<my_names_len; i++) {
					dict = dict._get_direct_prop(my_names[i]);
					if(!dict) {
						return false;
					}
				}
				return dict;
			}));

			var j, leni = inherits_from.length, lenj = statecharts.length;
			for(i = 0; i<leni; i++) {
				var ifrom = inherits_from[i];
				if(ifrom instanceof red.StatefulProp) {
					var direct_values = ifrom._direct_values;

					direct_values.each_key(function(key) {
						if(key instanceof red.State) {
							for(j = 0; j<lenj; j++) {
								try {
									var state = red.find_equivalent_state(key, statecharts[j]);
									if(on_state.call(this, state, key, j, direct_values) === false) {
										do_break = true;
										return false;
									}
								} catch(e) {
									continue;
								}
							}
						} else {
							for(j = 0; j<lenj; j++) {
								try {
									var transition = red.find_equivalent_transition(key, statecharts[j]);
									if(on_transition.call(this, transition, key, j, direct_values) === false) {
										do_break = true;
										return false;
									}
								} catch(e) {
									continue;
								}
							}
						}
					}, this);
				} else {
					if(on_non_stateful.call(this, ifrom) === false) {
						do_break = true;
						return false;
					}
				}
				if(do_break) {
					return;
				}
			}
		}
	};
	proto.initialize = function() {
		this.traverse_values(function(state, key, order, direct_values) {
		}, function(transition, key, order, direct_values) {
			if(transition.from() instanceof red.StartState) {
			}
			this.set_transition_times_run(transition, transition.get_times_run());
		}, function() {
		});
	};
	proto.get_transition_times_run = function(transition) {
		var transition_id = transition.id();
		return this.transition_times_run[transition_id];
	};
	proto.set_transition_times_run = function(transition, tr) {
		var transition_id = transition.id();
		this.transition_times_run[transition_id] = tr;
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
		var rv = false, from_state = false, using_start_transition = false;
		var state_vals = [];

		// on_state, on_transition, on_non_stateful
		this.traverse_values(function(state, key, order, direct_values) {
			if(state.is_active()) {
				state_vals.push({
					type: "stateful",
					key: key,
					state: state,
					direct_values: direct_values,
					statechart_order: order
				});
			}
		}, function(transition, key, order, direct_values) {
			var times_run = transition.get_times_run();
			if(times_run > this.get_transition_times_run(transition)) {
				this.set_transition_times_run(transition, times_run);
				rv = direct_values.get(key);
				from_state = transition;
			} else if(!this._used_start_transition && transition.from() instanceof red.StartState) {
				rv = direct_values.get(key);
				from_state = transition;
				using_start_transition = this._used_start_transition = true;
				return false;
			}
		}, function(ifrom) {
			state_vals.push({
				type: "non_stateful"
				, value: ifrom
				, statechart_order: Infinity
			});
		});

		if(rv) {
			this._from_state = from_state;
			this._last_value = rv;
			if(using_start_transition) {
				_.defer(_.bind(function() {
					this._value.invalidate();
				}, this));
			}
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
					if(info_i.state.order(info.state) > 0) {
						info = info_i;
					}
				}
			}
			if(info.type === "stateful") {
				var rv = info.direct_values.get(info.key);
				this._last_value = rv;
				this._from_state = info.state;
				return rv;
			} else if(info.type === "non_stateful") {
				if(this._last_value) {
					return this._last_value;
				}
				var rv = info.value;
				this._last_value = rv;
				this._from_state = undefined;
				return rv;
			}
		} else {
			return this._last_value;
		}
	};
	proto.destroy = function() {
		this._value.destroy();
	};
}(StatefulPropContextualVal));

}(red));
