(function(red) {
var cjs = red.cjs, _ = red._;

var any_state = red.any_state = {};
var state_descriptor_regex = /\s*(([\w\.]+((\s*,\s*[\w\.]+)*))|\*)(\s*(>(\d+)?-|-(\d+)?>|<(\d+)?-|-(\d+)?<|<-(\d+)?->|>-(\d+)?-<)\s*(([\w\.]+(\s*,\s*[\w\.]+)*)|\*))?\s*/;
var get_state_description = function(str) {
	return str === "*" ? any_state : _.map(str.split(","), function(str) { return str.trim(); });
};
var get_state_listener_info = function(str_descriptor) {
	var matches = str_descriptor.match(state_descriptor_regex);
	if(matches) {
		var from_states = get_state_description(matches[1]);
		var transition = matches[6];
		if(transition) {
			var to_states = get_state_description(matches[13]);

			if(transition.indexOf("<") >= 0 && transition.indexOf(">") < 0) {
				transition = transition.split("").reverse().join("");
				var tmp = from_states; from_states = to_states; to_states = tmp;
			}

			var transition_no = matches[7] || matches[8] || matches[9] || matches[10] || matches[11] || matches[12] || false;
			if(_.isString(transition_no)) {
				transition_no = parseInt(transition_no);
			}

			return {
				type: "transition",
				from: from_states,
				to: to_states,
				pre: transition[0] === ">",
				bidirectional: (transition[0] === ">" && transition[transition.length-1] === "<") || (transition[0] === ">" && transition[transition.length-1] === "<"),
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

var matches_name = function(statechart, states, state) {
	if(states === any_state) {
		return true;
	} else {
		var state_name = state.get_name(statechart);
		var len = states.length;
		for(var i = 0; i<len; i++) {
			var s = states[i];
			if(s === state || s === state_name) {
				return true;
			}
		}
		return false;
	}
};

var add_transition_listener = function(str, statechart, activation_listener, deactivation_listener, context) {
	context = context || this;

	var listener_info;
	if(_.isString(str)) {
		listener_info = get_state_listener_info(str);
	} else {
		listener_info = str;
	}

	var type = listener_info.type;
	var event_type, listener;
	if(type === "state") {
		event_type = "pre_transition_fire";
		var activated = false;
		listener = function(event) {
			var listener_args = arguments,
				mname = matches_name(statechart, listener_info.states, event.state);
			if(activated === false && mname) {
				activated = true;

				red.event_queue.once("end_event_queue_round_6", function() {
					activation_listener.apply(context, listener_args);
				}, this);
			} else if(activated === true && !mname) {
				activated = false;

				red.event_queue.once("end_event_queue_round_2", function() {
					deactivation_listener.apply(context, listener_args);
				}, this);
			}
		};
	} else if(type === "transition") {
		event_type = listener_info.pre ? "pre_transition_fire" : "post_transition_fire";
		listener = function(event) {
			var transition = event.transition,
				from = transition.from(),
				to = transition.to();

			var desired_transition = false;
			if(listener_info.transition_no) {
				var transitions_between = from.get_transitions_to(to);
				desired_transition = transitions_between[listener_info.transition_no];
			}


			if(!desired_transition || transition === desired_transition) {
				if((matches_name(statechart, listener_info.from, from) && 
						matches_name(statechart, listener_info.to, to)) ||
							(listener_info.bidirectional && 
									matches_name(statechart, listener_info.to, from) && 
									matches_name(statechart, listener_info.from, to))) {

					var listener_args = arguments;
					activation_listener.apply(context, listener_args);

					if(listener_info.pre) {
						red.event_queue.once("end_event_queue_round_1", function() {
							deactivation_listener.apply(context, listener_args);
						});
					} else {
						red.event_queue.once("end_event_queue_round_5", function() {
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
		destroy: function() { statechart.off(event_type, listener); },
	};
};


red.find_equivalent_state = function(to_state, in_tree) {
	var in_tree_basis = in_tree.basis();
	var in_tree_basis_lineage = in_tree_basis.get_lineage();
	var to_state_lineage = to_state.get_lineage();

	var in_tree_basis_lineage_len = in_tree_basis_lineage.length;
	var to_state_lineage_len = to_state_lineage.length;
	
	var in_tree_basis_index = in_tree_basis_lineage_len - 1;
	var to_state_index;
	outer_loop:
	while(in_tree_basis_index  >= 0) {
		for(var i = to_state_lineage_len - 1; i>=0; i--) {
			if(to_state_lineage[i] === in_tree_basis_lineage[in_tree_basis_index]) {
				to_state_index = i;
				break outer_loop;
			}
		}
		in_tree_basis_index--;
	}
	var search_item = in_tree;
	var parentage_level = in_tree_basis_lineage_len - 1 - in_tree_basis_index;
	_.times(parentage_level, function() {
		search_item = search_item.parent();
	});

	for(var i = to_state_index+1; i < to_state_lineage_len; i++) {
		var name = to_state_lineage[i-1].get_name_for_substate(to_state_lineage[i]);
		search_item = search_item.get_substate_with_name(name);
	}
	if(search_item.basis() !== to_state) { throw new Error("Could not find correct equivalent item"); }
	return search_item;
};
red.find_equivalent_transition = function(to_transition, in_tree) {
	var from = to_transition.from();
	var to = to_transition.to();
	var in_tree_from = red.find_equivalent_state(from, in_tree);
	var in_tree_from_outgoing = in_tree_from.get_outgoing_transitions();
	var len = in_tree_from_outgoing.length;
	for(var i = 0; i<len; i++) {
		var t = in_tree_from_outgoing[i];
		if(t.basis() === to_transition) {
			return t;
		}
	}
	throw new Error("Could not find equivalent transition");
};

red.StatechartTransition = function(options, defer_initialization) {
	this._initialized = false;
	options = options || {};
	able.make_this_listenable(this);
	this._id = options.id || uid();
	this.$remove = _.bind(this.remove, this);
	this.$destroy = _.bind(this.destroy, this);
	this.$updateTo = _.bind(function(event) {
		var state = event.state;
		var old_to = this.to();
		var new_to = red.find_equivalent_state(state, old_to);
		this.setTo(new_to);
	}, this);
	this.$updateFrom = _.bind(function(event) {
		var state = event.state;
		var old_from = this.from();
		var new_from = red.find_equivalent_state(state, my_from);
		this.setFrom(new_from);
	}, this);
	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
	this._last_run_event = cjs.$(false);
	this._enabled = false;
};
(function(my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);
	proto.do_initialize = function(options) {
		this._puppet = options.puppet === true;
		this.$active = cjs.$(false);
		this.$times_run = cjs.$(0);
		this._from_state = options.from;
		this._to_state = options.to;
		this._context = options.context;
		this.set_basis(options.basis);
		this.do_fire = _.bind(this.fire, this);
		this.set_event(options.event);
		red.register_uid(this._id, this);
		this._initialized = true;
		this._emit("initialized");
	};
	proto.is_puppet = function() { 
		return this._puppet;
	};
	proto.is_initialized = function(){
		return this._initialized;
	};
	proto.increment_times_run = function() {
		this.$times_run.set(this.$times_run.get() + 1);
	};
	proto.get_times_run = function() {
		return this.$times_run.get();
	};
	proto.context = function() {
		return this._context;
	};
	proto.set_active = function(to_active) {
		to_active = to_active === true;
		this.$active.set(to_active);
	};
	proto.is_active = function(to_active) { return this.$active.get(); };
	proto.basis = function() { return this._basis; };
	proto.set_basis = function(basis) {
		if(this._basis) {
			this._basis.off("setTo", this.$updateTo);
			this._basis.off("setFrom", this.$updateFrom);
			this._basis.off("remove", this.$remove);
			this._basis.off("destroy", this.$destroy);
		}
		this._basis = basis;
		if(this._basis) {
			this._basis.on("setTo", this.$updateTo);
			this._basis.on("setFrom", this.$updateFrom);
			this._basis.on("remove", this.$remove);
			this._basis.on("destroy", this.$destroy);
		}
		return this;
	};
	proto.id = proto.hash = function() { return this._id; }
	proto.from = function() { return this._from_state; }; 
	proto.to = function() { return this._to_state; };
	proto.setFrom = function(state) {
		if(this._from_state) {
			this._from_state._remove_direct_outgoing_transition(this);
		}
		this._from_state = state;
		this._from_state._add_direct_outgoing_transition(this);
		this._emit("setFrom", {type: "setFrom", target: this, state: state});
		return this;
	};
	proto.setTo = function(state) {
		if(this._to_state) {
			this._to_state._remove_direct_incoming_transition(this);
		}
		this._to_state = state;
		this._to_state._add_direct_incoming_transition(this);
		this._emit("setTo", {type: "setTo", target: this, state: state});
		return this;
	};
	proto.set_event = function(event) {
		if(this._event) {
			this._event.off_fire(this.do_fire);
			this._event.destroy();
		}
		this._event = event;
		if(this._event) {
			this._event.set_transition(this);
			this._event.on_fire(this.do_fire);
		}
	};
	proto.event = function() { return this._event; };
	proto.involves = function(state) { return this.from() === state || this.to() === state; };
	proto.destroy = function() {
		this._emit("destroy", {type: "destroy", target: this});
		cjs.wait();
		this.$active.destroy();
		this.set_basis(undefined);
		this._event.off_fire(this.do_fire);
		this._event.destroy();
		cjs.signal();
	};
	proto.fire = function(event) {
		if(this.is_puppet()) {
			this._emit("fire", {type: "fire", target: this, event: event});
		} else if(this.from().on_outgoing_transition_fire(this, event)) {
			//this._last_run_event.set(event);
			this._emit("fire", {type: "fire", target: this, event: event});
		}
	};
	proto.create_shadow = function(from_state, to_state, parent_statechart, context) {
		var my_event = this.event()
			, shadow_event = my_event.create_shadow(parent_statechart, context);
		var shadow_transition = new red.StatechartTransition({from: from_state, to: to_state, event: shadow_event, basis: this, context: context});
		return shadow_transition;
	};
	proto.stringify = function() {
		var event = this.event();
		var stringified_event = event ? event.stringify() : "";
		return "" + stringified_event;
	};
	proto.remove = function() {
		var from = this.from();
		var to = this.to();
		cjs.wait();
		from._remove_direct_outgoing_transition(this);
		to._remove_direct_incoming_transition(this);
		cjs.signal();
		this._emit("remove", {type: "remove", transition: this});
		return this;
	};
	proto.root = function() {
		return this.from().root();
	};

	proto.enable = function() {
		this._enabled = true;
		var event = this.event();
		event.enable();
	};

	proto.disable = function() {
		this._enabled = false;
		var event = this.event();
		event.disable();
	};

	proto.is_enabled = function() {
		return this._enabled;
	};

	proto.summarize = function() {
		var context = this.context();
		var summarized_context;
		if(context) {
			summarized_context = context.summarize();
		}
		var my_basis = this.basis() || this;
		return {
			basis_id: my_basis.id(),
			context: summarized_context
		};
	};
	my.desummarize = function(obj) {
		if(obj.context) {
			var state_basis = red.find_uid(obj.basis_id);
			var context = red.Pointer.desummarize(obj.context);
			var dict = context.points_at();
			var contextual_statechart = dict.get_statechart_for_context(context);

			var state = red.find_equivalent_transition(state_basis, contextual_statechart);
			return state;
		} else {
			return red.find_uid(obj.basis_id);
		}
	};


	red.register_serializable_type("statechart_transition",
									function(x) { 
										return x instanceof my;
									},
									function(include_id) {
										var args = _.toArray(arguments);
										var rv = {
											from: red.serialize.apply(red, ([this.from()]).concat(args))
											, to: red.serialize.apply(red, ([this.to()]).concat(args))
											, event: red.serialize.apply(red, ([this.event()]).concat(args))
										};
										if(include_id) {
											rv.id = this.id();
										}
										return rv;
									},
									function(obj, deserialize_options) {
										var rv = new my({id: obj.id}, true);
										var rest_args = _.rest(arguments);
										rv.initialize = function() {
											var options = {
												from: red.deserialize.apply(red, ([obj.from]).concat(rest_args)),
												to: red.deserialize.apply(red, ([obj.to]).concat(rest_args)),
												event: red.deserialize.apply(red, ([obj.event]).concat(rest_args))
											};
											this.do_initialize(options);
										};
										return rv;
									});
}(red.StatechartTransition));

red.State = function(options, defer_initialization) {
	this._initialized = false;
	options = options || {};
	able.make_this_listenable(this);
	this._id = options.id || uid();
	this._last_run_event = cjs.$(false);

	this.$onBasisAddTransition = _.bind(function(event) {
		var transition = event.transition;
		var new_from = red.find_equivalent_state(transition.from(), this);
		var new_to = red.find_equivalent_state(transition.to(), this);
		this.add_transition(transition.create_shadow(new_from, new_to, this, this.context()));
	}, this);
	this.$onBasisAddSubstate = _.bind(function(event) {
		var state_name = event.state_name,
			state = event.state,
			index = event.index;
		this.add_substate(state_name, state.create_shadow(), index); 
	}, this);
	this.$onBasisRemoveSubstate = _.bind(function(event) {
		this.remove_substate(event.name, undefined, false);
	}, this);
	this.$onBasisRenameSubstate = _.bind(function(event) {
		var from_name = event.from,
			to_name = event.to;
		this.rename_substate(from_name, to_name);
	}, this);
	this.$onBasisMoveSubstate = _.bind(function(event) {
		var state_name = event.state_name,
			index = event.index;
		this.move_state(state_name, index);
	}, this);
	this.$onBasisMakeConcurrent = _.bind(function(event) {
		this.make_concurrent(event.concurrent);
	}, this);
	this.$onBasisOnTransition = _.bind(function(event) {
		this.on_transition(event.str, event.activation_listener, event.deactivation_listener, event.context);
	}, this);
	this.$onBasisOffTransition = _.bind(function(event) {
		this.off_transition(event.str, event.activation_listener, event.deactivation_listener, event.context);
	}, this);
	this.$onBasisDestroy = _.bind(function(event) {
		this.destroy();
	}, this);

	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);

	proto.is_initialized = function(){
		return this._initialized;
	};

	proto.is_puppet = function() { 
		return this._puppet;
	};

	proto.set_basis = function(basis) {
		if(this._basis) {
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
		if(this._basis) {
			if(this._basis instanceof red.Statechart) {
				var basis_start_state = this._basis.get_start_state();
				var basis_start_state_to = basis_start_state.getTo();
				var is_running = this.is_running();
				var my_context = this.context();
				_.each(basis.get_substates(true), function(substate) {
					var shadow = substate.create_shadow({
						context: my_context,
						parent: this,
						running: is_running,
						active: is_running && basis_start_state_to === substate
					});
					if(shadow instanceof red.StartState) {
						this.set_start_state(shadow);
					} else {
						var name = substate.get_name(basis);
						this.add_substate(name, shadow);
					}
				}, this);
				_.each(this._basis._transition_listeners, function(listeners, name) {
					_.each(listeners, function(info) {
						this.on_transition(info.str, info.activation_listener, info.deactivation_listener, info.context);
					}, this);
				}, this);
			}
			if(this.parent() === undefined) { // When all of the substates have been copied
				var flat_substates = this.flatten_substates(true);

				var parent_statechart = this,
					context = this.context();

				var create_transition_shadow = _.memoize(function(transition) {
					var from = red.find_equivalent_state(transition.from(), parent_statechart);
					var to = red.find_equivalent_state(transition.to(), parent_statechart);
					return transition.create_shadow(from, to, parent_statechart, context);
				}, function(transition, from) {
					return transition.id();
				});

				_.each(flat_substates, function(substate) {
					var basis = substate.basis();
					var outgoing_transitions = basis.get_outgoing_transitions();
			//		var incoming_transitions = basis.get_incoming_transitions();

					var shadow_outgoing = _.map(outgoing_transitions, create_transition_shadow);

					_.each(shadow_outgoing, function(transition) {
						var from = transition.from();
						var to = transition.to();
						from._add_direct_outgoing_transition(transition);
						to._add_direct_incoming_transition(transition);
						this.add_transition(transition);
					}, this);
				}, this);
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

	proto.do_initialize = function(options) {
		this._puppet = options.puppet === true;
		this.$active = cjs.$(options.active === true);
		this._parent = options.parent;
		this._context = options.context;
		this.set_basis(options.basis);
	};
	proto.set_active = function(to_active) {
		to_active = to_active === true;
		this.$active.set(to_active === true);
		var event_type = to_active ? "active" : "inactive";
		this._emit(event_type, {
			type: event_type,
			target: this
		});
	};
	proto.flatten_substates = function(include_start) {
		return ([this]).concat(_.flatten(_.map(this.get_substates(include_start), function(substate) {
			return substate.flatten_substates(include_start);
		})));
	};
	proto.is_active = function(to_active) { return this.$active.get(); };
	proto.get_name = function(relative_to) {
		var parent = this.parent();
		if(!relative_to) {
			relative_to = this.root();
		} else if(relative_to === 'parent') {
			relative_to = parent;
		}

		var my_name = parent ? parent.get_name_for_substate(this) : "";
		if(parent === relative_to) {
			return my_name;
		} else {
			var parent_name = parent ? parent.get_name(relative_to) : "";
			if(parent_name === "") {
				return my_name;
			} else {
				return parent_name + "." + my_name;
			}
		}
	};
	proto.id = proto.hash = function() { return this._id; };
	proto.basis = function() { return this._basis; };
	proto.parent = function() { return this._parent; };
	proto.context = function() { return this._context; };
	proto.set_parent = function(parent) { this._parent = parent; return this; };
	proto.set_context = function(context) { this._context = context; return this; };

	proto.is_based_on = function(state) {
		return this.basis() === state;
	};

	proto.is_child_of = function(node) {
		var curr_parent = this.parent();
		while(curr_parent) {
			if(curr_parent === node) {
				return true;
			}
			curr_parent = curr_parent.parent();
		}
		return false;
	};

	proto.get_lineage = function(until_state) {
		var curr_node = this;
		var parentage = [];
		var i = 0;
		do {
			parentage[i++] = curr_node;
			if(curr_node === until_state) { break; }
			curr_node = curr_node.parent();
		} while(curr_node);
		return parentage.reverse();
	};

	proto.root = function() {
		var parent = this.parent();
		if(parent) { return parent.root(); }
		else { return this; }
	};

	proto.on_outgoing_transition_fire = function(transition, event) {
		if(this.is_running()) {
			transition._last_run_event.set(event);
			var my_lineage = this.get_lineage();
			for(var i = 0; i<my_lineage.length-1; i++) {
				if(!my_lineage[i].is(my_lineage[i+1])) {
					return false;
				} 
			}

			var to = transition.to();
			var to_lineage = to.get_lineage();
			var to_len = to_lineage.length;

			var min_len = Math.min(to_len, my_lineage.length);

			for(var i = 0; i<min_len; i++) {
				if(to_lineage[i] !== my_lineage[i]) {
					i--; //back up...
					break;
				}
			}
			cjs.wait();
			if(i === to_len) { //if it is a self-transition. Just handle it on the lowest level possible
				i-=2;
			}
			for(; i<to_len-1; i++) {
				var parent = to_lineage[i];
				var active_substate = to_lineage[i+1];
				if(!active_substate.is_running()) {
					active_substate.run();
				}
				parent.set_active_substate(active_substate, transition, event);
			}
			cjs.signal();
			return true;
		}
		return false;
	};

	proto.order = function(other_state) {
		// return 1 if other_state is ">" me (as in should be further right)
		// return -1 if other_state is "<" me (as in should be further left)
		// return 0 if other_state is "==" me (same thing)

		var my_lineage = this.get_lineage();
		var other_lineage = other_state.get_lineage();

		var mli = my_lineage[0];
		var oli = other_lineage[0];
		var len = Math.min(my_lineage.length, other_lineage.length);
		var index_me, index_o;
		for(var i = 1; i<len; i++) {
			index_me = mli.get_substate_index(my_lineage[i]);
			index_o = oli.get_substate_index(other_lineage[i]);
			if(index_me < index_o) {
				return 1;
			} else if(index_me > index_o) {
				return -1;
			}
			mli = my_lineage[i];
			oli = other_lineage[i];
		}

		if(other_lineage.length > my_lineage.length) { // It is more specific
			return -1;
		} else if(other_lineage.length < my_lineage.length) {
			return 1;
		} else { // We are exactly the same
			return 0;
		}
	};
	proto.enable_outgoing_transitions = function() {
		var outgoing_transitions = this.get_outgoing_transitions();
		_.each(outgoing_transitions, function(x) { x.enable(); })
	};
	proto.disable_outgoing_transitions = function() {
		var outgoing_transitions = this.get_outgoing_transitions();
		var substates = this.get_substates();
		_.each(outgoing_transitions, function(x) { x.disable(); })
		_.each(substates, function(x) { x.disable(); });
	};

	proto.summarize = function() {
		var context = this.context();
		var summarized_context;
		if(context) {
			summarized_context = context.summarize();
		}
		var my_basis = this.basis() || this;
		return {
			basis_id: my_basis.id(),
			context: summarized_context
		};
	};
	my.desummarize = function(obj) {
		if(obj.context) {
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

	proto.destroy = function() {
		this.$active.destroy();
	};
}(red.State));

red.StartState = function(options) {
	options = options || {};
	this.outgoingTransition = false;
	red.StartState.superclass.constructor.apply(this, arguments);
	this._running = options.running === true;
};
(function(my) {
	_.proto_extend(my, red.State);
	var proto = my.prototype;
	proto.do_initialize = function(options) {
		my.superclass.do_initialize.apply(this, arguments);
		if(!this.basis()) { //If we have a basis, then whatever function shadowed us will create our outgoing transition too
			var to;
			if(options.to) {
				to = options.to;
				this._transition_to_self = false;
			} else {
				to = this;
				this._transition_to_self = true;
			}
			
			this.outgoingTransition = options.outgoing_transition || new red.StatechartTransition({
				from: this,
				to: to,
				event: red.create_event("statechart", {
					target: "me",
					spec: "run"
				})
			});

			to._add_direct_incoming_transition(this.outgoingTransition);
		}
		red.register_uid(this._id, this);
		this._initialized = true;
		this._emit("initialized");
	};
	proto.setTo = function(toNode) {
		var transition = this.outgoingTransition;
		if(toNode.is_child_of(this.parent())) {
			transition.setTo(toNode);
		}
	};
	proto.set_parent = function(parent) {
		this.outgoingTransition.event().set_statecharts(parent);
		return my.superclass.set_parent.apply(this, arguments);
	};
	proto.getTo = function() {
		var transition = this.outgoingTransition;
		return transition.to();
	};
	proto.get_substates = function() { return []; };
	proto.get_active_states = function() { return []; };
	proto.get_outgoing_transitions = function() {
		if(this.outgoingTransition) {
			return [this.outgoingTransition];
		} else {
			return [];
		}
	};
	proto.get_incoming_transitions = function() { 
		if(this._transition_to_self && this.outgoingTransition) {
			return [this.outgoingTransition];
		} else {
			return [];
		}
	};
	proto._add_direct_incoming_transition = function(transition) {
		if(transition !== this.outgoingTransition) {
			throw new Error("Should never have a transition other than outgoing transition");
		}
		this._transition_to_self = true;
	};
	proto._remove_direct_incoming_transition = function(transition) {
		if(transition !== this.outgoingTransition) {
			throw new Error("Should never have a transition other than outgoing transition");
		}
		this._transition_to_self = false;
	};
	proto._add_direct_outgoing_transition = function(transition) {
		if(this.outgoingTransition) { // I already have an outgoing transition
			throw new Error("Should never have a transition other than outgoing transition");
		}
		this._transition_to_self = transition.to() === this;
		this.outgoingTransition = transition;
	};
	proto._remove_direct_outgoing_transition = function(transition) {
		throw new Error("Should never remove outgoing transition from start state");
	};
	proto.is_running = function() {
		return this._running;
	};
	proto.run = function() {
		if(!this.is_running()) {
			this._running = true;
			this._emit("run", {
				target: this,
				type: "run"
			});
		}
		return this;
	};
	proto.destroy = function() {
		cjs.wait();
		my.superclass.destroy.apply(this, arguments);
		this.outgoingTransition.destroy();
		cjs.signal();
	};

	proto.get_transitions_to = function(to) {
		if(this.getTo() === to) {
			return this.get_outgoing_transitions();
		} else {
			return [];
		}
	};
	proto.get_transitions_from = function(from) {
		if(from === this && this.getTo() === this) {
			return this.get_outgoing_transitions();
		} else {
			return [];
		}
	};
	proto.get_outgoing_transition = function() {
		return this.outgoingTransition;
	};

	proto.create_shadow = function(options) {
		var rv = new red.StartState(_.extend({
			basis: this,
		}, options));

		return rv;
	};

	red.register_serializable_type("start_state",
									function(x) { 
										return x instanceof my;
									},
									function(include_id) {
										var args = _.toArray(arguments);
										var rv = {
											outgoing_transition: red.serialize.apply(red, ([this.get_outgoing_transition()]).concat(args))
											, parent: red.serialize.apply(red, ([this.parent()]).concat(args))
										};
										if(include_id) {
											rv.id = this.id();
										}
										return rv;
									},
									function(obj) {
										var rest_args = _.rest(arguments);
										var rv;
										if(obj.id) {
											if(rv = red.find_uid(obj.id)) {
												return rv;
											}
										}
										rv = new my({id: obj.id}, true);
										rv.initialize = function() {
											var options = {
												outgoing_transition: red.deserialize.apply(red, ([obj.outgoing_transition]).concat(rest_args)),
												parent: red.deserialize.apply(red, ([obj.parent]).concat(rest_args))
											};
											this.do_initialize(options);
										};

										return rv;
									});
}(red.StartState));

red.Statechart = function(options) {
	options = options || {};
	this._transition_listeners = {};
	red.Statechart.superclass.constructor.apply(this, arguments);
};
(function(my) {
	_.proto_extend(my, red.State);
	var proto = my.prototype;

	proto.do_initialize = function(options) {
		this._start_state = options.start_state || new red.StartState({
			parent: this,
			to: options.start_at
		});
		this.$substates = options.substates || cjs.map();
		this.$substates.set_value_hash("hash");
		this.$concurrent = cjs.$(options.concurrent === true);
		this._parent = options.parent;
		this.$incoming_transitions = options.incoming_transitions || cjs.array();
		this.$outgoing_transitions = options.outgoing_transitions || cjs.array();

		this._running = options.running === true;

		my.superclass.do_initialize.apply(this, arguments);

		var my_starting_state;
		if(this._running && this._basis) {
			var basis_start_state = this._basis.get_start_state();
			var basis_start_state_to = basis_start_state.getTo();
			
			if(basis_start_state_to === basis_start_state) {
				my_starting_state = this._start_state;
			} else {
				my_starting_state = red.find_equivalent_state(basis_start_state_to, this);
			}
		} else {
			my_starting_state = this._start_state;
		}
		this.$local_state = cjs.$(my_starting_state);
		my_starting_state.enable_outgoing_transitions();

		red.register_uid(this._id, this);
		this._initialized = true;
		this._emit("initialized");
	};

	proto.is_concurrent = function() { return this.$concurrent.get(); };
	proto.make_concurrent = function(is_concurrent) {
		is_concurrent = is_concurrent === true;
		this.$concurrent.set(is_concurrent);
		this._emit("make_concurrent", {
			target: this,
			concurrent: is_concurrent
		});
		return this;
	};
	proto.get_substates = function(include_start) {
		var rv = {};

		this.$substates.each(function(substate, name) {
			rv[name] = substate;
		});

		if(include_start) {
			rv["(start)"] = this.get_start_state();
		}

		return rv;
	};
	proto.get_start_state = function() { return this._start_state; };
	proto.set_start_state = function(state) {
		cjs.wait();
		if(this.$local_state && this.$local_state.get() === this.get_start_state()) {
			this.$local_state.set(state);
			this.$local_state.enable_outgoing_transitions();
		}
		this._start_state = state;
		cjs.signal();
	};
	proto.get_incoming_transitions = function() { return this.$incoming_transitions.toArray(); };
	proto.get_outgoing_transitions = function() { return this.$outgoing_transitions.toArray(); };
	proto.get_active_substate = function() { return this.$local_state.get(); };
	proto.is_running = function() { return this._running; };

	proto.set_active_substate = function(state, transition, event) {
		red.event_queue.once("end_event_queue_round_0", function() {
			this._emit("pre_transition_fire", {
				type: "pre_transition_fire",
				transition: transition,
				target: this,
				event: event,
				state: state
			});
			cjs.wait();
			if(transition) { transition.set_active(true); }
		}, this);
		red.event_queue.once("end_event_queue_round_3", function() {
			var local_state = this.$local_state.get()
			if(local_state) {
				local_state.disable_outgoing_transitions();
				local_state.set_active(false);
			}
			local_state = state;
			this.$local_state.set(local_state);
			local_state._last_run_event.set(event);
			if(local_state) {
				if(!local_state.is_running()) {
					local_state.run();
				}
				local_state.set_active(true);
				local_state.enable_outgoing_transitions();
			}
			if(transition) { transition.increment_times_run(); }
		}, this);
		red.event_queue.once("end_event_queue_round_4", function() {
			if(transition) { transition.set_active(false); }
			cjs.signal();
			this._emit("post_transition_fire", {
				type: "post_transition_fire",
				transition: transition,
				target: this,
				event: event,
				state: state
			});
		}, this);
	};
	proto.run = function() {
		if(!this.is_running()) {
			red.event_queue.wait();
			this._running = true;

			this.enable_outgoing_transitions();
			this.get_active_substate().run();

			this._emit("run", {
				target: this,
				type: "run"
			});
			red.event_queue.signal();
		}
		return this;
	};
	proto.stop = function() {
		red.event_queue.wait();
		this._running = false;
		this.disable_outgoing_transitions();
		this.$local_state.set(this._start_state);
		_.forEach(this.get_substates(), function(substate) {
			substate.stop();
		});
		this._emit("stop", {
			type: "stop",
			target: this
		});
		red.event_queue.signal();
		return this;
	};
	proto.reset = function() {
		if(this.is_running()) {
			this.stop();
			this.run();
		}
		return this;
	};
	proto.get_name_for_substate = function(substate) {
		return substate === this.get_start_state() ? "(start)" : this.$substates.keyForValue(substate);
	};
	proto.get_active_direct_substates = function() {
		if(this.is_concurrent()) {
			return this.get_substates();
		} else {
			return [this.$local_state.get()];
		}
	};
	proto.get_active_states = function() {
		return _.chain(this.get_active_direct_substates())
				.map(function(substate) {
					return ([substate]).concat(substate.get_active_states());
				})
				.flatten(true)
				.value();
	};
	proto.get_substate_with_name = function(name) {
		if(name === "(start)") {
			return this.get_start_state();
		} else {
			return this.$substates.get(name);
		}
	};
	proto.has_substate_with_name = function(name) {
		if(name === "(start)") {
			return true;
		} else {
			return this.$substates.has(name);
		}
	};
	proto.find_state = function(state_name, create_superstates, state_value, index) {
		if(state_name instanceof red.State) {
			return state_name;
		} else if(_.isArray(state_name)) {
			if(_.isEmpty(state_name)) {
				return this;
			} else {
				var first_state_name = _.first(state_name);
				if(_.size(state_name) === 1) {
					if(!this.has_substate_with_name(first_state_name) && create_superstates === true) {
						this.add_substate(first_state_name, state_value, index);
					}
					var state = this.get_substate_with_name(first_state_name);
					return state || undefined;
				} else {
					if(create_superstates===true && !this.has_substate_with_name(first_state_name)) {
						this.add_substate(first_state_name);
					}
					var state = this.get_substate_with_name(first_state_name);
					if(!state) {
						return undefined;
					} else {
						return state.find_state(_.rest(state_name), create_superstates, state_value, index);
					}
				}
			}
		} else if(_.isString(state_name)) {
			return this.find_state(state_name.split("."), create_superstates, state_value, index);
		} else {
			return undefined;
		}
	};
	proto.find_transitions = function(from, to, index) {
		from = this.find_state(from);
		to = this.find_state(to);

		if(!from || !to) {
			return undefined;
		}

		var rv = from.get_transitions_to(to);

		if(_.isNumber(index)) {
			return rv[index];
		} else {
			return rv;
		}
	};
	proto.get_substate_index = function(substate) {
		var name = substate.get_name(this);
		return this.$substates.indexOf(name);
	};
	proto.add_substate = function(state_name, state, index) {
		if(state instanceof red.Statechart) {
			state.set_parent(this);
		} else {
			state = new red.Statechart({parent: this});
		}
		state.on("pre_transition_fire", this.forward);
		state.on("post_transition_fire", this.forward);
		this.$substates.put(state_name, state, index);
		this._emit("add_substate", {
			type: "add_substate",
			state_name: state_name,
			state: state,
			index: index
		});
	};
	proto.remove_substate = function(name, state, also_destroy) {
		state = state || this.$substates.get(name);
		cjs.wait();
		if(this.get_active_substate() === state) {
			this.set_active_substate(undefined);
		}
		this.$substates.remove(name);
		cjs.signal();
		state.off("pre_transition_fire", this.forward);
		state.off("post_transition_fire", this.forward);

		this._emit("remove_substate", {
			type: "remove_substate",
			state: state,
			name: name,
			also_destroy: also_destroy
		});

		if(also_destroy !== false) {
			state.destroy();
		}
	};
	proto.rename_substate = function(from_name, to_name) {
		var keyIndex = this.$substates.indexOf(from_name);
		if(keyIndex >= 0) {
			var substate = this.$substates.get(from_name);
			cjs.wait();
			this.$substates	.wait()
							.remove(from_name)
							.put(to_name, substate, keyIndex)
							.signal();
			cjs.signal();
			this._emit("rename_substate", {
				type: "rename_substate",
				state: substate,
				from: from_name,
				to: to_name
			});
		}
	};
	proto.move_substate = function(state_name, index) {
		this.$substates.move(state_name, index);
		this._emit("move_substate", {
			type: "move_substate",
			state_name: state_name,
			index: index
		});
	};
	proto.add_state = function(state_name, state, index) {
//		if(state_name === "(start)") {
//			this.set_start_state(state);
//		} else {
			if(this.find_state(state_name)) {
				throw new Error("State with name '" + state_name + "' already exists.");
			}
			this.find_state(state_name, true, state, index);
//		}
		return this;
	};
	proto.remove_state = function(state_name, also_destroy) {
		var state = this.find_state(state_name);
		if(!_.isUndefined(state)) {
			var parent = state.parent();
			if(!_.isUndefined(parent)) {
				parent.remove_substate(state_name, state, also_destroy);
			}
		}
		return this;
	};
	proto.rename_state = function(from_name, to_name) {
		var from_state = this.find_state(from_name);
		if(from_state) {
			var from_state_parent = from_state.parent();
			if(parent) {
				var to_name_arr = to_name.split(".");
				var to_state_parent = this.find_state(_.initial(to_name_arr), true);
				var to_state_name = _.last(to_name_arr);
				if(from_state_parent === to_state_parent) {
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
	proto.move_state = function(state_name, index) {
		var state = this.find_state(state_name);
		if(state) {
			var parent = state.parent();
			if(parent) {
				var state_name = parent.get_name_for_substate(state);
				parent.move_substate(state_name, index);
			}
		}
		return this;
	};
	proto.destroy = function() {
		this._emit("destroy", {
			type: "destroy",
			target: this
		});

		cjs.wait();
		my.superclass.destroy.apply(this, arguments);
		_.forEach(this.get_incoming_transitions(), function(transition) {
			transition.remove().destroy();
		});
		_.forEach(this.get_outgoing_transitions(), function(transition) {
			transition.remove().destroy();
		});
		_.forEach(this.get_substates(), function(substate) {
			substate.destroy();
		});
		this.$substates.destroy();
		this.$concurrent.destroy();


		this.$incoming_transitions.destroy();
		this.$outgoing_transitions.destroy();
		this.get_start_state().destroy();
		cjs.signal();
	};
	proto.get_substate_names = function() {
		return this.$substates.keys();
	};
	proto.is = function(state) {
		state = this.find_state(state);
		if(state) {
			var to_check_lineage = state.get_lineage(this);
			if(to_check_lineage[0] !== this) { //It has a different root
				return false;
			} else {
				var len = to_check_lineage.length-1;
				for(var i = 0; i<len; i++) {
					var s = to_check_lineage[i];
					if(!s.is_concurrent() && s.get_active_substate() !== to_check_lineage[i+1] ) {
						return false;
					}
				}
				return true;
			}
		} else {
			return false;
		}
	};
	proto.contains = function(state, direct) {
		direct = direct !== false;
		var state = this.find_state(state);
		if(this === state) { return true; }
		else {
			var substates = this.get_substates(true);
			return _.any(substates, function(substate) {
				return substate.contains(state);
			});
		}
	};
	proto.add_transition = function(arg0, arg1, arg2) {
		var from_state, to_state, transition;
		if(arguments.length === 1) {
			if(arg0 instanceof red.StatechartTransition) {
				transition = arg0;
			}
		} else {
			from_state = this.find_state(arg0);
			if(!from_state) { throw new Error("No state '" + arg0 + "'"); }
			to_state = this.find_state(arg1);
			if(!to_state) { throw new Error("No state '" + arg1 + "'"); }
			var event = arg2;
			transition = new red.StatechartTransition({from: from_state, to: to_state, event: event});
			this._last_transition  = transition;

			from_state._add_direct_outgoing_transition(transition);
			to_state._add_direct_incoming_transition(transition);
		}

		if(this.is_active()) {
			transition.enable();
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
	proto.get_transitions_to = function(to) {
		return this.$outgoing_transitions.filter(function(transition) {
			return transition.to() === to;
		});
	};
	proto.get_transitions_from = function(from) {
		return this.$incoming_transitions.filter(function(transition) {
			return transition.from() === from;
		});
	};
	proto._add_direct_outgoing_transition = function(transition, index) {
		if(_.isNumber(index)) {
			this.$outgoing_transitions.splice(index, 0, transition);
		} else {
			this.$outgoing_transitions.push(transition);
		}
	};
	proto._add_direct_incoming_transition = function(transition, index) {
		if(_.isNumber(index)) {
			this.$incoming_transitions.splice(index, 0, transition);
		} else {
			this.$incoming_transitions.push(transition);
		}
	};
	proto._remove_direct_outgoing_transition = function(transition) {
		var index = this.$outgoing_transitions.indexOf(transition);
		if(index >= 0) {
			this.$outgoing_transitions.splice(index, 1);
		}
	};
	proto._remove_direct_incoming_transition = function(transition) {
		var index = this.$incoming_transitions.indexOf(transition);
		if(index >= 0) {
			this.$incoming_transitions.splice(index, 1);
		}
	};
	proto.get_initial_state = function() {
		var start_state = this.get_start_state();
		return start_state.getTo();
	};
	proto.starts_at = proto.set_initial_state = function(state) {
		state = this.find_state(state, false);
		if(!state) {
			throw new Error("Could not find state " + state);
		}
		var start_state = this.get_start_state();
		start_state.setTo(state);
		if(this.is_running() && this.get_active_substate() === start_state) {
			this.set_active_substate(state);
		}
		return this;
	};

	proto.create_shadow = function(options) {
		var rv = new red.Statechart(_.extend({
			basis: this,
			concurrent: this.is_concurrent()
		}, options));

		return rv;
	};

	proto.get_transitions = function() {
		return (this.get_incoming_transitions()).concat(this.get_outgoing_transitions());
	};

	proto.get_substate_transitions = function() {
		var my_transitions = this.get_transitions();
		return _.uniq(
			_.flatten(
				my_transitions.concat(_.map(this.get_substates(), function(substate) {
					return substate.get_substate_transitions();
				})),
				true
			)
		);
	};

	proto.on_transition = proto.on_state = function(str, activation_listener, deactivation_listener, context) {
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
		if(_.isArray(tlisteners)) {
			tlisteners.push(info);
		} else {
			tlisteners = this._transition_listeners[str] = [info];
		}
		return this;
	};
	proto.off_transition = proto.on_state = function(str, activation_listener, deactivation_listener, context) {
		this._emit("off_transition", {
			type: "off_transition",
			target: this,
			str: str,
			activation_listener: activation_listener,
			deactivation_listener: deactivation_listener,
			context: context
		});
		var tlisteners = this._transition_listeners[str];
		if(_.isArray(tlisteners)) {
			for(var i = 0; i<tlisteners.length; i++) {
				var tlistener = tlisteners[i];
				if(tlistener.activation_listener === activation_listener &&
						tlistener.deactivation_listener === deactivation_listener) {
					tlistener.destroy();
					tlisteners.splice(i, 1);
					i--;
				}
			}
			if(tlisteners.length === 0) {
				delete this._transition_listeners[str];
			}
		}
	};
	proto.print = function() {
		red.print_statechart(this);
	};

	red.register_serializable_type("statechart",
									function(x) { 
										return x instanceof my;
									},
									function(include_id) {
										var arg_array = _.toArray(arguments);
										var rv = {
											substates: red.serialize.apply(red, ([this.$substates]).concat(arg_array))
											, concurrent: this.is_concurrent()
											, start_state: red.serialize.apply(red, ([this.get_start_state()]).concat(arg_array))
											, outgoing_transitions: red.serialize.apply(red, ([this.$outgoing_transitions]).concat(arg_array))
											, incoming_transitions: red.serialize.apply(red, ([this.$incoming_transitions]).concat(arg_array))
											, parent: red.serialize.apply(red, ([this.parent()]).concat(arg_array))
										};
										if(include_id) {
											rv.id = this.id();
										}
										return rv;
									},
									function(obj) {
										var rest_args = _.rest(arguments);
										var rv;
										if(obj.id) {
											if(rv = red.find_uid(obj.id)) {
												return rv;
											}
										}
										rv = new my({id: obj.id}, true);
										rv.initialize = function() {
											var options = {
												substates: red.deserialize.apply(red, ([obj.substates]).concat(rest_args))
												, concurrent: obj.concurrent
												, start_state: red.deserialize.apply(red, ([obj.start_state]).concat(rest_args))
												, outgoing_transitions: red.deserialize.apply(red, ([obj.outgoing_transitions]).concat(rest_args))
												, incoming_transitions: red.deserialize.apply(red, ([obj.incoming_transitions]).concat(rest_args))
												, parent: red.deserialize.apply(red, ([obj.parent]).concat(rest_args))
											};
											this.do_initialize(options);
										};

										return rv;
									});
}(red.Statechart));

red.define("statechart", function(options) {
	return new red.Statechart(options);
});
red.is_statechart = function(obj) {
	return obj instanceof red.Statechart;
};

}(red));
