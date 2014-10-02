/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualState = function (options) {
		ist.ContextualState.superclass.constructor.apply(this, arguments);
		this._type = "statechart";

		var object = this.get_object(),
			pointer = this.get_pointer(),
			ptr = pointer,
			running, active;

		this.sub_children = new RedMap({
			hash: "hash"
		});
		if(object.isRoot()) {
			this._parent = false;
			this._root = this;
			this._running = true;
			this._active = true;

			ptr = ptr.pop();
			this._statefulObj = ptr.length() > 0 ? ptr.getContextualObject() : false;
		} else {
			var pointer = this.get_pointer(),
				obj_parent = object.parent(),
				obj_root = object.root();

			this._parent = pointer.pop().getContextualObject();

			var lineage = object.getLineage(),
				ptr = pointer;
			_.each(_.rest(lineage), function() {
				ptr = ptr.pop();
			});

			this._root = ptr.getContextualObject();

			ptr = ptr.pop();
			this._statefulObj = ptr.length() > 0 ? ptr.getContextualObject() : false;

			this._running = false;
			this._active = false;
		}

		this.$running = cjs(this._running);
		this.$active = cjs(this._active);
		this.$event = cjs(false);
		this._localState = false;
		this.cell_children = [];
		//this._localState = this.getStartState();
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function(options) {
			if(this.constructor === My) { this.flag_as_initialized();  }
			My.superclass.initialize.apply(this, arguments);

			if(!this.isStart()) {
				if(!this.isConcurrent()) {
					this._localState = this.getStartState();
				}
			}
			if(this.isRoot()) {
				if(this.isConcurrent()) {
					
				} else {
					if(this.isRunning()) {
						this._localState.run();
					}
					if(this.isActive()) {
						this._localState.activate();
					}
				}
			}
			this._add_cobj_child_updater();

			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto.begin_destroy = function() {
			this._remove_cobj_child_updater();

			My.superclass.begin_destroy.apply(this, arguments);
		};
		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }
			My.superclass.destroy.apply(this, arguments);
			this.otugoing_transitions.destroy(true);
		};
		proto.setEvent = function(event) {
			this.$event.set(event);	
		};
		proto.isStart = function() {
			var object = this.get_object();
			return object.isStart();
		};

		proto.run = function () {
			if (!this.isRunning()) {
				ist.event_queue.wait();

				this._running = true;
				this.$running.set(true);

				var isActive = this.isActive();

				if(isActive) {
					this.enableOutgoingTransitions();
				}

				_.each(this.getActiveSubstates(), function(substate) {
					substate.run();
					if(isActive) { substate.activate(); }
				});


				this._emit("run", {
					target: this,
					type: "run"
				});
				ist.event_queue.signal();
			}
		};

		proto.stop = function () {
			if(this.isRunning()) {
				ist.event_queue.wait();
				this._running = false;

				if(this.isActive()) {
					this.disableOutgoingTransitions();

					_.each(this.getActiveSubstates(), function(substate) {
						substate.stop();
					});
				}

				this._emit("stop", {
					type: "stop",
					target: this
				});
				this.$running.set(false);
				ist.event_queue.signal();
			}
		};
		proto.reset = function () {
			if (this.isRunning()) {
				ist.event_queue.wait();
				this.stop();
				this.setActiveSubstate(this.getStartState());
				this.run();
				ist.event_queue.signal();
			}
			return this;
		};
		proto.isRunning = function() {
			return this._running;
		};

		proto.activate = function() {
			if(!this.isActive()) {
				var isRunning = this.isRunning();
				this._active = true;
				this.$active.set(true);

				_.each(this.getActiveSubstates(), function(substate) {
					substate.activate();
					if(isRunning) { substate.run(); }
				});

				if(isRunning) {
					this.enableOutgoingTransitions();
				}
			}

			this._emit("active", {
				type: "active",
				target: this
			});
		};
		proto.deactivate = function() {
			if(this.isActive()) {
				this._active = false;
				this.$active.set(false);

				_.each(this.getSubstates(true), function(substate) {
					substate.deactivate();
				}, this);
				
				this.disableOutgoingTransitions();

				this._emit("inactive", {
					type: "inactive",
					target: this
				});
			}
		};
		proto.flattenSubstates = function (include_start) {
			return _.flatten(_.map(this.getSubstates(include_start), function (substate) {
				return substate.flattenSubstates(include_start);
			})).concat([this]);
		};

		proto.getAllTransitions = function() {
			var flat_substates = this.flattenSubstates(false),
				transitions = _	.chain(flat_substates)
								.map(function(substate) {
									return substate.getIncomingTransitions();
								})
								.flatten(true)
								.value();
			return transitions;
		};

		proto.getIncomingTransitions = function() {
			var object = this.get_object(),
				root = this.root(),
				root_pointer = root.get_pointer(),
				pointer = this.get_pointer(),
				transitions = object.getIncomingTransitions(),
				contextual_transitions = _.map(transitions, function(transition) {
					var from = transition.from(),
						from_lineage = from.getLineage(),
						from_ptr = root_pointer;

					_.each(_.rest(from_lineage), function(state) {
						from_ptr = from_ptr.push(state);
					});
					from_ptr = from_ptr.push(transition);
					return from_ptr.getContextualObject();
				});
			return contextual_transitions;
		};
		proto.getOutgoingTransitions = function() {
			var object = this.get_object(),
				pointer = this.get_pointer(),
				transitions = object.getOutgoingTransitions(),
				contextual_transitions = _.map(transitions, function(transition) {
					var ptr = pointer.push(transition);
					return ptr.getContextualObject();
				});
			return contextual_transitions;
		};
		proto.isActive = function() {
			return this.$active && this.$active.get();
		};
		proto.getName = function (relative_to) {
			var parent = this.parent();
			if (!relative_to) {
				relative_to = this.root();
			} else if (relative_to === 'parent') {
				relative_to = parent;
			}

			var my_name = parent ? parent.getNameForSubstate(this) : "";
			if (parent === relative_to) {
				return my_name;
			} else {
				var parent_name = parent ? parent.getName(relative_to) : "";
				if (parent_name === "") {
					return my_name;
				} else {
					return parent_name + "." + my_name;
				}
			}
		};
		proto.getNameForSubstate = function(substate) {
			var substate_obj = substate.get_object(),
				obj = this.get_object();

			return obj.getNameForSubstate(substate_obj);
		};
		proto.parent = function () { return this._parent; };
		proto.root = function () { return this._root; };
		proto.isConcurrent = function() {
			var object = this.get_object();
			return object.isConcurrent();
		};

		proto.getLineage = function (until_state) {
			var curr_node = this,
				parentage = [],
				i = 0;

			do {
				parentage[i] = curr_node;
				i += 1;
				if (curr_node === until_state) { break; }
				curr_node = curr_node.parent();
			} while (curr_node);

			return parentage.reverse();
		};

		proto._get_valid_cobj_children = function() {
			var object = this.get_object(),
				outgoingTransitions = object.getOutgoingTransitions(),
				pointer = this.get_pointer(),
				substates = _.pluck(object.getSubstates(), "value"),
				rv = _.map(substates.concat(outgoingTransitions), function(x) {
					return {
						obj: x,
						pointer: pointer.push(x)
					};
				}).concat(_.map(this.getManualChildren(), function(x) {
					return {
						obj: x,
						pointer: pointer.push(x)
					};
				}));
			return rv;
		};

		proto._onOutgoingTransitionFire = function (transition, event) {
			if(this.isActive() && this.isRunning() && _.indexOf(this.getOutgoingTransitions(), transition)>=0) {
				//transition._setEvent(event);
				var my_lineage = this.getLineage(),
					to = transition.to(),
					to_lineage = to.getLineage(),
					to_len = to_lineage.length,
					min_len = Math.min(to_len, my_lineage.length),
					i;

				for (i = 0; i < min_len; i += 1) {
					if (to_lineage[i] !== my_lineage[i]) {
						i--; //back up...
						break;
					}
				}
				if (i === to_len) { //if it is a self-transition. Just handle it on the lowest level possible
					i -= 2;
				}


				//cjs.wait();
				var active_substate, parent, min_common_i = i;
				while (i < to_len - 1) {
					parent = to_lineage[i];
					active_substate = to_lineage[i + 1];
					parent.setActiveSubstate(active_substate, transition, event);
					i++;
				}

				if(!active_substate.isStart()) {
					var start_state = active_substate.getStartState();
					active_substate.setActiveSubstate(start_state, transition, event);
				}

				ist.event_queue.once("end_event_queue_round_0", function () {
					this._emit("pre_transition_fire", {
						type: "pre_transition_fire",
						transition: transition,
						//target: this,
						event: event,
						state: to
					});
					transition.activate();
				}, this);

				ist.event_queue.once("end_event_queue_round_2", function () {
					transition.incrementTimesRun();
				}, this);

				ist.event_queue.once("end_event_queue_round_4", function () {
					transition.deactivate();
					this._emit("post_transition_fire", {
						type: "post_transition_fire",
						transition: transition,
						//target: this,
						event: event,
						state: to
					});
				}, this);

				//cjs.signal();
				return true;
			}
			return false;
		};

		//proto.getActiveSubstate = function() {
			//return this._localState;
		//};
		proto.getActiveDirectSubstates = function () {
			if (this.isConcurrent()) {
				return this.getSubstates();
			} else if (this._localState && this._localState.isActive()) {
				return [this._localState];
			} else {
				return [];
			}
		};
		proto.getActiveSubstates = function () {
			return _.chain(this.getActiveDirectSubstates())
					.map(function (substate) {
						return ([substate]).concat(substate.getActiveSubstates());
					})
					.flatten(true)
					.value();
		};

		proto.setActiveSubstate = function(state, transition, event) {
			var doActivate = function() {
				var isRunning = this.isRunning();
				if(this.isConcurrent()) {
					_.each(this.getSubstates(true), function(substate) {
						substate.activate();
						if(isRunning) {
							substate.run();
						}
					});
				} else {
					var local_state = this._localState;

					cjs.wait();
					if(local_state !== state) {
						if (local_state) {
							local_state.stop();
							local_state.deactivate();
						}
						local_state = state;
						this._localState = state;
						local_state.setEvent(event);
					}
					if (local_state) {
						local_state.activate();
						if(isRunning) { local_state.run(); }
					}
					cjs.signal();
				}
			};
			if(transition) {
				ist.event_queue.once("end_event_queue_round_3", doActivate, this);
			} else {
				doActivate.call(this);
			}
		};

		proto.summarizeStatechart = function() {
			var substates = this.getSubstates(true),
				substate_map = {},
				outgoingTransitions = _.map(this.getOutgoingTransitions(), function(t) {
					return t.summarizeTransition();
				}),
				incomingTransitions= _.map(this.getIncomingTransitions(), function(t) {
					return t.summarizeTransition();
				});

			_.each(substates, function(value, key) {
				substate_map[key] = value.summarizeStatechart();
			});

			return {
				state: this,
				type: "state",
				id: this.id(),
				isStart: this.isStart(),
				isRoot: this.isRoot(),
				substates: substate_map,
				isConcurrent: this.isConcurrent(),
				outgoingTransitions: outgoingTransitions,
				incomingTransitions: incomingTransitions,
				usedByAnyProperties: this.usedByAnyProperties()
			};
		};

		proto.usedByAnyProperties = function() {
			return this._statefulObj.usesState(this);
		};

		proto.order = function (other_state) {
			var i;
			// return 1 if other_state is ">" me (as in should be further right)
			// return -1 if other_state is "<" me (as in should be further left)
			// return 0 if other_state is "==" me (same thing)

			var my_lineage = this.getLineage(),
				other_lineage = other_state.getLineage(),
				mli = my_lineage[0],
				oli = other_lineage[0];

			if(mli !== oli) { // different root
				return 0;
			}

			var len = Math.min(my_lineage.length, other_lineage.length),
				index_me, index_o;

			for (i = 1; i < len; i += 1) {
				index_me = mli.getStateIndex(my_lineage[i]);
				index_o = oli.getStateIndex(other_lineage[i]);
				if (index_me < index_o) {
					return 1;
				} else if (index_me > index_o) {
					return -1;
				}
				mli = my_lineage[i];
				oli = other_lineage[i];
			}

			if (other_lineage.length > my_lineage.length) { // It is more specific
				return -1;
			} else if (other_lineage.length < my_lineage.length) {
				return 1;
			} else { // We are exactly the same
				return 0;
			}
		};
		proto.getStateIndex = function(substate) {
			var name = this.getNameForSubstate(substate),
				state = this.get_object();
			return state.getStateIndex(name);
		};
		proto.enableOutgoingTransitions = function () {
			var outgoing_transitions = this.getOutgoingTransitions();
			_.each(outgoing_transitions, function (x) { x.enable(); });
		};
		proto.disableOutgoingTransitions = function () {
			this._disableImmediateOutgoingTransitions();
			var substates = this.getSubstates();
			_.each(substates, function (x) { x._disableImmediateOutgoingTransitions(); });
		};
		proto._disableImmediateOutgoingTransitions = function() {
			var transitions = this.getOutgoingTransitions();
			_.each(transitions, function (x) { x.disable(); });
		};
		proto._disableImmediateIncomingTransitions = function() {
			var transitions = this.getIncomingTransitions();
			_.each(transitions, function (x) { x.disable(); });
		};
		proto.parentIsConcurrent = function() {
			var parent = this.parent();
			return parent && parent.isConcurrent();
		};
		proto.getSubstates = function(include_start) {
			var object = this.get_object(),
				pointer = this.get_pointer(),
				substates = object.getSubstates(),
				rv = {};

			_.each(substates, function(substate_info) {
				var substate = substate_info.value,
					name = substate_info.key,
					ptr = pointer.push(substate);

				if(name === ist.START_SATATE_NAME && !include_start) {
					return;
				}

				rv[name] = ptr.getContextualObject();
			});

			return rv;
		};
		proto.getSubstate = function(name) {
			var object = this.get_object(),
				substate = object.getSubstate(name);
			if(substate) {
				var pointer = this.get_pointer(),
					substate_pointer = pointer.push(substate);
				return substate_pointer.getContextualObject();
			} else {
				return false;
			}
		};
		proto.getStartState = function() {
			var object = this.get_object(),
				substate = object.getStartState();
			if(substate) {
				var pointer = this.get_pointer(),
					substate_pointer = pointer.push(substate);
				return substate_pointer.getContextualObject();
			} else {
				return false;
			}
		};
		proto.isRoot = function() {
			return this.get_object().isRoot();
		};

		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }
			My.superclass.destroy.apply(this, arguments);
			this.$running.destroy(true);
			this.$active.destroy(true);
			this.$event.destroy(true);
			this._localState = false;
		};

		proto.pause = function() {
			if(this.is_active()) {
				this.disable_immediate_outgoing_transitions();

				_.each(this.get_substates(true), function(substate) {
					substate.pause();
				});
			}
		};
		proto.resume = function() {
			if(this.is_active()) {
				this.enable_outgoing_transitions();

				_.each(this.get_substates(true), function(substate) {
					substate.resume();
				});
			}
		};
		proto.has = function(key) {
			return key === "event";
		};
		proto.print = function() {
			ist.print_statechart.apply(ist, ([this]).concat(_.toArray(arguments)));
		};
	}(ist.ContextualState));
}(interstate));
