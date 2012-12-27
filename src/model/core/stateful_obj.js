(function(red) {
var cjs = red.cjs, _ = red._;

var RedStatefulObj = function(options, defer_initialization) {
	options = options || {};
	RedStatefulObj.superclass.constructor.apply(this, arguments);

	this.type = "red_stateful_obj";

	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
};
(function(my) {
	_.proto_extend(my, red.RedDict);
	var proto = my.prototype;

	proto.do_initialize = function(options) {
		my.superclass.do_initialize.apply(this, arguments);
		red.install_instance_builtins(this, options, my);
		this.contextual_statecharts() .set_equality_check(red.check_context_equality);
	};

	my.builtins = {
		"direct_statechart": {
			default: function() { return red.create("statechart"); }
			, getter_name: "get_own_statechart"
			, settable: false
		}

		, "contextual_statecharts": {
			default: function() { return cjs.map(); }
			, getter_name: "contextual_statecharts"
			, settable: false
			, serialize: false
		}
		, "event": {
			default: function() {
				return red.create("stateful_prop")
			}
			, serialize: false
			, env_visible: false
			, standard_prop: true
		}
	};
	red.install_proto_builtins(proto, my.builtins);

	//
	// === STATECHART SHADOWS ===
	//
	proto.get_statechart_for_context = function(context) {
		var sc = this.contextual_statecharts().item(context);
		if(_.isUndefined(sc)) {
			sc = this._create_statechart_for_context(context);
		}
		return sc;
	};
	proto._create_statechart_for_context = function(context) {
		var own_statechart = this.get_own_statechart();
		cjs.wait();
		var shadow_statechart = own_statechart.create_shadow(context);//red._shadow_statechart(this.get_own_statechart(), context.last(), context);
		this.contextual_statecharts().item(context, shadow_statechart);

		shadow_statechart.run();
		
		var sc_owner = context.last();
		if(sc_owner instanceof my) {
		//if(red.check_context_equality(this.get_default_context(), context)) {
			var self = sc_owner;
			shadow_statechart.on("*>-*", function(e, to_state_name) {
				var to_state = shadow_statechart.find_state(to_state_name);
				var event = sc_owner.get_event();
				event.set(to_state, e);
				//var e_prop = self._get_direct_prop("event");
				//e_prop.set(to_state, e);
			});
			shadow_statechart.owner = sc_owner;
		}

		var self = this;
		shadow_statechart.on("* >- *", function(event, to_state, from_state, transition, statechart) {
			var prop_names = self.get_prop_names(context);
			for(var i = 0; i<prop_names.length; i++) {
				var prop_name = prop_names[i];
				var prop = self.get_prop(prop_name, context);
				if(prop instanceof red.RedStatefulProp) {
					prop.on_transition_fire(context, transition);
				}
			}
		});

		cjs.signal();
		return shadow_statechart;
	};

	//
	// === INHERITED STATECHARTS ===
	//
	proto.get_inherited_statecharts = function(context) {
		var protos = this._get_all_protos(context);
		var statecharts = _.map(protos, function(protoi) {
			if(protoi instanceof red.RedStatefulObj) {
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
			return _.without(statechart.get_substates(), statechart);
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

	my.deserialize = function(obj) {
		var builtins = _.extend({}, my.builtins, my.superclass.constructor.builtins);

		var serialized_options = {};
		_.each(builtins, function(builtin, name) {
			if(builtin.serialize !== false) {
				serialized_options[name] = obj[name];
			}
		});

		var rv = new RedStatefulObj(undefined, true);
		rv.initialize = function() {
			var options = {};
			_.each(serialized_options, function(serialized_option, name) {
				options[name] = red.deserialize(serialized_option);
			});
			this.do_initialize(options);
		};

		return rv;
	};
}(RedStatefulObj));

red.RedStatefulObj = RedStatefulObj;

red.define("stateful_obj", function(options, defer_init) {
	var dict = new RedStatefulObj(options, defer_init);
	return dict;
});

}(red));
