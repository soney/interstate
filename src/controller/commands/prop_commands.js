(function(red) {
var cjs = red.cjs, _ = red._;

// === SET ===

var SetPropCommand = function(options) {
	SetPropCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "parent")) {
		throw new Error("Must select a parent object");
	}

	this._parent = this._options.parent;
	this._prop_name = this._options.name;
	this._prop_value = this._options.value;
	this._prop_index = this._options.index;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		var index = undefined;
		if(_.isNumber(this._prop_index)) {
			index = this._prop_index;
		}
		this._old_prop_value = this._parent._get_direct_prop(this._prop_name);

		this._parent.set_prop(this._prop_name, this._prop_value, index);
		if(this._prop_value instanceof red.RedDict) {
			this._prop_value.set_default_context(this._parent.get_default_context().push(this._prop_value));
		}
	};
	proto._unexecute = function() {
		if(!_.isUndefined(this._old_prop_value)) {
			this._parent.set_prop(this._prop_name, this._old_prop_value);
		} else {
			this._parent.unset_prop(this._prop_name);
		}
	};
	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			if(this._old_prop_value) {
				this._old_prop_value.destroy();
			}
		} else {
			if(this._prop_value) {
				this._prop_value.destroy();
			}
		}
	};
}(SetPropCommand));

red._commands["set_prop"] = function(options) {
	return new SetPropCommand(options);
};

// === REMOVE ===

var UnsetPropCommand = function(options) {
	UnsetPropCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "parent")) {
		throw new Error("Must select a parent object");
	}

	this._parent = this._options.parent;
	this._prop_name = this._options.name;
};
(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._prop_index = this._parent.prop_index(this._prop_name);
		
		this._has_direct_prop = this._parent._has_direct_prop(this._prop_name);
		if(this._has_direct_prop) {
			this._prop_value = this._parent._get_direct_prop(this._prop_name);
		}

		this._parent.unset_prop(this._prop_name);
	};
	proto._unexecute = function() {
		if(this._has_direct_prop) {
			this._parent.set_prop(this._prop_name, this._prop_value, this._prop_index);
		}
	};
	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			if(this._old_prop_value) {
				this._old_prop_value.destroy();
			}
		} else {
			if(this._prop_value) {
				this._prop_value.destroy();
			}
		}
	};
}(UnsetPropCommand));

red._commands["unset_prop"] = function(options) {
	return new UnsetPropCommand(options);
};

// === RENAME ===

var RenamePropCommand = function(options) {
	RenamePropCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "parent")) {
		throw new Error("Must select a parent object");
	}

	this._parent = this._options.parent;
	this._from_name = this._options.from;
	this._to_name = this._options.to;
};
(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._prop_value = this._parent._get_direct_prop(this._to_name);
		if(this._prop_value) {
			this._parent.unset(this._to_name);
		}
		this._parent.rename(this._from_name, this._to_name);
	};
	proto._unexecute = function() {
		this._parent.rename(this._to_name, this._from_name);
		if(!_.isUndefined(this._prop_value)) {
			this._parent.set_prop(this._from_name, this._prop_value);
		}
	};
	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			if(this._prop_value) {
				this._prop_value.destroy();
			}
		}
	};
}(RenamePropCommand));

red._commands["rename_prop"] = function(options) {
	return new RenamePropCommand(options);
};

// === MOVE ===

var MovePropCommand = function(options) {
	MovePropCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "parent")) {
		throw new Error("Must select a parent object");
	}

	this._parent = this._options.parent;
	this._prop_name = this._options.name;
	this._to_index = this._options.to;
};
(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._from_index = this._parent.prop_index(this._prop_name);
		this._parent.move_prop(this._prop_name, this._to_index);
	};
	proto._unexecute = function() {
		this._parent.move_prop(this._prop_name, this._from_index);
	};
	proto._do_destroy = function(in_effect) { };
}(MovePropCommand));

red._commands["move_prop"] = function(options) {
	return new MovePropCommand(options);
};

// === SET PARENT ===

red._commands["set_prop_parent"] = function(options) {
	var unset_command = red.command("unset_prop", {
		parent: options.from_parent
		, name: options.prop_name
	});
	var set_command = red.command("set_prop", {
		parent: options.to_parent
		, name: options.prop_name
		, value: options.value
		, index: options.to_index
	});

	var combo_command = red.command("combined", {
		commands: [unset_command, set_command]
	});

	return combo_command;
};

// === STATEFUL PROPS ===

var SetStatefulPropValueCommand = function(options) {
	SetStatefulPropValueCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "stateful_prop")) {
		throw new Error("Must select a stateful_prop object");
	}

	this._stateful_prop = this._options.stateful_prop;
	this._state = this._options.state;
	this._value = this._options.value;
};
(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._stateful_prop.set(this._state, this._value);
	};
	proto._unexecute = function() {
		this._stateful_prop.unset(this._state);
	};
	proto._do_destroy = function(in_effect) {
		if(!in_effect) {
			if(this._value && this._value.destroy) {
				this._value.destroy();
			}
		}
	};
}(SetStatefulPropValueCommand));

red._commands["set_stateful_prop_value"] = function(options) {
	return new SetStatefulPropValueCommand(options);
};

var UnsetStatefulPropValueCommand = function(options) {
	UnsetStatefulPropValueCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "stateful_prop")) {
		throw new Error("Must select a stateful_prop object");
	}

	this._stateful_prop = this._options.stateful_prop;
	this._state = this._options.state;
};
(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._value = this._stateful_prop._direct_value_for_state(this._state);
		this._stateful_prop.unset(this._state);
	};
	proto._unexecute = function() {
		this._stateful_prop.set(this._state, this._value);
	};
	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			if(this._value && this._value.destroy) {
				this._value.destroy();
			}
		}
	};
}(UnsetStatefulPropValueCommand));

red._commands["unset_stateful_prop_value"] = function(options) {
	return new UnsetStatefulPropValueCommand(options);
};


var SetBuiltinCommand = function(options) {
	SetBuiltinCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "parent")) {
		throw new Error("Must select a parent object");
	}

	this._parent = this._options.parent;
	this._builtin_name = this._options.name;
	this._value = this._options.value;
};
(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		var builtins = this._parent.get_builtins();
		for(var i in builtins) {
			var builtin = builtins[i];
			var env_name = builtin._get_env_name();
			if(this._builtin_name === env_name) {
				var getter_name = builtin._get_getter_name();
				var setter_name = builtin._get_setter_name();
				this._old_value = this._parent[getter_name]();
				this._parent[setter_name](this._value);
				break;
			}
		}
	};
	proto._unexecute = function() {
		var builtins = this._parent.get_builtins();
		for(var i in builtins) {
			var builtin = builtins[i];
			var env_name = builtin._get_env_name();
			if(this._builtin_name === env_name) {
				var getter_name = builtin._get_getter_name();
				this._parent[setter_name](this._old_value);
				break;
			}
		}
	};
	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			if(this._old_value && this._old_value.destroy) {
				this._old_value.destroy();
			}
		} else {
			if(this._value && this._value.destroy) {
				this._value.destroy();
			}
		}
	};
}(SetBuiltinCommand));

red._commands["set_builtin"] = function(options) {
	return new SetBuiltinCommand(options);
};

}(red));
