/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var statecharts = {};

	ist.create_remote_statechart = function (wrapper_client, statechart_parent) {
		var id = wrapper_client.cobj_id;
		var statechart = ist.find_uid(id);
		var is_active, is_active_value, is_running, is_running_value, promises, listeners;
		var destroyed = false;
		
		statechart = false;
		if (!statechart) {
			wrapper_client.signal_interest();
			if (statecharts.hasOwnProperty(id)) {
				statechart = statecharts[id];
				if (statechart_parent && statechart.parent() !== statechart_parent) {
					statechart.set_parent(statechart_parent);
				}
			} else {
				var type = wrapper_client.type();
				if (type === "statechart") {
					statechart = statecharts[id] = new ist.Statechart({
						avoid_constructor: true
					});
					statechart.puppet_master_id = id;
					var substates = _.Deferred();
					var substates_value;
					var substate_promises = [];
					wrapper_client.async_get('get_substates', function (substate_wrappers) {
						substates_value = cjs.map({ });

						_.each(substate_wrappers, function (substate_wrapper, name) {
							var substate = ist.create_remote_statechart(substate_wrapper, statechart);
							substates_value.put(name, substate);
							if (!substate.is_constructed()) {
								var substate_promise = _.Deferred();
								substate_promises.push(substate_promise.promise());
								substate.once("_constructed", function () {
									substate_promise.resolve();
								});
							}
						});
						substates.resolve();
					});

					var start_state = _.Deferred();
					var start_state_value;
					wrapper_client.async_get('get_start_state', function (substate_wrapper) {
						start_state_value = ist.create_remote_statechart(substate_wrapper, statechart);
						if(!start_state_value.is_constructed()) {
							var start_state_promise = _.Deferred();
							substate_promises.push(start_state_promise.promise());
							start_state_value.once("_constructed", function () {
								start_state_promise.resolve();
							});
						}
						start_state.resolve();
					});


					var outgoing_transitions = _.Deferred();
					var outgoing_transitions_value;
					wrapper_client.async_get('get_outgoing_transitions', function (transition_wrappers) {
						var outgoing_transitions_value_arr = _.map(transition_wrappers, function (transition_wrapper, name) {
							var transition = ist.create_remote_transition(transition_wrapper);
							return transition;
						});
						outgoing_transitions_value = cjs.array({value: outgoing_transitions_value_arr});
						outgoing_transitions.resolve();
					});

					var incoming_transitions = _.Deferred();
					var incoming_transitions_value;
					wrapper_client.async_get('get_incoming_transitions', function (transition_wrappers) {
						var incoming_transitions_value_arr = _.map(transition_wrappers, function (transition_wrapper, name) {
							var transition = ist.create_remote_transition(transition_wrapper);
							return transition;
						});
						incoming_transitions_value = cjs.array({value: incoming_transitions_value_arr});
						incoming_transitions.resolve();
					});

					var is_concurrent = _.Deferred();
					var is_concurrent_value;
					wrapper_client.async_get('is_concurrent', function (is_it) {
						is_concurrent_value = is_it;
						is_concurrent.resolve();
					});

					is_active = _.Deferred();
					wrapper_client.async_get('is_active', function (is_it) {
						is_active_value = is_it;
						is_active.resolve();
					});

					is_running = _.Deferred();
					wrapper_client.async_get('is_running', function (is_it) {
						is_running_value = is_it;
						is_running.resolve();
					});

					promises = [substates.promise(), outgoing_transitions.promise(),
									incoming_transitions.promise(), is_concurrent.promise(),
									is_active.promise(), start_state.promise(), is_running.promise()];

					listeners = {
						add_substate: function(event) {
							var state_name = event.state_name,
								index = event.index,
								state_wrapper_client = event.state;
							var substate = ist.create_remote_statechart(state_wrapper_client, statechart);
							statechart.add_substate(state_name, substate, index);
						},
						remove_substate: function (event) {
							var state_name = event.name;
							statechart.remove_substate(state_name, undefined, false);
						},
						rename_substate: function (event) {
							var from_name = event.from,
								to_name = event.to;
							statechart.rename_substate(from_name, to_name);
						},
						move_substate: function (event) {
							var state_name = event.state_name,
								index = event.index;
							statechart.move_state(state_name, index);
						},
						make_concurrent: function (event) {
							statechart.make_concurrent(event.concurrent);
						},
						destroy: function (event) {
							statechart.destroy();
						},
						add_transition: function (event) {
							var transition_wrapper_client = event.transition,
								from_state_wrapper_client = event.from_state,
								to_state_wrapper_client = event.to_state,
								from_state = ist.create_remote_statechart(from_state_wrapper_client),
								to_state = ist.create_remote_statechart(to_state_wrapper_client),
								transition = ist.create_remote_transition(transition_wrapper_client);

							from_state._add_direct_outgoing_transition(transition);
							to_state._add_direct_incoming_transition(transition);
						},
						active: function(event) {
							statechart.set_active(true);
						},
						inactive: function (event) {
							statechart.set_active(false);
						},
						run: function(event) {
							statechart.run();
						},
						stop: function(event) {
							statechart.stop();
						}
					};
					_.when(promises).done(function () {
						if(statechart.destroyed) { return; }

						_.when(substate_promises).done(function () {
							if(destroyed) { return; }
							ist.Statechart.call(statechart, {
								substates: substates_value,
								concurrent: is_concurrent_value,
								outgoing_transitions: outgoing_transitions_value,
								incoming_transitions: incoming_transitions_value,
								parent: statechart_parent,
								start_state: start_state_value,
								active: is_active_value,
								puppet: true,
								running: is_running_value
							});
							wrapper_client.on(listeners);
							if(statechart_parent) {
								statechart._emit("_constructed");
							}
						});
					});
				} else {
					statechart = statecharts[id] = new ist.StartState({
							avoid_constructor: true
						});
					statechart.puppet_master_id = id;

					var outgoing_transition = _.Deferred();
					var outgoing_transition_value;
					listeners = {
						active: function(event) {
							statechart.set_active(true);
						},
						inactive: function (event) {
							statechart.set_active(false);
						},
						run: function(event) {
							statechart.run();
						},
						stop: function(event) {
							statechart.stop();
						}

					};

					wrapper_client.async_get('get_outgoing_transition', function (transition_wrapper) {
						outgoing_transition_value = ist.create_remote_transition(transition_wrapper);

						// Wait for a resolution so that we can know if the to state is me
						if(outgoing_transition_value.is_initialized()) {
							outgoing_transition.resolve();
						} else {
							outgoing_transition_value.once("_constructed", function() {
								outgoing_transition.resolve();
							});
						}
					});

					is_active = _.Deferred();
					wrapper_client.async_get('is_active', function (is_it) {
						is_active_value = is_it;
						is_active.resolve();
					});

					is_running = _.Deferred();
					wrapper_client.async_get('is_running', function (is_it) {
						is_running_value = is_it;
						is_running.resolve();
					});

					promises = [outgoing_transition.promise(), is_active.promise(), is_running.promise()];
					_.when(promises).done(function () {
						if(statechart.destroyed) { return; }
						ist.StartState.call(statechart, {
								outgoing_transition: outgoing_transition_value,
								parent: statechart_parent,
								active: is_active_value,
								puppet: true,
								running: is_running_value
							});
						statechart._emit("_constructed");
						wrapper_client.on(listeners);
					});
				}
			}
			var on_destroy = function() {
				destroyed = true;
				statechart.off("destroy", on_destroy);
				wrapper_client.off(listeners);
				//wrapper_client.signal_destroy();
				delete statecharts[id];
			};
			statechart.on("destroy", on_destroy);
			if(!statechart_parent) {
				wrapper_client.on("wc_destroy", function() {
					if(!statechart.destroyed) {
						statechart.destroy();
					}
				});
			}
		}
		return statechart;
	};

	var transitions = {};

	ist.create_remote_transition = function (wrapper_client) {
		var id = wrapper_client.cobj_id;
		var transition = ist.find_uid(id);
		var listeners;
		transition = false;
		var destroyed = false;
		if (!transition) {
			wrapper_client.signal_interest();
			if (transitions.hasOwnProperty(id)) {
				transition = transitions[id];
			} else {
				transition = transitions[id] = new ist.StatechartTransition({
							avoid_constructor: true
						});
				transition.puppet_master_id = id;

				var from = _.Deferred();
				var from_value;
				wrapper_client.async_get('from', function (state_wrapper) {
					from_value = ist.create_remote_statechart(state_wrapper);
					from.resolve();
				});

				var to = _.Deferred();
				var to_value;
				wrapper_client.async_get('to', function (state_wrapper) {
					to_value = ist.create_remote_statechart(state_wrapper);
					to.resolve();
				});

				var event = _.Deferred();
				var event_value;
				wrapper_client.async_get('event', function (event_wrapper) {
					event_value = ist.create_remote_event(event_wrapper);
					event.resolve();
				});
				listeners = {
					setTo: function (event) {
						var state_client_wrapper = event.state,
							state = ist.create_remote_statechart(state_client_wrapper);
						transition.setTo(state);
					},
					setFrom: function (event) {
						var state_client_wrapper = event.state,
							state = ist.create_remote_statechart(state_client_wrapper);
						transition.setFrom(state);
					},
					remove: function (event) {
						transition.remove();
					},
					destroy: function (event) {
						transition.destroy();
					},
					fire: function (event) {
						var e = event.event;
						transition.fire(e);
					}
				};
				var promises = [from.promise(), to.promise(), event.promise()];
				_.when(promises).done(function () {
					if(destroyed) { return; }
					ist.StatechartTransition.call(transition, {
							from: from_value,
							to: to_value,
							event: event_value,
							puppet: true
						});
					transition._emit("_constructed");
					wrapper_client.on(listeners);
				});
			}

			var on_destroy = function() {
				wrapper_client.off(listeners);
				transition.off("destroy", on_destroy);
				wrapper_client.signal_destroy();
				delete transitions[id];
			};
			transition.on("destroy", on_destroy);
		}
		return transition;
	};

	var events = {};

	ist.create_remote_event = function (wrapper_client) {
		var id = wrapper_client.cobj_id;
		var event = ist.find_uid(id);
		var listeners;
		var destroyed = false;
		event = false;
		if (!event) {
			wrapper_client.signal_interest();
			if (events.hasOwnProperty(id)) {
				event = events[id];
				listeners = {};
			} else {
				var event_type = wrapper_client.object_summary.event_type;

				if(event_type === "statechart_event") {
					event = events[id] = new ist.StatechartEvent({inert: true});
				} else if (event_type === "parsed_event") {
					event = events[id] = new ist.ParsedEvent({inert: true});
					var str_val = "";
					wrapper_client.async_get("get_str", function (str) {
						if(destroyed) { return; }
						event.set_str(str);
					});
					var $errors = wrapper_client.get_$("get_errors");
					var live_errors = cjs.liven(function() {
						if(destroyed) { return; }
						var errors = $errors.get();
						if(errors && errors.length > 0) {
							event.$errors.set(errors);
							event._has_errors = true;
						} else {
							if(event._has_errors) {
								event.$errors.set([]);
								event._has_errors = false;
							}
						}
					}, {
						destroy: function() {
							$errors.signal_destroy();
							$errors = null;
						}
					});
					listeners = {
						setString: function (e) {
							var str = e.to;
							event.set_str(str);
						}
					};

					wrapper_client.on(listeners);
				}
			}

			var on_destroy = function() {
				destroyed = true;
				if(live_errors) {
					live_errors.destroy();
					live_errors = null;
				}
				wrapper_client.off(listeners);
				event.off("destroy", on_destroy);
				wrapper_client.signal_destroy();
				delete events[id];
			};
			event.on("destroy", on_destroy);
		}
		return event;
	};
}(interstate));
