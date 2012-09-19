(function(red) {
var cjs = red.cjs, _ = red._;

var AddStateCommand = function(options) {
	AddStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._state_name = this._options.name;
	this._index = this._options.index;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		if(_.has(this, "_state")) {
			this._statechart.add_state(this._state_name, this._state, this._index);
		} else {
			this._statechart.add_state(this._state_name, "statechart", this._index);
			this._state = this._statechart.get_state_with_name(this._state_name);
		}
	};

	proto._unexecute = function() {
		this._statechart.remove_state(this._state_name, false); //don't destroy
	};

	proto._do_destroy = function(in_effect) {
		if(!in_effect) {
			this._state.destroy();
		}
	};
}(AddStateCommand));

red._commands["add_state"] = function(options) {
	return new AddStateCommand(options);
};

var RemoveStateCommand = function(options) {
	RemoveStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._state_name = this._options.name;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._index = this._statechart.get_state_index(this._state_name);
		this._state = this._statechart._find_state(this._state_name);
		this._transitions = this._statechart.transitions_involving(this._state);
		this._statechart.remove_state(this._state_name, false); //don't destroy
	};

	proto._unexecute = function() {
		this._statechart.add_state(this._state_name, this._state, this._index);
		var self = this;
		_.forEach(this._transitions, function(transition) {
			self._statechart.add_transition(transition);
		});
	};

	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			this._state.destroy();
			_.forEach(this._transitions, function(transition) {
				transition.destroy();
			});
		}
	};
}(RemoveStateCommand));

red._commands["remove_state"] = function(options) {
	return new RemoveStateCommand(options);
};

var MoveStateCommand = function(options) {
	MoveStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._state_name = this._options.name;
	this._to_index = this._options.index;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._from_index = this._statechart.get_state_index(this._state_name);
		this._statechart.move_state(this._state_name, this._to_index);
	};

	proto._unexecute = function() {
		this._statechart.move_state(this._state_name, this._from_index);
	};

	proto._do_destroy = function(in_effect) { };
}(MoveStateCommand));

red._commands["move_state"] = function(options) {
	return new MoveStateCommand(options);
};

var RenameStateCommand = function(options) {
	RenameStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._from_state_name = this._options.from;
	this._to_state_name = this._options.to;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._statechart.rename_state(this._from_state_name, this._to_state_name);
	};

	proto._unexecute = function() {
		this._statechart.rename_state(this._to_state_name, this._from_state_name);
	};

	proto._do_destroy = function(in_effect) { };
}(RenameStateCommand));

red._commands["rename_state"] = function(options) {
	return new RenameStateCommand(options);
};

var AddTransitionCommand = function(options) {
	AddTransitionCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._from_state_name = this._options.from;
	this._to_state_name = this._options.to;

	if(_.isString(this._options.event)) {
		this._parent = this._options.parent;
		this._parent_context = this._options.parent_context
		this._event_str = this._options.event;
		this._event = cjs.create_event("red_event", this._event_str, this._parent, this._parent_context);
	} else {
		this._event = this._options.event;
	}
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		if(_.has(this, "_transition")) {
			this._statechart.add_transition(this._transition);
		} else {
			this._statechart.add_transition(this._from_state_name, this._to_state_name, this._event);
			this._transition = this._statechart._last_transition;
		}
	};

	proto._unexecute = function() {
		this._statechart.remove_transition(this._transition, false);
	};

	proto._do_destroy = function(in_effect) {
		if(!in_effect) {
			this._transition.destroy();
		}
	};
}(AddTransitionCommand));

red._commands["add_transition"] = function(options) {
	return new AddTransitionCommand(options);
};


var RemoveTransitionCommand = function(options) {
	RemoveTransitionCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;

	this._transition = this._options.transition || this._statechart.get_transition_by_id(this._options.id);
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._statechart.remove_transition(this._transition, false);
	};

	proto._unexecute = function() {
		this._statechart.add_transition(this._transition);
	};

	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			this._transition.destroy();
		}
	};
}(RemoveTransitionCommand));

red._commands["remove_transition"] = function(options) {
	return new RemoveTransitionCommand(options);
};
var SetTransitionEventCommand = function(options) {
	SetTransitionEventCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._event_str = this._options.event;

	this._transition = this._options.transition || this._options.statechart.get_transition_by_id(this.options.id);
	this._event = this._transition.get_event();
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._from_str = this._event.get_str();
		this._event.set_str(this._event_str);
	};

	proto._unexecute = function() {
		this._event.set_str(this._from_str);
	};

	proto._do_destroy = function(in_effect) { };
}(SetTransitionEventCommand));

red._commands["set_transition_event"] = function(options) {
	return new SetTransitionEventCommand(options);
};

}(red));
