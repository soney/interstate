/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualState = function (options) {
		ist.ContextualState.superclass.constructor.apply(this, arguments);
		this._type = "statechart";


		this._running = options.running === true;
		this.$running = cjs(this._running);

		var object = this.get_object(),
			pointer = this.get_pointer(),
			obj_parent = object.parent(),
			obj_root = object.root();
		
		this._parent = obj_parent ? pointer.replace(obj_parent).getContextualObject() : false;
		this._root = obj_root ? (obj_root === object ? this : pointer.replace(obj_root).getContextualObject()) : false;

		this.$active = cjs(options.active === true || !this._parent);
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function(options) {
			if(this.constructor === My) { this.flag_as_initialized();  }
			My.superclass.initialize.apply(this, arguments);
			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }
			My.superclass.destroy.apply(this, arguments);
		};

		proto.run = function () {
			if(this.is_puppet()) {
				this._running = true;
				this._emit("run", {
					target: this,
					type: "run"
				});
				this.$running.set(true);
			} else if (!this.is_running()) {
				ist.event_queue.wait();
				this.enable_outgoing_transitions();

				this._running = true;
				this._emit("run", {
					target: this,
					type: "run"
				});
				this.$running.set(true);
				ist.event_queue.signal();
			}
		};

		proto.stop = function () {
			if(this.is_puppet()) {
				this._running = false;
				this._emit("stop", {
					type: "stop",
					target: this
				});
				this.$running.set(false);
			} else {
				ist.event_queue.wait();
				this._running = false;
				this.disable_outgoing_transitions();
				this._emit("stop", {
					type: "stop",
					target: this
				});
				this.$running.set(false);
				ist.event_queue.signal();
			}
		};
		proto.reset = function () {
			if (this.is_running()) {
				ist.event_queue.wait();
				this.stop();
				this.run();
				ist.event_queue.signal();
			}
			return this;
		};

/*
		proto.set_basis = function (basis, as_root) {
			if (this._basis) {
				this.remove_basis_listeners();
			}
			this._basis = basis;
			if (this._basis) {
				if (this._basis instanceof ist.Statechart) {
					var basis_start_state = this._basis.get_start_state();
					var basis_start_state_to = basis_start_state.getTo();
					var is_running = this.is_running();
					var my_context = this.context();
					var is_concurrent = this.is_concurrent();

					_.each(basis.get_substates(true), function (substate, name) {
						var shadow = substate.create_shadow({
							context: my_context,
							parent: this,
							running: is_running && (basis_start_state_to === substate || is_concurrent),
							active: is_running && (basis_start_state_to === substate || is_concurrent),
							set_basis_as_root: false
						});
						if (shadow instanceof ist.StartState) {
							this.set_start_state(shadow);
						} else {
							this.add_substate(name, shadow);
						}
					}, this);
					_.each(this._basis._transition_listeners, function (listeners, name) {
						_.each(listeners, function (info) {
							this.on_transition(info.str, info.activation_listener, info.deactivation_listener, info.context);
						}, this);
					}, this);
				}
				if (as_root === true) { // When all of the substates have been copied
					var parent_statechart = this,
						context = this.context();

					var create_transition_shadow = _.memoize(function (transition) {
						var from = ist.find_equivalent_state(transition.from(), parent_statechart);
						var to = ist.find_equivalent_state(transition.to(), parent_statechart);
						return transition.create_shadow(from, to, parent_statechart, context);
					}, function (transition, from) {
						return transition.id();
					});

					this.do_shadow_transitions(create_transition_shadow);
				}

				this.add_basis_listeners();
			}
			return this;
		};
		*/

		proto.do_shadow_transitions = function(create_transition_shadow) {
			var basis = this.basis();
			var outgoing_transitions = basis.get_outgoing_transitions();
			var shadow_outgoing = _.map(outgoing_transitions, create_transition_shadow);

			_.each(shadow_outgoing, function (transition) {
				var from = transition.from();
				var to = transition.to();
				from._add_direct_outgoing_transition(transition);
				to._add_direct_incoming_transition(transition);
			}, this);

			var substates = this.get_substates(true);
			_.each(substates, function(substate) {
				substate.do_shadow_transitions(create_transition_shadow);
			}, this);
		};

		proto.set_active = function (to_active) {
			if(this.$active) {
				this.$active.set(to_active === true);
				if(!to_active) {
					_.each(this.get_substates(true), function(substate) {
						substate.set_active(false);
						substate.disable_outgoing_transitions();
						substate.stop();
					}, this);
				}
				var event_type = to_active ? "active" : "inactive";
				this._emit(event_type, {
					type: event_type,
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
				pointer = this.get_pointer(),
				transitions = object.getIncomingTransitions(),
				contextual_transitions = _.map(transitions, function(transition) {
					var ptr = pointer.replace(transition);
					return ptr.getContextualObject();
				});
			return contextual_transitions;
		};
		proto.getOutgoingTransitions = function() {
			var object = this.get_object(),
				pointer = this.get_pointer(),
				transitions = object.getOutgoingTransitions(),
				contextual_transitions = _.map(transitions, function(transition) {
					var ptr = pointer.replace(transition);
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
		proto.context = function () { return this._context; };
		proto.original_context = function() { return this._original_context; };

		proto.is_child_of = function (node) {
			var curr_parent = this.parent();
			while (curr_parent) {
				if (curr_parent === node) {
					return true;
				}
				curr_parent = curr_parent.parent();
			}
			return false;
		};

		proto.get_lineage = function (until_state) {
			var curr_node = this;
			var parentage = [];
			var i = 0;
			do {
				parentage[i] = curr_node;
				i += 1;
				if (curr_node === until_state) { break; }
				curr_node = curr_node.parent();
			} while (curr_node);
			return parentage.reverse();
		};

		proto.root = function () {
			return this._root;
		};

		proto.on_outgoing_transition_fire = function (transition, event) {
			var i;

			if (this.is_running() && _.indexOf(this.get_outgoing_transitions(), transition) >= 0) {
				transition._last_run_event.set(event);
				
				var my_lineage = this.get_lineage();
				/*
				for (i = 0; i < my_lineage.length - 1; i += 1) {
					if (!my_lineage[i].is(my_lineage[i + 1])) {
						return false;
					}
				}
				*/

				var to = transition.to();
				var to_lineage = to.get_lineage();
				var to_len = to_lineage.length;

				var min_len = Math.min(to_len, my_lineage.length);

				//console.log("from ", _.map(my_lineage, function(x) { return x.get_name(); }));
				//console.log("to   ", _.map(to_lineage, function(x) { return x.get_name(); }));

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
					parent.set_active_substate(active_substate, transition, event);
					i++;
				}

				if(active_substate instanceof ist.Statechart) {
					var start_state = active_substate.get_start_state();
					active_substate.set_active_substate(start_state, transition, event);
				}


				ist.event_queue.once("end_event_queue_round_0", function () {
					this._emit("pre_transition_fire", {
						type: "pre_transition_fire",
						transition: transition,
						//target: this,
						event: event,
						state: to
					});
					transition.set_active(true);
				}, this);

				ist.event_queue.once("end_event_queue_round_2", function () {
					transition.increment_times_run();
				}, this);

				ist.event_queue.once("end_event_queue_round_4", function () {
					transition.set_active(false);
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

		proto.order = function (other_state) {
			var i;
			// return 1 if other_state is ">" me (as in should be further right)
			// return -1 if other_state is "<" me (as in should be further left)
			// return 0 if other_state is "==" me (same thing)

			var my_lineage = this.get_lineage(),
				other_lineage = other_state.get_lineage(),
				mli = my_lineage[0],
				oli = other_lineage[0];

			if(mli !== oli) { // different root
				return 0;
			}

			var len = Math.min(my_lineage.length, other_lineage.length),
				index_me, index_o;

			for (i = 1; i < len; i += 1) {
				index_me = mli.get_substate_index(my_lineage[i]);
				index_o = oli.get_substate_index(other_lineage[i]);
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
		proto.enable_outgoing_transitions = function () {
			var outgoing_transitions = this.get_outgoing_transitions();
			_.each(outgoing_transitions, function (x) { x.enable(); });
		};
		proto.disable_outgoing_transitions = function () {
			this.disable_immediate_outgoing_transitions();
			var substates = this.get_substates();
			_.each(substates, function (x) { x.disable_outgoing_transitions(); });
		};
		proto.disable_immediate_outgoing_transitions = function() {
			var transitions = this.get_outgoing_transitions();
			_.each(transitions, function (x) { x.disable(); });
		};
		proto.disable_immediate_incoming_transitions = function() {
			var transitions = this.get_incoming_transitions();
			_.each(transitions, function (x) { x.disable(); });
		};
		proto.parent_is_concurrent = function() {
			var parent = this.parent();
			if(parent) {
				return parent.is_concurrent();
			} else {
				return false;
			}
		};
		proto.getSubstates = function(include_start) {
			var object = this.get_object(),
				pointer = this.get_pointer(),
				substates = object.getSubstates(),
				contextualSubstates = _.map(substates, function(substate_info) {
					var substate = substate_info.value,
						ptr = pointer.replace(substate);

					return ptr.getContextualObject();
				});

			return contextualSubstates;
		};

		proto.summarize = function () {
			var context = this.context();
			var summarized_context;
			if (context) {
				summarized_context = context.summarize();
			}
			var my_basis = this.basis() || this;
			return {
				basis_id: my_basis.id(),
				context: summarized_context
			};
		};
		My.desummarize = function (obj) {
			if (obj.context) {
				var state_basis = ist.find_uid(obj.basis_id);
				var context = ist.Pointer.desummarize(obj.context);
				var dict = context.pointsAt();
				var contextual_statechart = dict.get_statechart_for_context(context);

				var state = ist.find_equivalent_state(state_basis, contextual_statechart);
				return state;
			} else {
				return ist.find_uid(obj.basis_id);
			}
		};
		proto.onBasisRemoveSubstate = function (event) {
			this.remove_substate(event.name, undefined, false);
		};
		proto.onBasisRenameSubstate = function (event) {
			var from_name = event.from,
				to_name = event.to;
			this.rename_substate(from_name, to_name);
		};
		proto.onBasisMoveSubstate = function (event) {
			var state_name = event.state_name,
				index = event.index;
			this.move_state(state_name, index);
		};
		proto.onBasisMakeConcurrent = function (event) {
			this.make_concurrent(event.concurrent);
		};
		proto.onBasisOnTransition = function (event) {
			this.on_transition(event.str, event.activation_listener, event.deactivation_listener, event.context);
		};
		proto.onBasisOffTransition = function (event) {
			this.off_transition(event.str, event.activation_listener, event.deactivation_listener, event.context);
		};
		proto.onBasisDestroy = function (event) {
			this.destroy(true);
		};

		proto.destroy = function (silent) {
			this.destroyed = true;
			if(this.$active) {
				this.$active.destroy(silent);
				delete this.$active;
			}
			if(this.$running) {
				this.$running.destroy(silent);
				delete this.$running;
			}
			this.$initialized.destroy(silent);
			this._last_run_event.destroy(silent);
			delete this._last_run_event;
			if (this._basis) {
				this.remove_basis_listeners();
				delete this._basis;
			}
			delete this._parent;
			delete this._context;
			able.destroy_this_listenable(this);
			ist.unregister_uid(this.id());
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
	}(ist.ContextualState));
}(interstate));
