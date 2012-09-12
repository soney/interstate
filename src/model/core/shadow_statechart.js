(function(red) {
var cjs = red.cjs, _ = cjs._;

var do_shadow = function(statechart, shadow, parent, context) {
	var state_map = {};
	var transition_map = {};

	var substate_names = statechart.get_substate_names();
	_.forEach(substate_names, function(substate_name) {
		var substate = statechart.get_state_with_name(substate_name);
		var shadow_substate;
		if(shadow.has_state(substate_name)) {
			shadow_substate = shadow.get_state_with_name(substate_name);
		} else {
			shadow_substate = substate.clone();
			shadow.add_state(substate_name, shadow_substate);
		}

		state_map[substate.id] = shadow_substate;
		do_shadow(substate, shadow_substate, parent, context);
	});
	var on_state_added = function(event) {
		var substate_name = event.state_name
			, substate = event.state
			, target = event.target;

		if(target === statechart) {
			if(shadow.has_state(substate_name)) {
				shadow_substate = shadow.get_state_with_name(substate_name);
			} else {
				if(_.has(state_map, substate.id)) {
					shadow_substate = state_map[substate.id];
				} else {
					shadow_substate = substate.clone();
				}
				shadow.add_state(substate_name, shadow_substate);
			}

			state_map[substate.id] = shadow_substate;
			do_shadow(substate, shadow_substate, parent, context);
		}
	};
	var on_state_moved = function(event) {
		var substate_name = event.state_name
			, target = event.target
			, index = event.index;

		if(target === statechart) {
			shadow.move_state(substate_name, index);
		}
	};
	var on_state_removed = function(event) {
		var substate_name = event.state_name
			, substate = event.state
			, target = event.target;

		if(target === statechart) {
			if(shadow.has_state(substate_name)) {
				shadow.remove_state(substate_name);
			}
		}
	};

	var on_state_renamed = function(event) {
		var from_name = event.from_name
			, to_name = event.to_name
			, target = event.target;

		if(target === statechart) {
			shadow.rename_state(from_name, to_name);
		}
	};

	var on_transition_added = function(event) {
		var transition = event.transition;
		var shadow_event = transition.get_event().clone(parent, context)
			, from_state_name = transition.from().get_name(statechart)
			, to_state_name = transition.to().get_name(statechart)
			, target = event.target;
		var to = transition.to();
		if(target === statechart) {
			if(_.has(transition_map, transition.id)) {
				var cloned_transition = transition_map[transition.id];
				shadow.add_transition(cloned_transition);
			} else {
				shadow.add_transition(from_state_name, to_state_name, shadow_event);
				var cloned_transition = shadow.get_last_transition();
				cloned_transition.set_basis(transition);
			}
		}
	};
	var on_transition_removed = function(event) {
		var transition = event.transition
			, target = event.target;
		if(target === statechart) {
			var matching_transitions = _.filter(shadow.get_transitions(), function(t) {
				return t.get_basis() === transition;
			});
			_.forEach(matching_transitions, function(t) {
				shadow.remove_transition(t);
			});
		}
	};

	var on_destroy = function(event) {
		statechart	._off("state_added", on_state_added)
					._off("state_moved", on_state_moved)
					._off("state_removed", on_state_removed)
					._off("state_renamed", on_state_renamed)
					._off("transition_added", on_transition_added)
					._off("transition_removed", on_transition_removed)
					._off("destroy", on_destroy);
	};
	statechart	._on("state_added", on_state_added)
				._on("state_moved", on_state_moved)
				._on("state_removed", on_state_removed)
				._on("state_renamed", on_state_renamed)
				._on("transition_added", on_transition_added)
				._on("transition_removed", on_transition_removed)
				._on("destroy", on_destroy);
};

red._shadow_statechart = function(statechart, parent, context) {
	var shadow = statechart.clone(parent, context);
	red._set_constraint_descriptor(shadow._states._keys, "State keys " + shadow.id + " shadowing " + statechart.id);
	red._set_constraint_descriptor(shadow._states._values, "State values " + shadow.id + " shadowing " + statechart.id);
	red._set_constraint_descriptor(shadow._transitions, "Transitions " + shadow.id + " shadowing " + statechart.id);
	red._set_constraint_descriptor(shadow._$complete_state, "$complete_state " + shadow.id + " shadowing " + statechart.id);
	red._set_constraint_descriptor(shadow._$local_state, "$local_state " + shadow.id + " shadowing " + statechart.id);
	do_shadow(statechart, shadow, parent, context);
	return shadow;
};
}(red));
