(function(red) {
var cjs = red.cjs, _ = red._;


var statecharts = {};

red.create_remote_statechart = function(wrapper_client) {
	var id = wrapper_client.cobj_id;
	var statechart = red.find_uid(id);
	statechart = null;
	if(!statechart) {
		if(statecharts.hasOwnProperty(id)) {
			statechart = statecharts[id];
		} else {
			var type = wrapper_client.type();
			if(type === "statechart") {
				statechart = new red.Statechart({inert: true});
			} else {
				statechart = new red.StartState({inert: true});
			}
			statecharts[id] = statechart;

			var substates = {};

			cjs.liven(function() {
				var new_substates = wrapper_client.get('get_substates') || {};
				var diff = get_obj_diff(substates, new_substates);

				_.each(diff.set, function(info) {
					var state_name = info.key,
						index = info.index,
						substate_wrapper = info.value;
					var substate = red.create_remote_statechart(substate_wrapper);
					statechart.add_substate(state_name, substate, index);
				});

				_.each(diff.unset, function(info) {
					var state_name = info.key;
					statechart.remove_state(state_name);
				});

				substates = new_substates;
			});

			var outgoing_transitions = [];
			cjs.liven(function() {
				var new_outgoing_transitions = wrapper_client.get('get_outgoing_transitions') || [];
				var diff = _.diff(outgoing_transitions, new_outgoing_transitions);

				_.each(diff.added, function(info) {
					var transition_wrapper = info.item;
					var transition = red.create_remote_transition(transition_wrapper);
					transition.setFrom(statechart);
					if(transition.to()) {
						statechart._emit("add_transition", {
							type: "add_transition",
							target: statechart,
							transition: transition
						});
					}
				});
				_.each(diff.removed, function(info) {
					console.log("removed", info);
				});

				outgoing_transitions = new_outgoing_transitions;
			});

			var incoming_transitions = [];
			cjs.liven(function() {
				var new_incoming_transitions = wrapper_client.get('get_incoming_transitions') || [];
				var diff = _.diff(incoming_transitions, new_incoming_transitions);

				_.each(diff.added, function(info) {
					var transition_wrapper = info.item;
					var transition = red.create_remote_transition(transition_wrapper);
					transition.setTo(statechart);
					if(transition.from()) {
						statechart._emit("add_transition", {
							type: "add_transition",
							target: statechart,
							transition: transition
						});
					}
				});
				_.each(diff.removed, function(info) {
					console.log("removed", info);
				});

				incoming_transitions = new_incoming_transitions;
			});

			var is_active = false;
			cjs.liven(function() {
				var new_active = wrapper_client.get('is_active') || false;

				if(is_active !== new_active) {
					is_active = new_active;
					statechart.set_active(is_active);
				}
			});
		}
	}
	return statechart;
};

var transitions = {};

red.create_remote_transition = function(wrapper_client) {
	var id = wrapper_client.cobj_id;
	var transition = red.find_uid(id);
	transition = null;
	if(!transition) {
		if(transitions.hasOwnProperty(id)) {
			transition = transitions[id];
		} else {
			var event = red.create_event("parsed", {str: "", inert: true});
			var transition = new red.StatechartTransition({from: false, to: false, event: event});
			transitions[id] = transition;

			cjs.liven(function() {
				var new_event_wrapper = wrapper_client.get('event') || false;
				var new_event = red.create_remote_event(new_event_wrapper);
				if(new_event) {
					transition.set_event(new_event);
					event = new_event;
				}
			});
		}
	}
	return transition;
};

var events = {};

red.create_remote_event = function(wrapper_client) {
	var id = wrapper_client.cobj_id;
	var event = red.find_uid(id);
	event = red.create_event("parsed", {str: "", inert: true});
	if(!event) {
		if(events.hasOwnProperty(id)) {
			event = events[id];
		} else {
			var event = new red.StatechartTransition({});
			events[id] = event;
			var str = ""
			cjs.liven(function() {
				var new_str = wrapper_client.get('get_str') || "";
				if(str !== new_str) {
					event.set_str(new_str);
					str = new_str;
				}
			});
		}
	}
	return event;
};


}(red));
