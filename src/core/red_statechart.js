(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var RedStatechartTransition = function(from_state, to_state) {
	this.from_state = from_state;
	this.to_state = to_state;
};

(function(my) {
	var proto = my.prototype;
	proto.run = function(event) {
		var parent = from_state.parent();
		if(_.isUndefined(parent)) {
			parent = from_state;
		}
		if(parent.is(from_state)) {
			parent.set_state(to_state, event);
		}
	};
}(RedStatechartTransition));

var RedStatechart = function() {
	this.transitions = [];
	this.states = {};
	this._starts_at = undefined;
	this._parent = undefined;
	this._concurrent = false;
	this._active_state = undefined;
	this._listeners = {};
};
(function(my) {
	var proto = my.prototype;
	proto.add_state = function(state_name) {
		var state = this.states[state_name] = new RedStatechart();
		state.set_parent(this);
		return this;
	};
	proto.in_state = function(state_name) {
		return this.get_state_with_name(state_name);
	};
	proto.starts_at = function(state_name) {
		this._starts_at = state_name;
		return this;
	};
	proto.get_initial_state = function() {
		return this.get_state_with_name(this._starts_at);
	};
	proto.parent = function() {
		return this._parent;
	};
	proto.set_parent = function(parent) {
		this._parent = parent;
		return this;
	};
	proto.get_state_with_name = function(state_name) {
		return this.states[state_name];
	};
	proto.concurrent = function(is_concurrent) {
		this._concurrent = is_concurrent;
		return this;
	};
	proto.is_concurrent = function() {
		return this._concurrent;
	};
	proto.run = function() {
		if(this._concurrent) {
			_.forEach(this.states, function(state) {
				state.run();
			});
		} else {
			this._active_state.run();
		}
		var event = {
			type: "run"
			, timestamp: (new Date()).getTime()
			, target: this
		};
		this._notify("run", event);
		return this;
	};
	proto.get_states = function() {
		if(this._concurrent) {
			var active_states = _.map(this.states, function(state) {
				return state.get_states();
			});
			var rv = [];
			return rv.concat.apply(rv, active_states);
		} else {
			var rv = [this._active_state];
			return rv.concat(this._active_state.get_states());
		}
	};
	proto.set_state = function(state, event) {
		var states_left = [];
		var states_entered = [];
		var curr_state = this._active_state;

		while(!_.isUndefined(curr_state) && curr_state !== this) {
			states_left.push(curr_state);
			curr_state = curr_state.parent();
		}

		curr_state = this._active_state;

		while(!_.isUndefined(curr_state) && curr_state !== this) {
			states_entered.push(curr_state);
			curr_state = curr_state.parent();
		}

		_.forEach(states_left, function(state) {
			state._notify("exit", event);
		});
		this._active_state = state;
		_.forEach(states_entered, function(state) {
			state._notify("enter", event);
		});

		this.notify_parent(left_state, entered_states);

		return this;
	};
	proto.notify_parent = function(left_states, entered_states) {
		var parent = this.parent();
		if(_.isUndefined(parent)) {
		} else {
			this.notify_parent(left_states, entered_states);
		}
	};
	proto.is = function(state) {
		if(this === state) { return true; }

		if(this._concurrent) {
			return _.any(this.states, function(state) {
				return state.is(state);
			});
		} else {
			if(_.isUndefined(this._active_state)) {
				return false;
			} else {
				return this._active_state.is(state);
			}
		}
	};

	proto._get_transition = function() {
		var from_state, to_state;
		if(arguments.length >= 2) {
			from_state = arguments[0];
			to_state = arguments[1];
		} else {
			from_state = this;
			to_state = arguments[0];
		}

		if(_.isString(from_state)) {
			from_state = this.get_state_by_name(from_state);
		}
		if(_.isString(to_state)) {
			to_state = this.get_state_by_name(to_state);
		}

		var transition = new RedStatechartTransition(from_state, to_state);
		this.transitions.push(transition);
		return transition;
	};

	proto.add_transition = function() {
		var from_state, to_state, event;
		if(arguments.length >=3)  {
			from_state = arguments[0];
			to_state = arguments[1];
			event= arguments[2];
		} else {
			from_state = this;
			to_state = arguments[0];
			event= arguments[1];
		}

		var transition = this._get_transition(from_state, to_state);
		event.set_transition(transition);
		
		return this;
	};


	proto._on = function(event_type, func) {
		var listeners;
		if(_.has(this._listeners, event_type)) {
			listeners = this._listeners[event_type];
		} else {
			this._listeners[event_type] = listeners = [];
		}
		listeners.push(func);
		return this;
	};
	proto._off = function(event_type, func) {
		var listeners = this._listeners[event_type];
		this._listeners[event_type] = _.without(this._listeners[event_type], func);
		if(_.isEmpty(this._listeners[event_type])) {
			delete this._listeners[event_type];
		}
		return this;
	};
	proto._once = function(event_type, func) {
		var self = this;
		var listener = function() {
			var rv = func.apply(this, arguments);
			self._off(event_type, func);
			return rv;
		};
		this._on(event_type, listener);
		return listener;
	};
	proto._notify = function(event_type, event) {
		var listeners = this._listeners[event_type];
		_.forEach(listeners, function(func) {
			func(event);
		});
		return this;
	};

	var bind = function(func) {
		var bind_args = _.toArray(_.rest(arguments));
		var rv = function() {
			var args = bind_args.concat(_.toArray(arguments));
			return func.apply(this, args);
		};
		return rv;
	};
	proto.on_enter = bind(proto._on, "enter");
	proto.off_enter = bind(proto._off, "enter");
	proto.once_enter = bind(proto._once, "enter");
	proto.on_exit = bind(proto._on, "exit");
	proto.off_exit = bind(proto._off, "exit");
	proto.once_exit = bind(proto._once, "exit");
}(RedStatechart));

red.create_statechart = function() {
	return new RedStatechart();
};

}(red));
