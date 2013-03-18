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
/*

var StatefulPropContextualVal = function(options) {
	options = options || {};
	this.transition_times_run = {};
	this.id = _.uniqueId();
	this._context = options.context;
	this._stateful_prop = options.stateful_prop;
	this._last_value = undefined;
	this._from_state = undefined;
	this._used_start_transition = options.used_start_transition === true;
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
			var direct_values = parent.get_direct_values();
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
			var i = my_context.lastIndexOf(stateful_obj);
			var len = my_context.length();
			var item_im1 = my_context.points_at(i),
				item_i;

			i++;

			while(i<len) {
				item_i = my_context.points_at(i);
				var name = item_im1.name_for_prop(item_i, my_context.slice(0, i));
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

			var stateful_obj_context_len = stateful_obj_context.length();
			var my_names_len = my_names.length;
			var inherits_from = _.compact(_.map(protos_and_me, function(x) {
				var dict = x;
				for(i = 0; i<my_names_len; i++) {
					dict = dict._get_prop(my_names[i], my_context.slice(0, stateful_obj_context_len + my_names_len-i));
					if(!dict) {
						return false;
					}
				}
				return dict;
			}, this));

			var j, leni = inherits_from.length, lenj = statecharts.length;
			for(i = 0; i<leni; i++) {
				var ifrom = inherits_from[i];
				if(ifrom instanceof red.StatefulProp) {
					var direct_values = ifrom.get_direct_values();

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
		var context = this.get_context();


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
				} else if(info_i.statechart_order === info.statechart_order && info.statechart_order < Infinity) {
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
*/

}(red));
