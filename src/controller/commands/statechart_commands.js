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
			this._state = this._statechart.find_state(this._state_name);
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
		this._from_index = this._statechart.get_substate_index(this._state_name);
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

var MakeConcurrentCommand = function(options) {
	MakeConcurrentCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._concurrent = !!this._options.concurrent;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._statechart.make_concurrent(this._concurrent);
	};

	proto._unexecute = function() {
		this._statechart.make_concurrent(!this._concurrent);
	};

	proto._do_destroy = function(in_effect) { };
}(MakeConcurrentCommand));

red._commands["make_concurrent"] = function(options) {
	return new MakeConcurrentCommand(options);
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
	this._event = this._options.event;
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
		//this._statechart.remove_transition(this._transition, false);
		this._transition.remove(false);
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
	//	this._statechart.remove_transition(this._transition, false);
		this._transition.remove(false);
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
	this._event = this._transition.event();
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

var SetTransitionFromCommand = function(options) {
	SetTransitionFromCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._transition = this._options.transition;
	this._statechart = this._options.statechart;
	this._old_statechart = this._transition.from();
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._transition.setFrom(this._statechart);
	};

	proto._unexecute = function() {
		this._transition.setFrom(this._old_statechart);
	};

	proto._do_destroy = function(in_effect) { };
}(SetTransitionFromCommand));

red._commands["set_transition_from"] = function(options) {
	return new SetTransitionFromCommand(options);
};

var SetTransitionToCommand = function(options) {
	SetTransitionToCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._transition = this._options.transition;
	this._statechart = this._options.statechart;
	this._old_statechart = this._transition.to();
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._transition.setTo(this._statechart);
	};

	proto._unexecute = function() {
		this._transition.setTo(this._old_statechart);
	};

	proto._do_destroy = function(in_effect) { };
}(SetTransitionToCommand));

red._commands["set_transition_to"] = function(options) {
	return new SetTransitionToCommand(options);
};

var null_fn = function(){};

var StatechartOnCommand = function(options) {
	StatechartOnCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._context = this._options.context;
	this._pcontext = this._options.pcontext;
	if(this._options.listener instanceof red.ParsedFunction) {
		var func = this._options.listener;
		this._listener = function() {
			func._apply(this._pcontext, arguments);
		};
	} else {
		this._listener = this._options.listener;
	}
	this._spec = this._options.spec;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._statechart.on_transition(this._spec, this._listener, null_fn, this._context);
	};

	proto._unexecute = function() {
		this._statechart.off_transition(this._spec, this._listener, null_fn, this._context);
	};

	proto._do_destroy = function(in_effect) { };
}(StatechartOnCommand));

red._commands["statechart_on"] = function(options) {
	return new StatechartOnCommand(options);
};

var StatechartOff = function(options) {
	StatechartOff.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._context = this._options.context;
	this._listener = this._options.listener;
	this._spec = this._options.spec;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._statechart.off_transition(this._spec, this._listener, null_fn, this._context);
	};

	proto._unexecute = function() {
		this._statechart.on_transition(this._spec, this._listener, null_fn, this._context);
	};

	proto._do_destroy = function(in_effect) { };
}(StatechartOff));

red._commands["statechart_off"] = function(options) {
	return new StatechartOffCommand(options);
};

}(red));
