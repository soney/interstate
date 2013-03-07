(function(red) {
var cjs = red.cjs, _ = red._;

red.AddStateCommand = function(options) {
	red.AddStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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
	red.register_serializable_type("add_state_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											statechart: this._statechart.id(),
											name: this._state_name,
											index: this._index
										};
									},
									function(obj) {
										return new my({
											statechart: red.find_uid(obj.statechart),
											name: obj.name,
											index: obj.index
										});
									});
}(red.AddStateCommand));

red.RemoveStateCommand = function(options) {
	red.RemoveStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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
	red.register_serializable_type("remove_state_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											statechart: this._statechart.id(),
											name: this._state_name
										};
									},
									function(obj) {
										return new my({
											statechart: red.find_uid(obj.statechart),
											name: obj.name
										});
									});
}(red.RemoveStateCommand));

red.MoveStateCommand = function(options) {
	red.MoveStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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

	red.register_serializable_type("move_state_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											statechart: this._statechart.id(),
											name: this._state_name,
											index: this._to_index
										};
									},
									function(obj) {
										return new my({
											statechart: red.find_uid(obj.statechart),
											name: obj.name,
											index: obj.index
										});
									});
}(red.MoveStateCommand));

red.RenameStateCommand = function(options) {
	red.RenameStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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

	red.register_serializable_type("rename_state_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											statechart: this._statechart.id(),
											from: this._from_state_name,
											to: this._to_state_name
										};
									},
									function(obj) {
										return new my({
											statechart: red.find_uid(obj.statechart),
											from: obj.from,
											to: obj.to
										});
									});
}(red.RenameStateCommand));

red.MakeConcurrentCommand = function(options) {
	red.MakeConcurrentCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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
	red.register_serializable_type("make_concurrent_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											statechart: this._statechart.id(),
											concurrent: this._concurrent
										};
									},
									function(obj) {
										return new my({
											statechart: red.find_uid(obj.statechart),
											concurrent: obj.concurrent
										});
									});
}(red.MakeConcurrentCommand));


red.AddTransitionCommand = function(options) {
	red.AddTransitionCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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
	red.register_serializable_type("add_transition_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var arg_array = _.toArray(arguments);
										return {
											statechart: this._statechart.id(),
											from_state_name: this._from_state_name,
											to_state_name: this._to_state_name,
											event: red.serialize.apply(red, ([this._event]).concat(arg_array))
										};
									},
									function(obj) {
										return new my({
											statechart: red.find_uid(obj.statechart),
											from: obj.from_state_name,
											to: obj.to-state_name,
											event: red.deserialize(obj.event)
										});
									});
}(red.AddTransitionCommand));


red.RemoveTransitionCommand = function(options) {
	red.RemoveTransitionCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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
	red.register_serializable_type("remove_transition_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var arg_array = _.toArray(arguments);
										return {
											statechart: this._statechart.id(),
											transition: this._transition.id()
										};
									},
									function(obj) {
										return new my({
											statechart: red.find_uid(obj.statechart),
											transition: red.find_uid(obj.transition)
										});
									});
}(red.RemoveTransitionCommand));

red.SetTransitionEventCommand = function(options) {
	red.SetTransitionEventCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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
	red.register_serializable_type("set_transition_event_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var arg_array = _.toArray(arguments);
										return {
											transition_id: this._transition.id(),
											event_str: this._event_str
										};
									},
									function(obj) {
										return new my({
											transition: red.find_uid(obj.transition_id),
											event: obj.event_str
										});
									});
}(red.SetTransitionEventCommand));


red.SetTransitionFromCommand = function(options) {
	SetTransitionFromCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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
	red.register_serializable_type("set_transition_from_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var arg_array = _.toArray(arguments);
										return {
											transition_id: this._transition.id(),
											state_id: this._statechart.id()
										};
									},
									function(obj) {
										return new my({
											transition: red.find_uid(obj.transition_id),
											statechart: red.find_uid(obj.state_id)
										});
									});
}(red.SetTransitionFromCommand));


red.SetTransitionToCommand = function(options) {
	red.SetTransitionToCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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
	red.register_serializable_type("set_transition_to_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var arg_array = _.toArray(arguments);
										return {
											transition_id: this._transition.id(),
											state_id: this._statechart.id()
										};
									},
									function(obj) {
										return new my({
											transition: red.find_uid(obj.transition_id),
											statechart: red.find_uid(obj.state_id)
										});
									});
}(red.SetTransitionToCommand));

var null_fn = function(){};

red.StatechartOnCommand = function(options) {
	red.StatechartOnCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._context = this._options.context;
	this._pcontext = this._options.pcontext;
	if(this._options.listener instanceof red.ParsedFunction) {
		var func = this._options.listener;
		var pcontext = this._pcontext;
		this._listener = function() {
			func._apply(pcontext, arguments);
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
	red.register_serializable_type("set_transition_on_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var arg_array = _.toArray(arguments);
										return {
											statechart_id: this._statechart.id(),
											context: red.serialize.apply(red, ([this._context]).concat(arg_array)),
											pcontext: red.serialize.apply(red, ([this._pcontext]).concat(arg_array)),
											listener: red.serialize.apply(red, ([this._listener]).concat(arg_array)),
											spec: this._spec
										};
									},
									function(obj) {
										return new my({
											statechart: red.find_uid(obj.statechart_id),
											context: red.deserialize(obj.context),
											pcontext: red.deserialize(obj.pcontext),
											listener: red.deserialize(obj.listener),
											spec: obj._spec
										});
									});
}(red.StatechartOnCommand));

red.StatechartOff = function(options) {
	red.StatechartOff.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!this._options.statechart) {
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
	red.register_serializable_type("set_transition_off_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var arg_array = _.toArray(arguments);
										return {
											statechart_id: this._statechart.id(),
											context: red.serialize.apply(red, ([this._context]).concat(arg_array)),
											pcontext: red.serialize.apply(red, ([this._pcontext]).concat(arg_array)),
											listener: red.serialize.apply(red, ([this._listener]).concat(arg_array)),
											spec: this._spec
										};
									},
									function(obj) {
										return new my({
											statechart: red.find_uid(obj.statechart_id),
											context: red.deserialize(obj.context),
											pcontext: red.deserialize(obj.pcontext),
											listener: red.deserialize(obj.listener),
											spec: obj._spec
										});
									});
}(red.StatechartOff));

}(red));
