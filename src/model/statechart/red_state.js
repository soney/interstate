/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.find_equivalent_state = function (to_state, in_tree) {
		var in_tree_basis = in_tree.basis();
		var in_tree_basis_lineage = in_tree_basis.get_lineage();
		var to_state_lineage = to_state.get_lineage();

		var in_tree_basis_lineage_len = in_tree_basis_lineage.length;
		var to_state_lineage_len = to_state_lineage.length;
		
		var in_tree_basis_index = in_tree_basis_lineage_len - 1;
		var to_state_index;
		var i;

		outer_loop:
		while (in_tree_basis_index >= 0) {
			for (i = to_state_lineage_len - 1; i >= 0; i -= 1) {
				if (to_state_lineage[i] === in_tree_basis_lineage[in_tree_basis_index]) {
					to_state_index = i;
					break outer_loop;
				}
			}
			in_tree_basis_index -= 1;
		}
		var search_item = in_tree;
		var parentage_level = in_tree_basis_lineage_len - 1 - in_tree_basis_index;
		_.times(parentage_level, function () {
			search_item = search_item.parent();
		});

		for (i = to_state_index + 1; i < to_state_lineage_len; i += 1) {
			var name = to_state_lineage[i - 1].get_name_for_substate(to_state_lineage[i]);
			search_item = search_item.get_substate_with_name(name);
		}

		if (search_item.basis() !== to_state) { throw new Error("Could not find correct equivalent item"); }

		return search_item;
	};

	red.State = function (options, defer_initialization) {
		this._initialized = cjs.$(false);
		options = options || {};
		able.make_this_listenable(this);
		this._id = options.id || uid();
		this._last_run_event = cjs.$(false);

		this.$onBasisAddTransition = _.bind(function (event) {
			var transition = event.transition;
			var new_from = red.find_equivalent_state(event.from_state, this);
			var new_to = red.find_equivalent_state(event.to_state, this);
			var transition_shadow = transition.create_shadow(new_from, new_to, this, this.context());
			new_from._add_direct_outgoing_transition(transition_shadow);
			new_to._add_direct_incoming_transition(transition_shadow);
			this.add_transition(transition_shadow);
		}, this);
		this.$onBasisAddSubstate = _.bind(function (event) {
			var state_name = event.state_name,
				state = event.state,
				index = event.index;
			this.add_substate(state_name, state.create_shadow({parent: this, context: this.context()}), index);
		}, this);
		this.$onBasisRemoveSubstate = _.bind(function (event) {
			this.remove_substate(event.name, undefined, false);
		}, this);
		this.$onBasisRenameSubstate = _.bind(function (event) {
			var from_name = event.from,
				to_name = event.to;
			this.rename_substate(from_name, to_name);
		}, this);
		this.$onBasisMoveSubstate = _.bind(function (event) {
			var state_name = event.state_name,
				index = event.index;
			this.move_state(state_name, index);
		}, this);
		this.$onBasisMakeConcurrent = _.bind(function (event) {
			this.make_concurrent(event.concurrent);
		}, this);
		this.$onBasisOnTransition = _.bind(function (event) {
			this.on_transition(event.str, event.activation_listener, event.deactivation_listener, event.context);
		}, this);
		this.$onBasisOffTransition = _.bind(function (event) {
			this.off_transition(event.str, event.activation_listener, event.deactivation_listener, event.context);
		}, this);
		this.$onBasisDestroy = _.bind(function (event) {
			this.destroy();
		}, this);

		if (defer_initialization !== true) {
			this.do_initialize(options);
		}
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);

		proto.do_initialize = function (options) {
			this._puppet = options.puppet === true;
			this._parent = options.parent;
			this.$active = cjs.$(options.active === true || (!this._parent && !this._puppet));
			this._context = options.context;
			this.set_basis(options.basis, options.set_basis_as_root);
		};

		proto.is_initialized = function () {
			return this._initialized.get();
		};

		proto.is_puppet = function () {
			return this._puppet;
		};

		proto.set_basis = function (basis, as_root) {
			if (this._basis) {
				this._basis.off("add_transition", this.$onBasisAddTransition);
				this._basis.off("add_substate", this.$onBasisAddSubstate);
				this._basis.off("remove_substate", this.$onBasisRemoveSubstate);
				this._basis.off("rename_substate", this.$onBasisRenameSubstate);
				this._basis.off("move_substate", this.$onBasisMoveSubstate);
				this._basis.off("make_concurrent", this.$onBasisMakeConcurrent);
				this._basis.off("on_transition", this.$onBasisOnTransition);
				this._basis.off("off_transition", this.$onBasisOffTransition);
				this._basis.off("destroy", this.$onBasisDestroy);
			}
			this._basis = basis;
			if (this._basis) {
				if (this._basis instanceof red.Statechart) {
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
						if (shadow instanceof red.StartState) {
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
						var from = red.find_equivalent_state(transition.from(), parent_statechart);
						var to = red.find_equivalent_state(transition.to(), parent_statechart);
						return transition.create_shadow(from, to, parent_statechart, context);
					}, function (transition, from) {
						return transition.id();
					});

					this.do_shadow_transitions(create_transition_shadow);
				}

				this._basis.on("add_transition", this.$onBasisAddTransition);
				this._basis.on("add_substate", this.$onBasisAddSubstate);
				this._basis.on("remove_substate", this.$onBasisRemoveSubstate);
				this._basis.on("rename_substate", this.$onBasisRenameSubstate);
				this._basis.on("move_substate", this.$onBasisMoveSubstate);
				this._basis.on("make_concurrent", this.$onBasisMakeConcurrent);
				this._basis.on("on_transition", this.$onBasisOnTransition);
				this._basis.on("off_transition", this.$onBasisOffTransition);
				this._basis.on("destroy", this.$onBasisDestroy);
			}
			return this;
		};

		proto.do_shadow_transitions = function( create_transition_shadow ) {
			var basis = this.basis();
			var outgoing_transitions = basis.get_outgoing_transitions();
			var shadow_outgoing = _.map(outgoing_transitions, create_transition_shadow);

			_.each(shadow_outgoing, function (transition) {
				var from = transition.from();
				var to = transition.to();
				from._add_direct_outgoing_transition(transition);
				to._add_direct_incoming_transition(transition);

				if(from.is_active()) {
					transition.enable();
				} else {
					transition.disable();
				}
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
		proto.flatten_substates = function (include_start) {
			return _.flatten(_.map(this.get_substates(include_start), function (substate) {
				return substate.flatten_substates(include_start);
			})).concat([this]);
		};
		proto.is_active = function (to_active) { return this.$active.get(); };
		proto.get_name = function (relative_to) {
			var parent = this.parent();
			if (!relative_to) {
				relative_to = this.root();
			} else if (relative_to === 'parent') {
				relative_to = parent;
			}

			var my_name = parent ? parent.get_name_for_substate(this) : "";
			if (parent === relative_to) {
				return my_name;
			} else {
				var parent_name = parent ? parent.get_name(relative_to) : "";
				if (parent_name === "") {
					return my_name;
				} else {
					return parent_name + "." + my_name;
				}
			}
		};
		proto.id = proto.hash = function () { return this._id; };
		proto.basis = function () { return this._basis; };
		proto.parent = function () { return this._parent; };
		proto.context = function () { return this._context; };
		proto.set_parent = function (parent) { this._parent = parent; return this; };
		proto.set_context = function (context) { this._context = context; return this; };

		proto.is_based_on = function (state) {
			return this.basis() === state;
		};

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
			var parent = this.parent();
			if (parent) {
				return parent.root();
			} else {
				return this;
			}
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

				for (i = 0; i < min_len; i += 1) {
					if (to_lineage[i] !== my_lineage[i]) {
						i -= 1; //back up...
						break;
					}
				}
				if (i === to_len) { //if it is a self-transition. Just handle it on the lowest level possible
					i -= 2;
				}
				//cjs.wait();
				var active_substate, parent;
				while (i < to_len - 1) {
					parent = to_lineage[i];
					active_substate = to_lineage[i + 1];
					if (!active_substate.is_running()) {
						active_substate.run();
					}
					parent.set_active_substate(active_substate, transition, event);
					i += 1;
				}
				if(active_substate instanceof red.Statechart) {
					var start_state = active_substate.get_start_state();
					if(!start_state.is_running()) {
						start_state.run();
					}
					active_substate.set_active_substate(start_state);
				}
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

			var my_lineage = this.get_lineage();
			var other_lineage = other_state.get_lineage();

			var mli = my_lineage[0];
			var oli = other_lineage[0];
			var len = Math.min(my_lineage.length, other_lineage.length);
			var index_me, index_o;
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
		my.desummarize = function (obj) {
			if (obj.context) {
				var state_basis = red.find_uid(obj.basis_id);
				var context = red.Pointer.desummarize(obj.context);
				var dict = context.points_at();
				var contextual_statechart = dict.get_statechart_for_context(context);

				var state = red.find_equivalent_state(state_basis, contextual_statechart);
				return state;
			} else {
				return red.find_uid(obj.basis_id);
			}
		};

		proto.destroy = function () {
			if(this.$active) {
				this.$active.destroy();
				delete this.$active;
			}
			this._initialized.destroy();
			delete this._initialized;
			this._last_run_event.destroy();
			delete this._last_run_event;
			if (this._basis) {
				this._basis.off("add_transition", this.$onBasisAddTransition);
				this._basis.off("add_substate", this.$onBasisAddSubstate);
				this._basis.off("remove_substate", this.$onBasisRemoveSubstate);
				this._basis.off("rename_substate", this.$onBasisRenameSubstate);
				this._basis.off("move_substate", this.$onBasisMoveSubstate);
				this._basis.off("make_concurrent", this.$onBasisMakeConcurrent);
				this._basis.off("on_transition", this.$onBasisOnTransition);
				this._basis.off("off_transition", this.$onBasisOffTransition);
				this._basis.off("destroy", this.$onBasisDestroy);
			}
			able.destroy_this_listenable(this);
			red.unregister_uid(this.id());

			delete this.$onBasisAddTransition;
			delete this.$onBasisAddSubstate;
			delete this.$onBasisRemoveSubstate;
			delete this.$onBasisRenameSubstate;
			delete this.$onBasisMoveSubstate;
			delete this.$onBasisMakeConcurrent;
			delete this.$onBasisOnTransition;
			delete this.$onBasisOffTransition;
			delete this.$onBasisDestroy;
		};
	}(red.State));
}(red));
