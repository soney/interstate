/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var any_state = red.any_state = {};
	var state_descriptor_regex = /\s*(([\w\.]+((\s*,\s*[\w\.]+)*))|\*)(\s*(>(\d+)?-|-(\d+)?>|<(\d+)?-|-(\d+)?<|<-(\d+)?->|>-(\d+)?-<)\s*(([\w\.]+(\s*,\s*[\w\.]+)*)|\*))?\s*/;
	var get_state_description = function (str) {
		return str === "*" ? any_state : _.map(str.split(","), function (str) { return str.trim(); });
	};
	var get_state_listener_info = function (str_descriptor) {
		var matches = str_descriptor.match(state_descriptor_regex);
		if (matches) {
			var from_states = get_state_description(matches[1]);
			var transition = matches[6];
			if (transition) {
				var to_states = get_state_description(matches[13]);

				if (transition.indexOf("<") >= 0 && transition.indexOf(">") < 0) {
					transition = transition.split("").reverse().join("");
					var tmp = from_states;
					from_states = to_states;
					to_states = tmp;
				}

				var transition_no = matches[7] || matches[8] || matches[9] || matches[10] || matches[11] || matches[12] || false;
				if (_.isString(transition_no)) {
					transition_no = parseInt(transition_no, 10);
				}
				var is_bidirectional = ((transition[0] === ">") && (transition[transition.length - 1] === "<")) ||
										((transition[0] === "<") && (transition[transition.length - 1] === ">"));
				return {
					type: "transition",
					from: from_states,
					to: to_states,
					pre: transition[0] === ">",
					bidirectional: is_bidirectional,
					transition_no: transition_no
				};
			} else {
				return {
					type: "state",
					states: from_states
				};
			}
		} else {
			throw new Error(str_descriptor + " does not match format");
		}
	};

	var matches_name = function (statechart, states, state) {
		var i, len;
		if (states === any_state) {
			return true;
		} else {
			var state_name = state.get_name(statechart);
			len = states.length;
			for (i = 0; i < len; i += 1) {
				var s = states[i];
				if (s === state || s === state_name) {
					return true;
				}
			}
			return false;
		}
	};

	var add_transition_listener = function (str, statechart, activation_listener, deactivation_listener, context) {
		context = context || this;

		var listener_info;
		if (_.isString(str)) {
			listener_info = get_state_listener_info(str);
		} else {
			listener_info = str;
		}

		var type = listener_info.type;
		var event_type, listener;
		if (type === "state") {
			event_type = "pre_transition_fire";
			var activated = false;
			listener = function (event) {
				var listener_args = arguments,
					mname = matches_name(statechart, listener_info.states, event.state);
				if (activated === false && mname) {
					activated = true;

					red.event_queue.once("end_event_queue_round_6", function () {
						activation_listener.apply(context, listener_args);
					}, this);
				} else if (activated === true && !mname) {
					activated = false;

					red.event_queue.once("end_event_queue_round_2", function () {
						deactivation_listener.apply(context, listener_args);
					}, this);
				}
			};
		} else if (type === "transition") {
			event_type = listener_info.pre ? "pre_transition_fire" : "post_transition_fire";
			listener = function (event) {
				var transition = event.transition,
					from = transition.from(),
					to = transition.to();

				var desired_transition = false;
				if (_.isNumber(listener_info.transition_no)) {
					var transitions_between = from.get_transitions_to(to);
					desired_transition = transitions_between[listener_info.transition_no];
				}


				if (!desired_transition || transition === desired_transition) {
					if ((matches_name(statechart, listener_info.from, from) &&
							matches_name(statechart, listener_info.to, to)) ||
								(listener_info.bidirectional &&
										matches_name(statechart, listener_info.to, from) &&
										matches_name(statechart, listener_info.from, to))) {

						var listener_args = arguments;
						activation_listener.apply(context, listener_args);

						if (listener_info.pre) {
							red.event_queue.once("end_event_queue_round_1", function () {
								deactivation_listener.apply(context, listener_args);
							});
						} else {
							red.event_queue.once("end_event_queue_round_5", function () {
								deactivation_listener.apply(context, listener_args);
							});
						}
					}
				}
			};
		} else {
			throw new Error("Unexpected type " + type);
		}

		statechart.on(event_type, listener);
		return {
			str: str,
			statechart: statechart,
			activation_listener: activation_listener,
			deactivation_listener: deactivation_listener,
			context: context,
			destroy: function () { statechart.off(event_type, listener); }
		};
	};

	red.Statechart = function (options) {
		options = options || {};
		this._transition_listeners = {};
		red.Statechart.superclass.constructor.apply(this, arguments);
	};
	(function (My) {
		_.proto_extend(My, red.State);
		var proto = My.prototype;

		proto.increment_start_state_times_run = function(self) {
			var outgoing_transition = self._start_state.get_outgoing_transition();
			if(outgoing_transition) {
				outgoing_transition.increment_times_run();
			}
		};

		proto.do_initialize = function (options) {
			this._start_state = options.start_state || new red.StartState({
				parent: this,
				to: options.start_at,
				context: options.context
			});
			this.$substates = options.substates || cjs.map();
			this.$substates.set_value_hash("hash");
			this.$concurrent = cjs.$(options.concurrent === true);
			this._parent = options.parent;
			this.$incoming_transitions = options.incoming_transitions || cjs.array();
			this.$outgoing_transitions = options.outgoing_transitions || cjs.array();

			this._running = options.running === true;
			if(red.__debug_statecharts) {
				this.$running = cjs.$(this._running);
			}

			My.superclass.do_initialize.apply(this, arguments);

			var my_starting_state;
			if (this._running && this._basis) {
				var basis_start_state = this._basis.get_start_state();
				var basis_start_state_to = basis_start_state.getTo();
				
				if (basis_start_state_to === basis_start_state) {
					my_starting_state = this._start_state;
				} else {
					//if(!this.is_puppet()) {
						//this.increment_start_state_times_run(this);
						//_.defer(this.increment_start_state_times_run, this);
					//}
					my_starting_state = red.find_equivalent_state(basis_start_state_to, this);
				}
			} else {
				my_starting_state = this._start_state;
			}

			this.$local_state = cjs.$(my_starting_state);
			if(this.is_active()) {
				if(options.concurrent === true) {
					if(!this.is_puppet()) {
						_.each(this.get_substates(), function(substate) {
							substate.disable_immediate_outgoing_transitions();
							substate.disable_immediate_incoming_transitions();
							substate.set_active(true);
							substate.run();
						});
					}
				} else {
					if(!this.is_puppet()) {
						my_starting_state.enable_outgoing_transitions();
						my_starting_state.set_active(true);
						my_starting_state.run();
					}
				}
			}

			red.register_uid(this._id, this);
			this._initialized.set(true);
			this._emit("initialized");
		};
		if(red.__debug_statecharts) {
			proto.get_$running = function() {
				return this.$running.get();
			};
		}

		proto.is_concurrent = function () { return this.$concurrent.get(); };
		proto.make_concurrent = function (is_concurrent) {
			is_concurrent = is_concurrent === true;
			this.$concurrent.set(is_concurrent);
			this._emit("make_concurrent", {
				target: this,
				concurrent: is_concurrent
			});
			var start_state = this.get_start_state();
			if(!this.is_puppet()) {
				if(is_concurrent) {
					if(this.is_active() || this.parent() === undefined) {
						_.each(this.get_substates(), function(substate) {
							substate.disable_immediate_outgoing_transitions();
							substate.disable_immediate_incoming_transitions();
							substate.set_active(true);
							substate.run();
							var starting_state = substate.get_active_substate();
							starting_state.set_active(true);
							starting_state.run();
						});
					}
					start_state.set_active(false);
				} else {
					//var start_transition = start_state.get_outgoing_transition();
					//var starting_state = start_transition.to();
					var starting_state = this.get_active_substate();
					_.each(this.get_substates(), function(substate) {
						if(substate !== starting_state) {
							substate.set_active(false);
							substate.stop();
						}
					});
					//start_state.set_active(true);
					starting_state.set_active(true);
					starting_state.run();
					starting_state.enable_outgoing_transitions();
				}
			}
			return this;
		};
		proto.get_substates = function (include_start) {
			if(this.$substates) {
				var rv = {};

				this.$substates.each(function (substate, name) {
					rv[name] = substate;
				});

				if (include_start) {
					rv["(start)"] = this.get_start_state();
				}

				return rv;
			} else {
				return [];
			}
		};
		proto.get_start_state = function () { return this._start_state; };
		proto.set_start_state = function (state) {
			cjs.wait();
			if(this._start_state) {
				this._start_state.destroy(true);
			}
			if (this.$local_state && this.$local_state.get() === this.get_start_state()) {
				this.$local_state.set(state);
				this.$local_state.enable_outgoing_transitions();
			}
			this._start_state = state;
			cjs.signal();
		};
		proto.get_incoming_transitions = function () {
			if(this.$incoming_transitions) {
				return this.$incoming_transitions.toArray();
			} else {
				return [];
			}
		};
		proto.get_outgoing_transitions = function () {
			if(this.$outgoing_transitions) {
				return this.$outgoing_transitions.toArray();
			} else {
				return [];
			}
		};
		proto.get_active_substate = function () { return this.$local_state.get(); };
		proto.is_running = function () { return this._running; };

		proto.get_state_index = function (state_name) {
			return this.$substates.indexOf(state_name);
		};

		proto.set_active_substate = function (state, transition, event) {
			//if(uid.strip_prefix(this.id()) == 53) { debugger; }
			if(transition) {
				red.event_queue.once("end_event_queue_round_0", function () {
					this._emit("pre_transition_fire", {
						type: "pre_transition_fire",
						transition: transition,
						target: this,
						event: event,
						state: state
					});
					transition.set_active(true);
				}, this);
				red.event_queue.once("end_event_queue_round_2", function () {
					if(!this.is_concurrent()) {
						transition.increment_times_run();
					}
				}, this);
				red.event_queue.once("end_event_queue_round_3", function () {
					if(this.is_concurrent()) {
						_.each(this.get_substates(true), function(substate) {
							substate.set_active(true);
							substate.enable_outgoing_transitions();
							substate.run();
							if(substate instanceof red.Statechart) {
								var starts_at = substate.get_active_substate();
								substate.set_active_substate(starts_at);
							}
						});
					} else {
						var local_state = this.$local_state.get();
						cjs.wait();
						if(local_state !== state) {
							if (local_state) {
								local_state.stop();
								//local_state.disable_outgoing_transitions();
								local_state.set_active(false);
							}
							local_state = state;
							this.$local_state.set(local_state);
							local_state._last_run_event.set(event);
						}
						if (local_state) {
							local_state.set_active(true);
							//local_state.enable_outgoing_transitions();
							local_state.run();
						}
						cjs.signal();
					}
				}, this);
				red.event_queue.once("end_event_queue_round_4", function () {
					transition.set_active(false);
					this._emit("post_transition_fire", {
						type: "post_transition_fire",
						transition: transition,
						target: this,
						event: event,
						state: state
					});
				}, this);
			} else {
				//cjs.wait();
				if(this.is_concurrent()) {
					_.each(this.get_substates(true), function(substate) {
						substate.set_active(true);
						substate.enable_outgoing_transitions();
						substate.run();
						if(substate instanceof red.Statechart) {
							var starts_at = substate.get_active_substate();
							substate.set_active_substate(starts_at);
						}
					});
				} else {
					var local_state = this.$local_state.get();
					if(local_state !== state) {
						if (local_state) {
							local_state.stop();
							//local_state.disable_outgoing_transitions();
							local_state.set_active(false);
						}
						local_state = state;
						this.$local_state.set(local_state);
					}
					if (local_state) {
						local_state.set_active(true);
						//local_state.enable_outgoing_transitions();
						local_state.run();
					}
				}
				//cjs.signal();
			}
		};
		proto.run = function () {
			if (!this.is_running()) {
				red.event_queue.wait();
				this.enable_outgoing_transitions();

				this._running = true;

				if(this.is_concurrent()) {
					_.each(this.get_substates(), function(substate) {
						substate.run();
						substate.set_active(true);
					});
				} else {
					var start_state = this.get_start_state();
					this.$local_state.set(start_state);
					start_state.enable_outgoing_transitions();
					start_state.run();
					start_state.set_active(true);
				}
				this._emit("run", {
					target: this,
					type: "run"
				});
				if(red.__debug_statecharts) {
					this.$running.set(true);
				}
				red.event_queue.signal();
			}
			return this;
		};
		proto.stop = function () {
			red.event_queue.wait();
			this._running = false;
			this.disable_outgoing_transitions();
			if(this.is_concurrent()) {
				_.forEach(this.get_substates(true), function (substate) {
					substate.set_active(false);
					substate.stop();
				});
			} else {
				var local_state = this.$local_state.get();
				if(local_state) {
					local_state.set_active(false);
					local_state.disable_outgoing_transitions();
				}
				this.$local_state.set(this._start_state);
				_.forEach(this.get_substates(true), function (substate) {
					substate.stop();
				});
			}
			this._emit("stop", {
				type: "stop",
				target: this
			});
			if(red.__debug_statecharts) {
				this.$running.set(false);
			}
			red.event_queue.signal();
			return this;
		};
		proto.reset = function () {
			if (this.is_running()) {
				red.event_queue.wait();
				this.stop();
				this.run();
				red.event_queue.signal();
			}
			return this;
		};
		proto.get_name_for_substate = function (substate) {
			return substate === this.get_start_state() ? "(start)" : this.$substates.keyForValue(substate);
		};
		proto.get_active_direct_substates = function () {
			if (this.is_concurrent()) {
				return this.get_substates();
			} else {
				return [this.$local_state.get()];
			}
		};
		proto.get_active_states = function () {
			return _.chain(this.get_active_direct_substates())
				.map(function (substate) {
					return ([substate]).concat(substate.get_active_states());
				})
				.flatten(true)
				.value();
		};
		proto.get_substate_with_name = function (name) {
			if (name === "(start)") {
				return this.get_start_state();
			} else {
				return this.$substates.get(name);
			}
		};
		proto.has_substate_with_name = function (name) {
			if (name === "(start)") {
				return true;
			} else {
				return this.$substates.has(name);
			}
		};
		proto.find_state = function (state_name, create_superstates, state_value, index) {
			var state;
			if (state_name instanceof red.State) {
				return state_name;
			} else if (_.isArray(state_name)) {
				if (_.isEmpty(state_name)) {
					return this;
				} else {
					var first_state_name = _.first(state_name);
					if (_.size(state_name) === 1) {
						if (!this.has_substate_with_name(first_state_name) && create_superstates === true) {
							this.add_substate(first_state_name, state_value, index);
						}
						state = this.get_substate_with_name(first_state_name);
						return state || undefined;
					} else {
						if (create_superstates === true && !this.has_substate_with_name(first_state_name)) {
							this.add_substate(first_state_name);
						}
						state = this.get_substate_with_name(first_state_name);
						if (!state) {
							return undefined;
						} else {
							return state.find_state(_.rest(state_name), create_superstates, state_value, index);
						}
					}
				}
			} else if (_.isString(state_name)) {
				return this.find_state(state_name.split("."), create_superstates, state_value, index);
			} else {
				return undefined;
			}
		};
		proto.find_transitions = function (from, to, index) {
			from = this.find_state(from);
			to = this.find_state(to);

			if (!from || !to) {
				return undefined;
			}

			var rv = from.get_transitions_to(to);

			if (_.isNumber(index)) {
				return rv[index];
			} else {
				return rv;
			}
		};
		proto.get_substate_index = function (substate) {
			var name = substate.get_name(this);
			return this.$substates.indexOf(name);
		};
		proto.add_substate = function (state_name, state, index) {
			if (state instanceof red.Statechart) {
				state.set_parent(this);
			} else {
				state = new red.Statechart({parent: this, context: this.context()});
			}
			state.on("pre_transition_fire", this.forward_event, this);
			state.on("post_transition_fire", this.forward_event, this);
			this.$substates.put(state_name, state, index);
			this._emit("add_substate", {
				type: "add_substate",
				state_name: state_name,
				state: state,
				index: index
			});
			if(this.is_active() && !this.is_puppet()) {
				if(this.is_concurrent()) {
					state.set_active(true);
					state.run();
					var starts_at = state.get_active_substate();
					state.set_active_substate(starts_at);
				}
			}
		};
		proto.remove_substate = function (name, state, also_destroy) {
			state = state || this.$substates.get(name);

			cjs.wait();
			state.off("pre_transition_fire", this.forward_event, this);
			state.off("post_transition_fire", this.forward_event, this);
			var incoming_transitions = state.get_incoming_transitions();
			var outgoing_transitions = state.get_outgoing_transitions();
			_.each(incoming_transitions, function(transition) {
				var from = transition.from();
				if(from instanceof red.StartState) {
					from.setTo(from);
				} else {
					transition.remove();
				}
			});
			_.forEach(outgoing_transitions, function (transition) {
				transition.remove();
			});
			if (this.get_active_substate() === state) {
				this.set_active_substate(this.get_start_state().getTo());
			}
			this.$substates.remove(name);

			cjs.signal();

			this._emit("remove_substate", {
				type: "remove_substate",
				state: state,
				name: name,
				also_destroy: also_destroy
			});

			if (also_destroy !== false) {
				state.destroy();
			}
		};
		proto.rename_substate = function (from_name, to_name) {
			var keyIndex = this.$substates.indexOf(from_name);
			if (keyIndex >= 0) {
				var substate = this.$substates.get(from_name);
				cjs.wait();
				this.$substates.wait()
					.remove(from_name)
					.put(to_name, substate, keyIndex)
					.signal();
				this._emit("rename_substate", {
					type: "rename_substate",
					state: substate,
					from: from_name,
					to: to_name
				});
				cjs.signal();
			}
		};
		proto.move_substate = function (state_name, index) {
			this.$substates.move(state_name, index);
			this._emit("move_substate", {
				type: "move_substate",
				state_name: state_name,
				index: index
			});
		};
		proto.add_state = function (state_name, state, index) {
	//		if (state_name === "(start)") {
	//			this.set_start_state(state);
	//		} else {
			if (this.find_state(state_name)) {
				throw new Error("State with name '" + state_name + "' already exists.");
			}
			this.find_state(state_name, true, state, index);
	//		}
			return this;
		};
		proto.remove_state = function (state_name, also_destroy) {
			var state = this.find_state(state_name);
			if (!_.isUndefined(state)) {
				var parent = state.parent();
				if (!_.isUndefined(parent)) {
					parent.remove_substate(state_name, state, also_destroy);
				}
			}
			return this;
		};
		proto.rename_state = function (from_name, to_name) {
			var from_state = this.find_state(from_name);
			if (from_state) {
				var from_state_parent = from_state.parent();
				if (from_state_parent) {
					var to_name_arr = to_name.split(".");
					var to_state_parent = this.find_state(_.initial(to_name_arr), true);
					var to_state_name = _.last(to_name_arr);
					if (from_state_parent === to_state_parent) {
						var from_name_arr = from_name.split(".");
						var from_state_name = _.last(from_name_arr);
						from_state_parent.rename_substate(from_state_name, to_state_name);
					} else {
						cjs.wait();
						from_state_parent.remove_state(from_state, false);
						to_state_parent.add_state(to_state_name, from_state);
						cjs.signal();
					}
				}
			}
			return this;
		};
		proto.move_state = function (state_name, index) {
			var state = this.find_state(state_name);
			if (state) {
				var parent = state.parent();
				if (parent) {
					state_name = parent.get_name_for_substate(state);
					parent.move_substate(state_name, index);
				}
			}
			return this;
		};
		proto.destroy = function (silent) {
			//if(this.sid() == 257) {
				//debugger;
			//}
			this._emit("destroy", {
				type: "destroy",
				target: this
			});

			cjs.wait();
			_.forEach(this.get_incoming_transitions(), function (transition) {
				var from = transition.from();
				if(from instanceof red.StartState) {
					from.setTo(from);
				} else {
					transition.remove().destroy();
				}
			});
			_.forEach(this.get_outgoing_transitions(), function (transition) {
				transition.remove().destroy(silent);
			});
			_.forEach(this.get_substates(true), function (substate) {
				substate.destroy(silent);
			});
			if(this.$substates) {
				this.$substates.destroy(silent);
				delete this.$substates;
			}
			delete this._start_state;
			if(this.$concurrent) {
				this.$concurrent.destroy(silent);
				delete this.$concurrent;
			}

			if(this.$incoming_transitions) {
				this.$incoming_transitions.destroy(silent);
				delete this.$incoming_transitions;
			}
			if(this.$outgoing_transitions) {
				this.$outgoing_transitions.destroy(silent);
				delete this.$outgoing_transitions;
			}

			if(this.$local_state) {
				this.$local_state.destroy(true);
				delete this.$local_state;
			}
			//this.get_start_state().destroy();

			My.superclass.destroy.apply(this, arguments);
			cjs.signal();
		};
		proto.get_substate_names = function () {
			return this.$substates.keys();
		};
		/*
		proto.is = function (state) {
			var i;
			state = this.find_state(state);
			if (state) {
				var to_check_lineage = state.get_lineage(this);
				if (to_check_lineage[0] !== this) { //It has a different root
					return false;
				} else {
					var len = to_check_lineage.length - 1;
					for (i = 0; i < len; i += 1) {
						var s = to_check_lineage[i];
						if (!s.is_concurrent() && (s.get_active_substate() !== to_check_lineage[i + 1])) {
							return false;
						}
					}
					return true;
				}
			} else {
				return false;
			}
		};
		proto.contains = function (state, direct) {
			direct = direct !== false;
			state = this.find_state(state);
			if (this === state) {
				return true;
			} else {
				var substates = this.get_substates(true);
				return _.any(substates, function (substate) {
					return substate.contains(state);
				});
			}
		};
		*/
		proto.add_transition = function (arg0, arg1, arg2) {
			var from_state, to_state, transition;
			if (arguments.length === 1) {
				if (arg0 instanceof red.StatechartTransition) {
					transition = arg0;
					from_state = transition.from();
					to_state = transition.to();
				}
			} else {
				from_state = this.find_state(arg0);
				if (!from_state) { throw new Error("No state '" + arg0 + "'"); }
				to_state = this.find_state(arg1);
				if (!to_state) { throw new Error("No state '" + arg1 + "'"); }
				var event = arg2;
				transition = new red.StatechartTransition({from: from_state, to: to_state, event: event});
				this._last_transition  = transition;

				from_state._add_direct_outgoing_transition(transition);
				to_state._add_direct_incoming_transition(transition);
			}

			if (from_state.is_active()) {
				transition.enable();
			} else {
				transition.disable();
			}

			this._emit("add_transition", {
				type: "add_transition",
				target: this,
				transition: transition,
				from_state: from_state,
				to_state: to_state
			});

			return this;
		};
		proto.get_transitions_to = function (to) {
			return this.$outgoing_transitions.filter(function (transition) {
				return transition.to() === to;
			});
		};
		proto.get_transitions_from = function (from) {
			return this.$incoming_transitions.filter(function (transition) {
				return transition.from() === from;
			});
		};
		proto._add_direct_outgoing_transition = function (transition, index) {
			if (_.isNumber(index)) {
				this.$outgoing_transitions.splice(index, 0, transition);
			} else {
				this.$outgoing_transitions.push(transition);
			}
		};
		proto._add_direct_incoming_transition = function (transition, index) {
			if (_.isNumber(index)) {
				this.$incoming_transitions.splice(index, 0, transition);
			} else {
				this.$incoming_transitions.push(transition);
			}
		};
		proto._remove_direct_outgoing_transition = function (transition) {
			var index = this.$outgoing_transitions.indexOf(transition);
			if (index >= 0) {
				this.$outgoing_transitions.splice(index, 1);
			}
		};
		proto._remove_direct_incoming_transition = function (transition) {
			var index = this.$incoming_transitions.indexOf(transition);
			if (index >= 0) {
				this.$incoming_transitions.splice(index, 1);
			}
		};
		proto.get_initial_state = function () {
			var start_state = this.get_start_state();
			return start_state.getTo();
		};
		proto.starts_at = proto.set_initial_state = function (state) {
			state = this.find_state(state, false);
			if (!state) {
				throw new Error("Could not find state " + state);
			}
			var start_state = this.get_start_state();
			start_state.setTo(state);
			return this;
		};

		proto.create_shadow = function (options, defer_initialization) {
			var rv = new red.Statechart(_.extend({
				basis: this,
				concurrent: this.is_concurrent(),
				set_basis_as_root: true
			}, options), defer_initialization);

			return rv;
		};

		proto.get_transitions = function () {
			return (this.get_incoming_transitions()).concat(this.get_outgoing_transitions());
		};

		proto.get_substate_transitions = function () {
			var my_transitions = this.get_transitions();
			return _.uniq(
				_.flatten(
					my_transitions.concat(_.map(this.get_substates(), function (substate) {
						return substate.get_substate_transitions();
					})),
					true
				)
			);
		};

		proto.on_transition = proto.on_state = function (str, activation_listener, deactivation_listener, context) {
			var info = add_transition_listener(str, this, activation_listener, deactivation_listener, context);

			this._emit("on_transition", {
				type: "on_transition",
				target: this,
				str: str,
				activation_listener: activation_listener,
				deactivation_listener: deactivation_listener,
				context: context
			});

			var tlisteners = this._transition_listeners[str];
			if (_.isArray(tlisteners)) {
				tlisteners.push(info);
			} else {
				tlisteners = this._transition_listeners[str] = [info];
			}
			return this;
		};
		proto.off_transition = proto.on_state = function (str, activation_listener, deactivation_listener, context) {
			this._emit("off_transition", {
				type: "off_transition",
				target: this,
				str: str,
				activation_listener: activation_listener,
				deactivation_listener: deactivation_listener,
				context: context
			});
			var tlisteners = this._transition_listeners[str];
			var i;
			if (_.isArray(tlisteners)) {
				for (i = 0; i < tlisteners.length; i += 1) {
					var tlistener = tlisteners[i];
					if (tlistener.activation_listener === activation_listener &&
							tlistener.deactivation_listener === deactivation_listener) {
						tlistener.destroy();
						tlisteners.splice(i, 1);
						i -= 1;
					}
				}
				if (tlisteners.length === 0) {
					delete this._transition_listeners[str];
				}
			}
		};
		proto.print = function () {
			red.print_statechart.apply(red, ([this]).concat(_.toArray(arguments)));
		};

		red.register_serializable_type("statechart",
			function (x) {
				return x instanceof My;
			},
			function (include_id) {
				var arg_array = _.toArray(arguments);
				var rv = {
					substates: red.serialize.apply(red, ([this.$substates]).concat(arg_array)),
					concurrent: this.is_concurrent(),
					start_state: red.serialize.apply(red, ([this.get_start_state()]).concat(arg_array)),
					outgoing_transitions: red.serialize.apply(red,
															([this.$outgoing_transitions]).concat(arg_array)),
					incoming_transitions: red.serialize.apply(red,
															([this.$incoming_transitions]).concat(arg_array)),
					parent: red.serialize.apply(red, ([this.parent()]).concat(arg_array))
				};
				if (include_id) {
					rv.id = this.id();
				}
				return rv;
			},
			function (obj) {
				var rest_args = _.rest(arguments);
				var rv;
				if (obj.id) {
					rv = red.find_uid(obj.id);
					if (rv) {
						return rv;
					}
				}
				rv = new My({id: obj.id}, true);
				rv.initialize = function () {
					var options = {
						substates: red.deserialize.apply(red, ([obj.substates]).concat(rest_args)),
						concurrent: obj.concurrent,
						start_state: red.deserialize.apply(red, ([obj.start_state]).concat(rest_args)),
						outgoing_transitions: red.deserialize.apply(red,
															([obj.outgoing_transitions]).concat(rest_args)),
						incoming_transitions: red.deserialize.apply(red,
															([obj.incoming_transitions]).concat(rest_args)),
						parent: red.deserialize.apply(red, ([obj.parent]).concat(rest_args))
					};
					this.do_initialize(options);
				};

				return rv;
			});
	}(red.Statechart));
	/*

	red.define("statechart", function (options) {
		return new red.Statechart(options);
	});
	*/
}(red));
