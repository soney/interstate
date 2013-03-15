(function(red) {
var cjs = red.cjs, _ = red._;

red.find_stateful_obj_and_context = function(context) {
	var popped_item, last;
	var set_statechart = false;
	while(!context.is_empty()) {
		last = context.points_at();
		if(last instanceof red.StatefulProp) {
			var statechart_parent = last.get_statechart_parent();
			if(statechart_parent === "parent") {
				//Behave like normal
			} else if(statechart_parent instanceof red.Statechart) {
				console.log(statechart_parent);
			} else if(statechart_parent instanceof red.StatefulObj) {
				if(!set_statechart) {
					set_statechart = statechart_parent;
				}
			} else {
				console.log(statechart_parent);
			}
		} else if(last instanceof red.StatefulObj) {
			return {
					stateful_obj: set_statechart ? set_statechart : last,
					context: context
				};
		}
		popped_item = last;
		context = context.pop();
	}
	return undefined;
};

red.StatefulObj = function(options, defer_initialization) {
	options = options || {};
	red.StatefulObj.superclass.constructor.apply(this, arguments);

	this.type = "red_stateful_obj";

	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
};
(function(my) {
	_.proto_extend(my, red.Dict);
	var proto = my.prototype;

	proto.do_initialize = function(options) {
		my.superclass.do_initialize.apply(this, arguments);
		red.install_instance_builtins(this, options, my);
	};

	my.builtins = {
		"direct_statechart": {
			default: function() { return red.create("statechart"); }
			, getter_name: "get_own_statechart"
			, settable: false
		}

		, "contextual_statecharts": {
			default: function() { return cjs.map({
				hash: "hash",
				equals: red.check_pointer_equality
			}); }
			, getter_name: "contextual_statecharts"
			, settable: false
			, serialize: false
		}
	};
	red.install_proto_builtins(proto, my.builtins);

	//
	// === STATECHART SHADOWS ===
	//
	proto.get_statechart_for_context = function(context) {
		var sc = this.contextual_statecharts().get_or_put(context, _.bind(this._create_statechart_for_context, this, context));
		return sc;
	};
	proto._create_statechart_for_context = function(pcontext) {
		if(pcontext.points_at() instanceof red.StatefulProp) debugger;
		var own_statechart = this.get_own_statechart();
		cjs.wait();
		var shadow_statechart = own_statechart.create_shadow({context: pcontext, running: true});

		shadow_statechart.run();
		cjs.signal();
		return shadow_statechart;
	};

	//
	// === INHERITED STATECHARTS ===
	//
	
	proto.get_inherited_statecharts = function(context) {
		var proto_dicts = this._get_all_protos(context);
		var statecharts = _.map(proto_dicts, function(protoi) {
			//var protoi = proto_pointer.points_at();
			if(protoi instanceof red.StatefulObj) {
				return protoi.get_statechart_for_context(context);
			} else {
				return false;
			}
		});
		return _.compact(statecharts);
	};

	//
	// === STATECHARTS ===
	//
	proto.get_statecharts = function(context) {
		var own_statechart = this.get_statechart_for_context(context);
		var inherited_statecharts = this.get_inherited_statecharts(context);
		return ([own_statechart]).concat(inherited_statecharts);
	};
	proto.get_state_specs = function(context, include_inherited) {
		var statecharts;
		if(include_inherited === false) {
			statecharts = [this.get_statechart_for_context(context)];
		} else {
			statecharts = this.get_statecharts(context);
		}

		var active_states = get_active_states(statecharts);

		var flattened_statecharts = _.flatten(_.map(statecharts, function(statechart) {
			return _.without(statechart.flatten_substates(/*true*/), statechart);
		}), true);

		var flattened_states_and_transitions = _.flatten(_.map(flattened_statecharts, function(state) {
			return ([state]).concat(state.get_outgoing_transitions());
		}));

		var rv = _.map(flattened_states_and_transitions, function(state) {
			var is_active = _.indexOf(active_states, state) >= 0;
			return {
				active: is_active
				, state: state
			}
		});
		return rv;
	};

	proto.get_states = function(context) {
		var state_specs = this.get_state_specs(context);
		return _.pluck(state_specs, "state");
	};
	var get_active_states = function(statecharts) {
		var active_states = _.flatten(_.map(statecharts, function(statechart) {
			
			return statechart.get_active_states();
		}), true);
		return active_states;
	};

	proto.reset = function() {
		my.superclass.reset.apply(this, arguments);
		var contextual_statecharts = this.contextual_statecharts();
		contextual_statecharts.each(function(sc) {
			sc.reset();
		});
		return this;
	};

	red.register_serializable_type("stateful_obj",
									function(x) { 
										return x instanceof my;
									},
									my.superclass.serialize,
									function(obj) {
										var rest_args = _.rest(arguments);
										var builtins = _.extend({}, my.builtins, my.superclass.constructor.builtins);

										var serialized_options = {};
										_.each(builtins, function(builtin, name) {
											if(builtin.serialize !== false) {
												serialized_options[name] = obj[name];
											}
										});

										var rv = new my({uid: obj.uid}, true);
										rv.initialize = function() {
											var options = {};
											_.each(serialized_options, function(serialized_option, name) {
												options[name] = red.deserialize.apply(red, ([serialized_option]).concat(rest_args));
											});
											this.do_initialize(options);
										};

										return rv;
									});
}(red.StatefulObj));

red.define("stateful_obj", function(options, defer_init) {
	var dict = new red.StatefulObj(options, defer_init);
	return dict;
});

}(red));
