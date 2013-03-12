(function(red) {
var cjs = red.cjs, _ = red._;

red.CurrentStateDelta = function(options) {
	red.CurrentStateDelta.superclass.constructor.apply(this, arguments);
	if(options.state_info) { //creating for the first time
		this.state_info = options.state_info;
	} else if(options.states) { //deserializing
		this.state_info = _	.chain(this.states)
							.map(function(state) {
								if(state.context()) {
									var active_substate = state.get_active_substate();
									return {
										state: state,
										active_substate: active_substate
									};
								} else { // This is the inert super statechart
									return false;
								}
							})
							.compact()
							.value();
	} else {
		console.error("Not enough information for a current state delta");
	}
};

(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	proto.get_state_info = function() {
		return this.state_info;
	};
	red.register_serializable_type("state_delta",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var serialized_state_info = _.map(this.state_info, function(si) {
											return {
												state_summary: si.state.summarize(),
												substate_summary: si.substate.summarize()
											};
										});
										return {
											state_info: serialized_state_info
										};
									},
									function(obj) {
										var serialized_state_info = obj.state_info;
										var state_info = _.map(serialized_state_info, function(ssi) {
											return {
												state: red.State.desummarize(ssi.state),
												substate: red.State.desummarize(ssi.substate)
											};
										});
										
										return new my({
											state_info: state_info
										});
									});
}(red.CurrentStateDelta));


red.TransitionFiredDelta = function(options) {
	red.TransitionFiredDelta.superclass.constructor.apply(this, arguments);
	this.transition = options.transition;
	this.event = options.event;
};

(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;

	proto.get_transition = function() {
		return this.transition;
	};
	proto.get_event = function() {
		return this.event;
	};

	red.register_serializable_type("transition_fired_delta",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var args = _.toArray(arguments);
										var summarized_transition = this.transition.summarize(),
											serialized_event = red.serialize.apply(red, ([this.event]).concat(arguments));
										return {
											transition_summary: summarized_transition,
											event: serialized_event
										};
									},
									function(obj) {
										var rest_args = _.rest(arguments);
										var transition = red.StatechartTransition.desummarize(obj.transition_summary),
											event = red.deserialize.apply(red, ([obj.event]).concat(rest_args));
										return new my({
											transition: transition,
											event: event
										});
									});
}(red.TransitionFiredDelta));

}(red));
