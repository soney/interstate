(function(red) {
var cjs = red.cjs, _ = red._;

var statecharts = {};

red.create_remote_statechart = function(wrapper_client, statechart_parent) {
	var id = wrapper_client.cobj_id;
	var statechart = red.find_uid(id);
	statechart = null;
	if(!statechart) {
		if(statecharts.hasOwnProperty(id)) {
			statechart = statecharts[id];
		} else {
			var type = wrapper_client.type();
			if(type === "statechart") {
				statechart = new red.Statechart(null, true);
				var substates = _.Deferred();
				var substates_value;
				wrapper_client.async_get('get_substates', function(substate_wrappers) {
					substates_value = cjs.map({ });

					_.each(substate_wrappers, function(substate_wrapper, name) {
						var substate = red.create_remote_statechart(substate_wrapper, statechart);
						substates_value.put(name, substate);
					});
					substates.resolve();
				});

				var start_state = _.Deferred();
				var start_state_value;
				wrapper_client.async_get('get_start_state', function(substate_wrapper) {
					start_state_value = red.create_remote_statechart(substate_wrapper, statechart);
					start_state.resolve();
				});


				var outgoing_transitions = _.Deferred();
				var outgoing_transitions_value;
				wrapper_client.async_get('get_outgoing_transitions', function(transition_wrappers) {
					var outgoing_transitions_value_arr = _.map(transition_wrappers, function(transition_wrapper, name) {
						var transition = red.create_remote_transition(transition_wrapper);
						return transition;
					});
					outgoing_transitions_value = cjs.array({value: outgoing_transitions_value_arr});
					outgoing_transitions.resolve();
				});

				var incoming_transitions = _.Deferred();
				var incoming_transitions_value;
				wrapper_client.async_get('get_incoming_transitions', function(transition_wrappers) {
					var incoming_transitions_value_arr = _.map(transition_wrappers, function(transition_wrapper, name) {
						var transition = red.create_remote_transition(transition_wrapper);
						return transitions;
					});
					incoming_transitions_value = cjs.array({value: incoming_transitions_value_arr});
					incoming_transitions.resolve();
				});

				var is_concurrent = _.Deferred();
				var is_concurrent_value;
				wrapper_client.async_get('is_concurrent', function(is_it) {
					is_concurrent_value = is_it;
					is_concurrent.resolve();
				});

				var is_active = _.Deferred();
				var is_active_value;
				wrapper_client.async_get('is_active', function(is_it) {
					is_active_value = is_it;
					is_active.resolve();
				});

				var promises = [substates.promise(), outgoing_transitions.promise(), incoming_transitions.promise(), is_concurrent.promise(), is_active.promise(), start_state.promise()];
				_.when(promises).done(function() {
					statechart.do_initialize({
						substates: substates_value,
						concurrent: is_concurrent_value,
						outgoing_transitions: outgoing_transitions_value,
						incoming_transitions: incoming_transitions_value,
						parent: statechart_parent,
						start_state: start_state_value,
						active: is_active_value,
						puppet: true
					});

					wrapper_client.on("add_substate", function(event) {
						var state_name = event.state_name,
							index = event.index,
							state_wrapper_client = event.state;
						var substate = red.create_remote_statechart(state_wrapper_client);
						statechart.add_substate(state_name, substate, index);
					});
					wrapper_client.on("remove_substate", function(event) {
						var state_name = event.state_name;
						statechart.remove_substate_with_name(state_name);
					});

					wrapper_client.on("rename_substate", function(event) {
						var from_name = event.from,
							to_name = event.to;
						statechart.rename_substate(from_name, to_name);
					});
					wrapper_client.on("move_substate", function(event) {
						var state_name = event.state_name,
							index = event.index;
						statechart.move_state(state_name, index);
					});
					wrapper_client.on("make_concurrent", function(event) {
						statechart.make_concurrent(event.concurrent);
					});
					wrapper_client.on("destroy", function(event) {
						statechart.destroy();
					});
					wrapper_client.on("add_transition", function(event) {
						var transition_wrapper_client = event.transition,
							from_state_wrapper_client = event.from_state,
							to_state_wrapper_client = event.to_state,
							from_state = red.create_remote_statechart(from_state_wrapper_client),
							to_state = red.create_remote_statechart(to_state_wrapper_client),
							transition = red.create_remote_transition(transition_wrapper_client);

						from_state._add_direct_outgoing_transition(transition);
						to_state._add_direct_incoming_transition(transition);
					});
					wrapper_client.on("active", function(event) {
						statechart.set_active(true);
					});
					wrapper_client.on("inactive", function(event) {
						statechart.set_active(false);
					});
				});
			} else {
				statechart = new red.StartState(null, true);

				var outgoing_transition = _.Deferred();
				var outgoing_transition_value;
				wrapper_client.async_get('get_outgoing_transition', function(transition_wrapper) {
					outgoing_transition_value = red.create_remote_transition(transition_wrapper);
					outgoing_transition.resolve();
				});

				var is_active = _.Deferred();
				var is_active_value;
				wrapper_client.async_get('is_active', function(is_it) {
					is_active_value = is_it;
					is_active.resolve();
				});

				var promises = [outgoing_transition.promise(), is_active.promise()];
				_.when(promises).done(function() {
					statechart.do_initialize({
						outgoing_transition: outgoing_transition_value,
						parent: statechart_parent,
						active: is_active_value,
						puppet: true
					});
				});
			}
			statecharts[id] = statechart;
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
			var transition = new red.StatechartTransition(null, true);

			var from = _.Deferred();
			var from_value;
			wrapper_client.async_get('from', function(state_wrapper) {
				from_value = red.create_remote_statechart(state_wrapper);
				from.resolve();
			});

			var to = _.Deferred();
			var to_value;
			wrapper_client.async_get('to', function(state_wrapper) {
				to_value = red.create_remote_statechart(state_wrapper);
				to.resolve();
			});

			var event = _.Deferred();
			var event_value;
			wrapper_client.async_get('event', function(event_wrapper) {
				event_value = red.create_remote_event(event_wrapper);
				event.resolve();
			});
			var promises = [from.promise(), to.promise(), event.promise()];
			_.when(promises).done(function() {
				transition.do_initialize({
					from: from_value,
					to: to_value,
					event: event_value
				});
				wrapper_client.on("setTo", function(event) {
					var state_client_wrapper = event.state,
						state = red.create_remote_statechart(state_client_wrapper);
					transition.setTo(state);
				});
				wrapper_client.on("setFrom", function(event) {
					var state_client_wrapper = event.state,
						state = red.create_remote_statechart(state_client_wrapper);
					transition.setFrom(state);
				});
				wrapper_client.on("remove", function(event) {
					transition.remove();
				});
				wrapper_client.on("destroy", function(event) {
					transition.destroy();
				});
				wrapper_client.on("fire", function(event) {
					var e = event.event;
					transition.fire(e);
				});
			});
		}
	}
	return transition;
};

var events = {};

red.create_remote_event = function(wrapper_client) {
	var id = wrapper_client.cobj_id;
	var event = red.find_uid(id);
	event = null;
	if(!event) {
		if(events.hasOwnProperty(id)) {
			event = events[id];
		} else {
			var event_type = wrapper_client.object_summary.event_type;
			event = red.create_event(event_type, {inert: true});
			if(event_type === "parsed") {
				var str_val = "";
				wrapper_client.async_get("get_str", function(str) {
					event.set_str(str);
				});

				wrapper_client.on("setString", function(str) {
					event.set_str(str);
				});
			}
		}
	}
	return event;
};


}(red));
