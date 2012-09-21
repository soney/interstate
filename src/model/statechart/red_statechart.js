(function(red) {
var cjs = red.cjs, _ = red._;

var StatechartTransition = function(from_state, to_state, event) {
	this._from_state = from_state;
	this._to_state = to_state;
	this.id = _.uniqueId();
	this.do_run = _.bind(this.run, this);
	this.set_event(event);
	this.$parent = cjs.$();
};
(function(my) {
	var proto = my.prototype;
	proto.from = function() { return this._from_state; }; 
	proto.to = function() { return this._to_state; };
	proto.set_event = function(event) {
		if(this._event) {
			this._event.off_fire(this.do_run);
			this._event.destroy();
		}
		this._event = event;
		if(this._event) {
			this._event.set_transition(this);
			this._event.on_fire(this.do_run);
		}
	};
	proto.event = function() { return this._event; };
	proto.involves = function(state) { return this.from() === state || this.to() === state; };
	proto.set_basis = function(basis) { this._basis = basis; };
	proto.basis = function() { return this._basis; };
	proto.destroy = function() {
		this._event.off_fire(this.do_run);
		this._event.destroy();
	};
	proto.get_parent_statechart = function() {
		var from = this.from();
		return from.root();
	};
	proto.run = function(event) {
		var statechart = this.get_statechart();
		statechart.on_transition_fire(this, event);
	};
	proto.create_shadow = function(from_state, to_state) {
		var my_event = this.event()
			, shadow_event = my_event.create_shadow();
		var shadow_transition = new StatechartTransition(from_state, to_state, shadow_event);
		return shadow_transition;
	};
	proto.stringify = function() {
		var event = this.event();
		var stringified_event = event ? ","+event.stringify() : "";
		return "" + this.id + stringified_event;
	};
	proto.set_statechart = function(parent) { this.$parent.set(parent); };
	proto.get_statechart = function(parent) { return this.$parent.get(); };
	proto.remove = function() {
		var from = this.from();
		var parent = from.parent() || from;
		parent.remove_transition(this);
	};
}(StatechartTransition));

var Statechart = function(options) {
	options = _.extend({}, options);

	this.id = _.uniqueId();
	this.$substates = options.substates || cjs.map();
	this.$local_state = cjs();
	this.$concurrent = cjs(false);
	this._init_state = undefined;
	this._running = false;
	this._parent = options.parent;
	this.$incoming_transitions = options.incoming_transitions || cjs.array();
	this.$outgoing_transitions = options.outgoing_transitions || cjs.array();
};
(function(my) {
	var proto = my.prototype;
	proto.set_basis = function(basis) { this._basis = basis; };
	proto.basis = function() { return this._basis; };
	proto.parent = function() { return this._parent; };
	proto.set_parent = function(parent) { this._parent = parent; };
	proto.set_context = function(context) { this._context = context; };
	proto.get_context = function() { return this._context; };
	proto.is_concurrent = function() { return this.$concurrent.get(); };
	proto.make_concurrent = function(is_concurrent) { this.$concurrent.set(is_concurrent===true); return this; };
	proto.get_substates = function() { return this.$substates.values(); };
	proto.get_incoming_transitions = function() { return this.$incoming_transitions.get(); };
	proto.get_outgoing_transitions = function() { return this.$outgoing_transitions.get(); };
	proto.set_active_substate = function(substate) { this.$local_state.set(substate); };
	proto.get_active_substate = function(substate) { return this.$local_state.get(); };
	proto.is_running = function() { return this._running; };
	proto.run = function() {
		if(!this.is_running()) {
			this._running = true;
			this.set_active_substate(this._init_state);
		}
		return this;
	};
	proto.stop = function() {
		this._running = false;
		this.$local_state.set(undefined);
	};
	proto.reset = function() {
		if(this.is_running()) {
			this.$local_state.set(this._init_state);
		}
	};
	proto.get_name_for_substate = function(substate) {
		return this.$substates.keyForValue(substate);
	};
	proto.get_active_direct_substates = function() {
		if(this.is_concurrent()) {
			return this.get_substates();
		} else {
			var local_state = this.$local_state.get();
			if(local_state instanceof Statechart) { return [local_state]; }
			else { return []; }
		}
	};
	proto.get_active_states = function() {
		return _.chain(this.get_active_direct_substates())
				.map(function(substate) {
					return ([substate]).concat(substate.get_active_states());
				})
				.flatten()
				.value();
	};
	proto.get_substate_with_name = function(name) { return this.$substates.item(name); };
	proto.has_substate_with_name = function(name) { return this.$substates.has(name); };
	proto.find_state = function(state_name, create_superstates, state_value, index) {
		if(state_name instanceof Statechart) {
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
	proto.add_substate = function(state_name, state, index) {
		if(!(state instanceof Statechart)) {
			state = new Statechart({parent: this});
		}
		this.$substates.item(state_name, state, index);
	};
	proto.remove_substate = function(substate, also_destroy) {
		var name = this.$substates.keyForValue(substate);
		if(name) {
			cjs.wait();
			if(this.get_active_substate() === substate) {
				this.set_active_substate(undefined);
			}
			this.$substates.remove(name);
			if(also_destroy !== false) {
				substate.destroy();
			}
			cjs.signal();
		}
	};
	proto.rename_substate = function(from_name, to_name) {
		this.$substates.rename(from_name, to_name);
	};
	proto.move_substate = function(state_name, index) {
		this.$substates.move(state_name, index);
	};
	proto.add_state = function(state_name, state, index) {
		if(this.find_state(state_name)) {
			throw new Error("State with name '" + state_name + "' already exists.");
		}
		this.find_state(state_name, true, state, index);
		return this;
	};
	proto.remove_state = function(state_name, also_destroy) {
		var state = this.find_state(state_name);
		if(!_.isUndefined(state)) {
			var parent = state.parent();
			if(!_.isUndefined(parent)) {
				parent.remove_substate(state, also_destroy);
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
					var from_state_name = _.last(from_name);
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
		cjs.wait();
		_.forEach(this.get_incoming_transitions(), function(transition) {
			transition.destroy();
		});
		_.forEach(this.get_outgoing_transitions(), function(transition) {
			transition.destroy();
		});
		_.forEach(this.get_substates(), function(substate) {
			substate.destroy();
		});
		cjs.signal();
	};
	proto.get_substate_names = function() {
		return this.$substates.keys();
	};
	proto.is = function(state) {
		state = this.find_state(state);
		if(state) {
			return _.indexOf(this.get_active_states(), state) >= 0;
		} else {
			return false;
		}
	};
	proto.root = function() {
		var parent = this.parent();
		if(parent) { return parent.root(); }
		else { return this; }
	};
	proto.contains = function(state, direct) {
		direct = direct !== false;
		var state = this.find_state(state);
		if(this === state) { return true; }
		else {
			var substates = this.get_substates();
			return _.any(substates, function(substate) {
				return substate.contains(state);
			});
		}
	};
	proto.add_transition = function(arg0, arg1, arg2) {
		var from_state, to_state, transition;
		if(arguments.length === 1) {
			if(arg0 instanceof StatechartTransition) {
				transition = arg0;
				from_state = transition.from();
				to_state = transition.to();
			}
		} else {
			from_state = this.find_state(arg0);
			if(!from_state) { throw new Error("No state '" + arg0 + "'"); }
			to_state = this.find_state(arg1);
			if(!to_state) { throw new Error("No state '" + arg1 + "'"); }
			var event = arg2;
			transition = new StatechartTransition(from_state, to_state, event);
			this._last_transition  = transition;
		}
		transition.set_statechart(this);
		from_state.add_direct_outgoing_transition(transition);
		to_state.add_direct_incoming_transition(transition);

		return this;
	};
	proto.get_transitions_to = function(to) {
		return this.$outgoing_transitions.filter(function(transition) {
			return transition.to() === to;
		});
	};
	proto.get_transitions_from = function(to) {
		return this.$incoming_transitions.filter(function(transition) {
			return transition.from() === from;
		});
	};
	proto.remove_transition = function(transition) {
		transition.from().remove_direct_outgoing_transition(transition);
		transition.to().remove_direct_incoming_transition(transition);
	};
	proto.add_direct_outgoing_transition = function(transition) {
		this.$outgoing_transitions.push(transition);
	};
	proto.add_direct_incoming_transition = function(transition) {
		this.$incoming_transitions.push(transition);
	};
	proto.remove_direct_outgoing_transition = function(transition) {
		var index = this.$outgoing_transitions.indexOf(transition);
		this.$outgoing_transitions.splice(index, 1);
	};
	proto.remove_direct_incoming_transition = function(transition) {
		var index = this.$incoming_transitions.indexOf(transition);
		this.$incoming_transitions.splice(index, 1);
	};
	proto.get_lineage = function() {
		var curr_node = this;
		var parentage = [];
		do {
			parentage.push(curr_node);
			curr_node = curr_node.parent();
		} while(curr_node);
		return parentage.reverse();
	};
	proto.on_transition_fire = function(transition, event) {
		if(this.is_running()) {
			var from = transition.from();
			if(this.is(from)) {
				var to = transition.to();
				var to_lineage = to.get_lineage();
				var i = _.indexOf(to_lineage, this)
					, len = to_lineage.length;
				if(i >= 0) {
					cjs.wait();
					for(; i<len-1; i++) {
						var parent = to_lineage[i];
						var active_substate = to_lineage[i+1];
						if(!active_substate.is_running()) {
							active_substate.run();
						}
						parent.set_active_substate(active_substate);
					}
					cjs.signal();
				}
			}
		}
	};
	proto.starts_at = function(state) {
		this._init_state = this.find_state(state);
		if(this.is_running() && this.get_active_substate() == null) {
			this.set_active_substate(this._init_state);
		}
		return this;
	};

	proto.get_name = function(relative_to) {
		var parent = this.parent();
		if(!relative_to) {
			relative_to = this.root();
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

	proto.create_shadow = function(context) {
		var init_state = this._init_state;
		var shadow = red.create("statechart", {substates: this.$substates.$shadow(function(substate) {
			var substate_shadow = substate.create_shadow(context);
			substate_shadow.set_parent(shadow);
			if(substate === init_state) {
				shadow.starts_at(substate_shadow);
			}
			return substate_shadow;
		})
		});

		
		var self = this;
		var mapped_incoming = [];
		var cached_incoming = [];
		this.$incoming_transitions.onChange(function() {
			var incoming = self.$incoming_transitions.get();
			var diff = _.diff(cached_incoming, incoming);

			_.forEach(diff.removed, function(info) {
				var index = info.index
					, item = info.item;
				var mapped_transition = mapped_incoming.splice(index, 1)[0];
				this.remove_transition(mapped_transition);
			});
			_.forEach(diff.added, function(info) {
				var index = info.index
					, item= info.item;
				var orig_from = item.from();
				var orig_to = item.to();
				var from_name = orig_from.get_name();
				var to_name = orig_to.get_name();
				var orig_event = item.event();
				var shadow_event = orig_event.shadow(context.last(), context);

				shadow.root().add_transition(from_name, to_name, shadow_event);
				var transition = shadow.root()._last_transition;
				mapped_incoming.splice(index, 0, transition);
			});
			_.forEach(diff.moved, function(info) {
				var from_index = info.from_index
					, to_index = info.to_index
					, item = info.item;
			});

			cached_incoming = incoming;
		});
		/*
		var cached_outgoing = [];
		this.$outgoing_transitions.onChange(function() {
			console.log("CHANGE");
		});
		*/
		shadow.set_basis(this);
		return shadow;
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

	proto.stringify = function(tab_level, punctuation) {
		var name_spacing = 15;
		var rv = "";
		if(!_.isString(punctuation)) { punctuation = ""; }
		if(!_.isNumber(tab_level)) { tab_level = 0; }
		_.times(tab_level, function() {
			rv += "    ";
		});
		var name = punctuation + this.id + ": " + this.get_name(this.parent());
		rv += name;
		_.times(Math.max(1, name_spacing - name.length), function() {
			rv += " ";
		});
		rv += _.map(this.get_outgoing_transitions(), function(transition) {
			var to = transition.to().get_name();
			return " -(" + transition.stringify() + ")-> " + to;
		}).join(", ");
		var self = this;
		_.forEach(this.get_substates(), function(substate) {
			rv += "\n";
			var punctuation = "";
			if(self.is_concurrent()) {
				punctuation = "| ";
			} else if(self.is(substate)) {
				punctuation = "* ";
			}
			rv += substate.stringify(tab_level + 1, punctuation);
		});
		return rv;
	};
}(Statechart));

red.define("statechart", function(options) {
	return new Statechart(options);
});
red.is_statechart = function(obj) {
	return obj instanceof Statechart;
};

}(red));
