(function(red) {
var cjs = red.cjs, _ = red._;

red.CurrentStateDelta = function(options) {
	red.CurrentStateDelta.superclass.constructor.apply(this, arguments);
	this.state_info = options.state_info;
};


(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	proto.get_state_info = function() {
		var rv = _.map(this.state_info, function(si) {
			var context = red.destringify(si.context);
			var state_basis = red.find_uid(si.state_basis_id);
			var active_substate_basis = red.find_uid(si.active_substate_basis_id);

			var dict = context.points_at();

			var contextual_statechart = dict.get_statechart_for_context(context);
			var superstate = red.find_equivalent_state(state_basis, contextual_statechart);
			var substate = red.find_equivalent_state(active_substate_basis, contextual_statechart);

			return {
				superstate: superstate,
				substate: substate
			};
		});
		return rv;
	};
	red.register_serializable_type("state_delta",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											state_info: this.state_info
										};
									},
									function(obj) {
										return new my({
											state_info: obj.state_info
										});
									});
}(red.CurrentStateDelta));


red.TransitionFiredDelta = function(options) {
	red.TransitionFiredDelta.superclass.constructor.apply(this, arguments);
	this.transition_basis_id = options.transition_basis_id;
	this.context = options.context;
};

(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;

	proto.get_transition = function() {
		var transition_basis = red.find_uid(this.transition_basis_id);
		if(transition_basis) {
			var context = red.destringify(this.context);
			var dict = context.points_at();
			var statechart = dict.get_statechart_for_context(context);
			var transition = red.find_equivalent_transition(transition_basis, statechart);
			return transition;
		} else {
			return null;
		}
	};

	red.register_serializable_type("transition_fired_delta",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											transition_basis_id: this.transition_basis_id,
											context: this.context
										};
									},
									function(obj) {
										return new my({
											transition_basis_id: obj.transition_basis_id,
											context: obj.context
										});
									});
}(red.TransitionFiredDelta));

}(red));
