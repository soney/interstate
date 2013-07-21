/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;
    
    // === SET ===
    
    red.SetPropCommand = function (options) {
        red.SetPropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent || !this._options.value) {
            throw new Error("Must select a parent object");
        }
    
    
        this._parent = this._options.parent;
        if (!this._options.name && this._parent instanceof red.Dict) {
            var parent = this._parent;
            var prop_names = parent._get_direct_prop_names();
            var prefix = "prop";
            if (this._options.value instanceof red.Dict) {
                prefix = "obj";
            }
            var original_new_prop_name = prefix + "_" +  prop_names.length;
            var new_prop_name = original_new_prop_name;
            var i = 0;
            while (_.indexOf(prop_names, new_prop_name) >= 0) {
                new_prop_name = original_new_prop_name + "_" + i;
                i += 1;
            }
            this._prop_name = new_prop_name;
        } else {
            this._prop_name = this._options.name;
        }
        this._prop_value = this._options.value;
        this._prop_index = this._options.index;
    };
    
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            var index;
            if (_.isNumber(this._prop_index)) {
                index = this._prop_index;
            }
            this._old_prop_value = this._parent._get_direct_prop(this._prop_name);
            this._parent.set_prop(this._prop_name, this._prop_value, {index: index});
        };
        proto._unexecute = function () {
            if (!_.isUndefined(this._old_prop_value)) {
                this._parent.set_prop(this._prop_name, this._old_prop_value);
            } else {
                this._parent.unset_prop(this._prop_name);
            }
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
                if (this._old_prop_value) {
                    this._old_prop_value.destroy();
                }
            } else {
                if (this._prop_value) {
                    this._prop_value.destroy();
                }
            }
			delete this._parent;
			delete this._options;
			delete this._old_prop_value;
			delete this._prop_value;
			delete this._prop_name;
        };
        red.register_serializable_type("set_prop_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    parent_uid: this._parent.id(),
                    name: this._prop_name,
                    value: red.serialize.apply(red, ([this._prop_value]).concat(arg_array)),
                    index: this._prop_index
                };
            },
            function (obj) {
                return new My({
                    parent: red.find_uid(obj.parent_uid),
                    name: obj.name,
                    value: red.deserialize(obj.value),
                    index: obj.index
                });
            });
    }(red.SetPropCommand));
    
    red.InheritPropCommand = function (options) {
        red.InheritPropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent || !this._options.name) {
            throw new Error("Must select a parent object");
        }
    
    
        this._parent = this._options.parent;
		this._prop_name = this._options.name;
        this._prop_value = this._options.value;
		var value = this._options.value;
		if(this._parent instanceof red.StatefulObj) {
			var own_statechart = this._parent.get_own_statechart();
			var start_state = own_statechart.get_start_state();
			if(value instanceof red.Cell) {
				this._prop_value = new red.StatefulProp();
				this._prop_value.set(start_state, new red.Cell({str: value.get_str()}));
			}
		}
    };
    
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._parent.set_prop(this._prop_name, this._prop_value);
        };
        proto._unexecute = function () {
			this._parent.unset_prop(this._prop_name);
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
                if (this._old_prop_value) {
                    this._old_prop_value.destroy();
                }
            } else {
                if (this._prop_value) {
                    this._prop_value.destroy();
                }
            }
			delete this._parent;
			delete this._prop_name;
			delete this._value;
			delete this._options;
        };
        red.register_serializable_type("inherit_prop_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    parent_uid: this._parent.id(),
                    value_uid: this._prop_value.id(),
                    name: this._prop_name
                };
            },
            function (obj) {
                return new My({
                    parent: red.find_uid(obj.parent_uid),
                    value: red.find_uid(obj.value_uid),
                    name: obj.name
                });
            });
    }(red.InheritPropCommand));
    
    // === REMOVE ===
    
    red.UnsetPropCommand = function (options) {
        red.UnsetPropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._prop_name = this._options.name;
    };
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._prop_index = this._parent.prop_index(this._prop_name);
            
            this._has_direct_prop = this._parent._has_direct_prop(this._prop_name);
            if (this._has_direct_prop) {
                this._prop_value = this._parent._get_direct_prop(this._prop_name);
            }
    
            this._parent.unset_prop(this._prop_name);
        };
        proto._unexecute = function () {
            if (this._has_direct_prop) {
                this._parent.set_prop(this._prop_name, this._prop_value, this._prop_index);
            }
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
                if (this._old_prop_value) {
                    this._old_prop_value.destroy();
                }
            } else {
                if (this._prop_value) {
                    this._prop_value.destroy();
                }
            }
			delete this._options;
			delete this._parent;
			delete this._prop_name;
			delete this._prop_value;
			delete this._prop_index;
			delete this._old_prop_value;
        };
        red.register_serializable_type("unset_prop_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
                    parent_uid: this._parent.id(),
                    name: this._prop_name
                };
            },
            function (obj) {
                return new My({
                    parent: red.find_uid(obj.parent_uid),
                    name: obj.name
                });
            });
    }(red.UnsetPropCommand));
    
    
    // === RENAME ===
    
    red.RenamePropCommand = function (options) {
        red.RenamePropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent || !this._options.from || !this._options.to) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._from_name = this._options.from;
        this._to_name = this._options.to;
    };
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._parent.rename(this._from_name, this._to_name);
        };
        proto._unexecute = function () {
            this._parent.rename(this._to_name, this._from_name);
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
			delete this._options;
			delete this._parent;
			delete this._from_name;
			delete this._to_name;
		};
        red.register_serializable_type("rename_prop_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
                    parent_uid: this._parent.id(),
                    from_name: this._from_name,
                    to_name: this._to_name
                };
            },
            function (obj) {
                return new My({
                    parent: red.find_uid(obj.parent_uid),
                    from: obj.from_name,
                    to: obj.to_name
                });
            });
    }(red.RenamePropCommand));
    
    
    // === MOVE ===
    
    red.MovePropCommand = function (options) {
        red.MovePropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._prop_name = this._options.name;
        this._to_index = this._options.to;
    };
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._from_index = this._parent.prop_index(this._prop_name);
            this._parent.move_prop(this._prop_name, this._to_index);
        };
        proto._unexecute = function () {
            this._parent.move_prop(this._prop_name, this._from_index);
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
			delete this._parent;
			delete this._prop_name;
			delete this._to_index;
			delete this._options;
		};
        red.register_serializable_type("move_prop_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
                    parent_uid: this._parent.id(),
                    name: this._prop_name,
                    to: this._to_index
                };
            },
            function (obj) {
                return new My({
                    parent: red.find_uid(obj.parent_uid),
                    name: obj.name,
                    to: obj.to
                });
            });
    }(red.MovePropCommand));
    
    // === STATEFUL PROPS ===
    
    red.SetStatefulPropValueCommand = function (options) {
        red.SetStatefulPropValueCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.stateful_prop || !this._options.state || !this._options.value) {
            throw new Error("Must select a stateful_prop object");
        }
    
        this._stateful_prop = this._options.stateful_prop;
        this._state = this._options.state;
        this._value = this._options.value;
    };
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._stateful_prop.set(this._state, this._value);
        };
        proto._unexecute = function () {
            this._stateful_prop.unset(this._state);
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (!in_effect) {
                if (this._value && this._value.destroy) {
                    this._value.destroy();
                }
            }
			delete this._options;
			delete this._stateful_prop;
			delete this._state;
			delete this._value;
        };
        red.register_serializable_type("set_stateful_prop_value_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    stateful_prop_uid: this._stateful_prop.id(),
                    state_uid: this._state.id(),
                    value: red.serialize.apply(red, ([this._value]).concat(arg_array))
                };
            },
            function (obj) {
                return new My({
                    stateful_prop: red.find_uid(obj.stateful_prop_uid),
                    state: red.find_uid(obj.state_uid),
                    value: red.deserialize(obj.value)
                });
            });
    }(red.SetStatefulPropValueCommand));
    
    
    red.UnsetStatefulPropValueCommand = function (options) {
        red.UnsetStatefulPropValueCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.stateful_prop) {
            throw new Error("Must select a stateful_prop object");
        }
    
        this._stateful_prop = this._options.stateful_prop;
        this._state = this._options.state;
    };
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._value = this._stateful_prop._direct_value_for_state(this._state);
            this._stateful_prop.unset(this._state);
        };
        proto._unexecute = function () {
            this._stateful_prop.set(this._state, this._value);
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
                if (this._value && this._value.destroy) {
                    this._value.destroy();
                }
            }
			delete this._options;
			delete this._stateful_prop;
			delete this._state;
			delete this._value;
        };
        red.register_serializable_type("unset_stateful_prop_value_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
                    parent_uid: this._stateful_prop.id(),
                    state_uid: this._state.id()
                };
            },
            function (obj) {
                return new My({
                    stateful_prop: red.find_uid(obj.parent_uid),
                    state: red.find_uid(obj.state_uid)
                });
            });
    }(red.UnsetStatefulPropValueCommand));
    
    
    red.SetBuiltinCommand = function (options) {
        red.SetBuiltinCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._builtin_name = this._options.name;
        this._value = this._options.value;
    };
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            var i;
            var builtins = this._parent.get_builtins();
            for (i in builtins) {
                if (builtins.hasOwnProperty(i)) {
                    var builtin = builtins[i];
                    var env_name = builtin._get_env_name();
                    if (this._builtin_name === env_name) {
                        var getter_name = builtin._get_getter_name();
                        var setter_name = builtin._get_setter_name();
                        this._old_value = this._parent[getter_name]();
                        this._parent[setter_name](this._value);
                        break;
                    }
                }
            }
        };
        proto._unexecute = function () {
            var builtins = this._parent.get_builtins();
            var i;
            for (i in builtins) {
                if (builtins.hasOwnProperty(i)) {
                    var builtin = builtins[i];
                    var env_name = builtin._get_env_name();
                    if (this._builtin_name === env_name) {
                        var setter_name = builtin._get_setter_name();
                        this._parent[setter_name](this._old_value);
                        break;
                    }
                }
            }
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
                if (this._old_value && this._old_value.destroy) {
                    this._old_value.destroy();
                }
            } else {
                if (this._value && this._value.destroy) {
                    this._value.destroy();
                }
            }
			delete this._options;
			delete this._parent;
			delete this._builtin_name;
			delete this._value;
        };
    
        red.register_serializable_type("set_builtin_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    parent_uid: this._parent.id(),
                    name: this._builtin_name,
                    value: red.serialize.apply(red, ([this._value]).concat(arg_array))
                };
            },
            function (obj) {
                return new My({
                    parent: red.find_uid(obj.parent_uid),
                    name: obj.name,
                    value: red.deserialize(obj.value)
                });
            });
    }(red.SetBuiltinCommand));

    red.SetCopiesCommand = function (options) {
        red.SetCopiesCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._value = this._options.value;
		if(_.isString(this._value)) {
			this._value = new red.Cell({str: this._value});
		}
    };
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
			this._parent.set_copies(this._value);
        };
        proto._unexecute = function () {
			console.log("unset copies", this._value);
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
            } else {
            }
			delete this._parent;
			delete this._value;
        };
    
        red.register_serializable_type("set_copies",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    parent_uid: this._parent.id(),
                    value: red.serialize.apply(red, ([this._value]).concat(arg_array))
                };
            },
            function (obj) {
                return new My({
                    parent: red.find_uid(obj.parent_uid),
                    value: red.deserialize(obj.value)
                });
            });
    }(red.SetCopiesCommand));

    red.ResetCommand = function (options) {
        red.ResetCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
    };
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
			this._parent.reset();
        };
        proto._unexecute = function () {
			console.log("reset");
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
            } else {
            }
			delete this._options;
			delete this._parent;
        };
    
        red.register_serializable_type("reset",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    parent_uid: this._parent.id()
                };
            },
            function (obj) {
                return new My({
                    parent: red.find_uid(obj.parent_uid)
                });
            });
    }(red.ResetCommand));

    red.MovePropAboveBelowCommand = function (options) {
        red.MovePropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};

		this._from_obj = this._options.from_obj;
		this._from_name = this._options.from_name;
		this._target_obj = this._options.target_obj;
		this._target_name = this._options.target_name;
		this._above_below = this._options.above_below;
    };
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
			var target_index;
			if(this._target_name) {
				target_index =  this._target_obj.prop_index(this._target_name);
				if(this._above_below === "below") {
					target_index++;
				}
			} else {
				target_index = 0;
			}

			if(this._from_obj === this._target_obj) {
				this._from_obj.move_prop(this._from_name, target_index);
			} else {
				var val = this._from_obj._get_direct_prop(this._from_name);
				this._from_obj.unset_prop(this._from_name);
				this._target_obj.set_prop(this._from_name, val, target_index);
			}
        };
        proto._unexecute = function () {
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
			delete this._options;
			delete this._from_obj;
			delete this._from_name;
			delete this._target_obj;
			delete this._target_name;
			delete this._above_below;
		};
        red.register_serializable_type("move_prop_above_below_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
					from_obj: this._from_obj.id(),
					target_obj: this._target_obj.id(),
					from_name: this._from_name,
					target_name: this._target_name,
					above_below: this._above_below
                };
            },
            function (obj) {
                return new My({
					from_obj: red.find_uid(obj.from_obj),
					target_obj: red.find_uid(obj.target_obj),
					from_name: obj.from_name,
					target_name: obj.target_name,
					above_below: obj.above_below
                });
            });
    }(red.MovePropAboveBelowCommand));
}(red));
