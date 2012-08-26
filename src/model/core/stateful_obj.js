(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedStatefulObj = function(options) {
	RedStatefulObj.superclass.constructor.apply(this, arguments);

	this._direct_statechart = cjs.create("statechart");
	this._contextual_statecharts = cjs.create("map", function(itema, itemb) {
														if(itema instanceof red.RedContext && itemb instanceof red.RedContext) {
															return itema.eq(itemb);
														} else {
															return itema === itemb;
														}
												});
		
	this.initialize_statechart();
	this.type = "red_stateful_obj";
};
(function(my) {
	_.proto_extend(my, red.RedDict);
	var proto = my.prototype;

	//
	// ===== DIRECT STATECHART =====
	//

	proto.get_own_statechart = function() { return this._direct_statechart; };
	proto.initialize_statechart = function() {
		this._direct_statechart	.add_state("INIT")
								.starts_at("INIT");
	};
	proto.reset = function() {
		var statechart = this.get_own_statechart();
		statechart.reset();
	};
	proto.add_state = function() {
		var own_statechart = this.get_own_statechart();
		own_statechart.add_state.apply(own_statechart, arguments);
		return this;
	};
	proto.remove_state = function() {
		var own_statechart = this.get_own_statechart();
		own_statechart.remove_state.apply(own_statechart, arguments);
		return this;
	};
	proto.add_transition = function(from_state, to_state, event) {
		var statechart = this.get_own_statechart();
		if(arguments.length === 1) {
			statechart.add_transition.apply(statechart, arguments);
		} else {
			from_state = this.find_state(from_state);
			to_state = this.find_state(to_state);
			statechart.add_transition(from_state, to_state, event);
		}
		return this;
	};
	proto.starts_at = function(transition_to) {
		var statechart = this.get_own_statechart();
		transition_to = this.find_state(transition_to);
		statechart.starts_at(transition_to);
		return this;
	};
	proto.rename_state = function() {
		var own_statechart = this.get_own_statechart();
		own_statechart.rename_state.apply(own_statechart, arguments);
		return this;
	};

	//
	// === STATECHART SHADOWS ===
	//
	proto.get_statechart_for_context = function(context) {
		var sc = this._contextual_statecharts.get(context);
		if(_.isUndefined(sc)) {
			debugger;
			sc = this._create_statechart_for_context(context);
			sc.run();
		}
		return sc;
	};
	proto._create_statechart_for_context = function(context) {
		var shadow_statechart = red._shadow_statechart(this.get_own_statechart());
		this._contextual_statecharts.set(context, shadow_statechart);
		return shadow_statechart;
	};

	//
	// === INHERITED STATECHARTS ===
	//
	proto.get_inherited_statecharts = function(context) {
		var protos = this._get_all_protos();
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
		var inherited_statechart = this.get_inherited_statecharts(context);
		return ([own_statechart]).concat(inherited_statechart);
	};
	proto.get_state_specs = function(context) {
		var statecharts = this.get_statecharts(context);

		var active_states = get_active_states(statecharts);

		var flattened_statecharts = _.flatten(_.map(statecharts, function(statechart) {
			return _.without(statechart.flatten(), statechart);
		}), true);
		var viable_states = _.filter(flattened_statecharts, function(state) {
			return state.get_type() !== "pre_init";
		});


		var rv = _.map(viable_states, function(state) {
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
			
			return statechart.get_state();
		}), true);
		return active_states;
	};
}(RedStatefulObj));

red.RedStatefulObj = RedStatefulObj;

cjs.define("red_stateful_obj", function(options) {
	var dict = new RedStatefulObj(options);
	return dict;
});

}(red));
