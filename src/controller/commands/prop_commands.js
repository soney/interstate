/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;
    
    // === SET ===
    
    ist.SetPropCommand = function (options) {
        ist.SetPropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent || !this._options.value) {
            throw new Error("Must select a parent object");
        }
    
    
        this._parent = this._options.parent;
        if (!this._options.name && this._parent instanceof ist.Dict) {
            var parent = this._parent;
            var prop_names = parent._get_direct_prop_names();
            var prefix = "prop";
            if (this._options.value instanceof ist.Dict) {
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
        _.proto_extend(My, ist.Command);
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
                if (this._old_prop_value && this._old_prop_value.destroy) {
                    this._old_prop_value.destroy(true);
                }
            } else {
                if (this._prop_value && this._prop_value.destroy) {
                    this._prop_value.destroy(true);
                }
            }
			delete this._parent;
			delete this._options;
			delete this._old_prop_value;
			delete this._prop_value;
			delete this._prop_name;
        };
        ist.register_serializable_type("set_prop_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    parent_uid: this._parent.id(),
                    name: this._prop_name,
                    value: ist.serialize.apply(ist, ([this._prop_value]).concat(arg_array)),
                    index: this._prop_index
                };
            },
            function (obj) {
                return new My({
                    parent: ist.find_uid(obj.parent_uid),
                    name: obj.name,
                    value: ist.deserialize(obj.value),
                    index: obj.index
                });
            });
        proto.to_undo_string = function () {
            return "remove '" + this._prop_name + "'";
        };
        proto.to_redo_string = function () {
            return "add '" + this._prop_name + "'";
        };
    }(ist.SetPropCommand));
    
    ist.InheritPropCommand = function (options) {
        ist.InheritPropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.cobj || !this._options.name) {
            throw new Error("Must select a parent object");
        }
    
    
        this._cobj = this._options.cobj;
		this._prop_name = this._options.name;
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
			var ptr = this._cobj.get_pointer(),
				parent_ptr = ptr.pop(),
				parent_cobj = ist.find_or_put_contextual_obj(parent_ptr.pointsAt(), parent_ptr),
				parent_obj = parent_cobj.get_object();
			
			if(!this._prop_value && parent_cobj instanceof ist.ContextualStatefulObj) {
				var vobj = this._cobj.get_object();

				if(vobj instanceof ist.Cell) {
					var own_statechart = parent_cobj.get_own_statechart();
					var start_state = own_statechart.get_start_state();

					this._prop_value = new ist.StatefulProp();
					this._prop_value.set(start_state, vobj.clone());
				} else if(vobj instanceof ist.StatefulProp) {
					this._prop_value = vobj.clone(this._cobj);
				} else if(vobj instanceof ist.Dict) {
					this._prop_value = vobj.clone();
				} else {
					this._prop_value = vobj;
				}
			}
           parent_obj.set_prop(this._prop_name, this._prop_value);
        };
        proto._unexecute = function () {
			var parent_obj = this._parent.get_object();
			parent_obj.unset_prop(this._prop_name);
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
                if (this._old_prop_value) {
                    this._old_prop_value.destroy(true);
                }
            } else {
                if (this._prop_value && this._prop_value.destroy) {
                    this._prop_value.destroy(true);
                }
                if (this._value && this._value.destroy) {
                    this._value.destroy(true);
                }
            }
			delete this._parent;
			delete this._prop_name;
			delete this._value;
			delete this._options;
        };
        ist.register_serializable_type("inherit_prop_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
					cobj_uid: this._cobj.id(),
                    name: this._prop_name
                    //parent_uid: this._parent.id(),
                    //value_uid: this._value.id(),
                };
            },
            function (obj) {
                return new My({
                    cobj: ist.find_uid(obj.cobj_uid),
                    name: obj.name
                    //parent: ist.find_uid(obj.parent_uid),
                    //value: ist.find_uid(obj.value_uid),
                });
            });
    }(ist.InheritPropCommand));
    
    // === REMOVE ===
    
    ist.UnsetPropCommand = function (options) {
        ist.UnsetPropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._prop_name = this._options.name;
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
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
                this._parent.set_prop(this._prop_name, this._prop_value, {index: this._prop_index});
            }
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
                if (this._prop_value && this._prop_value.destroy) {
                    this._prop_value.destroy(true);
                }
            }
			delete this._options;
			delete this._parent;
			delete this._prop_name;
			delete this._prop_value;
			delete this._prop_index;
			delete this._old_prop_value;
        };
        ist.register_serializable_type("unset_prop_command",
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
                    parent: ist.find_uid(obj.parent_uid),
                    name: obj.name
                });
            });
    }(ist.UnsetPropCommand));
    
    
    // === RENAME ===
    
    ist.RenamePropCommand = function (options) {
        ist.RenamePropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
        if (!this._options.parent || !this._options.from || !this._options.to) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._from_name = this._options.from;
        this._to_name = this._options.to;
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
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
        ist.register_serializable_type("rename_prop_command",
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
                    parent: ist.find_uid(obj.parent_uid),
                    from: obj.from_name,
                    to: obj.to_name
                });
            });
    }(ist.RenamePropCommand));
    
    
    // === MOVE ===
    
    ist.MovePropCommand = function (options) {
        ist.MovePropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._prop_name = this._options.name;
        this._to_index = this._options.to;
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
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
        ist.register_serializable_type("move_prop_command",
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
                    parent: ist.find_uid(obj.parent_uid),
                    name: obj.name,
                    to: obj.to
                });
            });
    }(ist.MovePropCommand));
    
    // === STATEFUL PROPS ===
    
    ist.SetStatefulPropValueCommand = function (options) {
        ist.SetStatefulPropValueCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.stateful_prop || !this._options.state || !this._options.value) {
            throw new Error("Must select a stateful_prop object");
        }
    
        this._stateful_prop = this._options.stateful_prop;
        this._state = this._options.state;
		this._value = this._options.value;
		if(this._state instanceof ist.ContextualObject) debugger;
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
			this._old_value = this._stateful_prop._direct_value_for_state(this._state);
            this._stateful_prop.set(this._state, this._value);
        };
        proto._unexecute = function () {
			if(this._old_value) {
				this._stateful_prop.set(this._state, this._old_value);
			} else {
				this._stateful_prop.unset(this._state);
			}
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
                if (this._old_value && this._old_value.destroy) {
                    this._old_value.destroy(true);
                }
            } else {
                if (this._value && this._value.destroy) {
                    this._value.destroy(true);
                }
			}
			delete this._options;
			delete this._stateful_prop;
			delete this._state;
			delete this._value;
			delete this._old_value;
        };
        ist.register_serializable_type("set_stateful_prop_value_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    stateful_prop_uid: this._stateful_prop.id(),
                    state_uid: this._state.id(),
                    value: ist.serialize.apply(ist, ([this._value]).concat(arg_array))
                };
            },
            function (obj) {
                return new My({
                    stateful_prop: ist.find_uid(obj.stateful_prop_uid),
                    state: ist.find_uid(obj.state_uid),
                    value: ist.deserialize(obj.value)
                });
            });
    }(ist.SetStatefulPropValueCommand));
    
    
    ist.UnsetStatefulPropValueCommand = function (options) {
        ist.UnsetStatefulPropValueCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.stateful_prop) {
            throw new Error("Must select a stateful_prop object");
        }
    
        this._stateful_prop = this._options.stateful_prop;
        this._state = this._options.state;
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
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
                    this._value.destroy(true);
                }
            }
			delete this._options;
			delete this._stateful_prop;
			delete this._state;
			delete this._value;
        };
        ist.register_serializable_type("unset_stateful_prop_value_command",
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
                    stateful_prop: ist.find_uid(obj.parent_uid),
                    state: ist.find_uid(obj.state_uid)
                });
            });
    }(ist.UnsetStatefulPropValueCommand));
    
    
    ist.SetBuiltinCommand = function (options) {
        ist.SetBuiltinCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._builtin_name = this._options.name;
        this._value = this._options.value;
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
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
                    this._old_value.destroy(true);
                }
            } else {
                if (this._value && this._value.destroy) {
                    this._value.destroy(true);
                }
            }
			delete this._options;
			delete this._parent;
			delete this._builtin_name;
			delete this._value;
        };
    
        ist.register_serializable_type("set_builtin_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    parent_uid: this._parent.id(),
                    name: this._builtin_name,
                    value: ist.serialize.apply(ist, ([this._value]).concat(arg_array))
                };
            },
            function (obj) {
                return new My({
                    parent: ist.find_uid(obj.parent_uid),
                    name: obj.name,
                    value: ist.deserialize(obj.value)
                });
            });
    }(ist.SetBuiltinCommand));

    ist.SetCopiesCommand = function (options) {
        ist.SetCopiesCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
        this._value = this._options.value;
		if(_.isString(this._value)) {
			this._value = new ist.Cell({str: this._value});
		}
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
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
    
        ist.register_serializable_type("set_copies",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    parent_uid: this._parent.id(),
                    value: ist.serialize.apply(ist, ([this._value]).concat(arg_array))
                };
            },
            function (obj) {
                return new My({
                    parent: ist.find_uid(obj.parent_uid),
                    value: ist.deserialize(obj.value)
                });
            });
    }(ist.SetCopiesCommand));

    ist.ResetCommand = function (options) {
        ist.ResetCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.parent) {
            throw new Error("Must select a parent object");
        }
    
        this._parent = this._options.parent;
		this._undoable = false;
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
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
    
        ist.register_serializable_type("reset",
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
                    parent: ist.find_uid(obj.parent_uid)
                });
            });
    }(ist.ResetCommand));

    ist.MovePropAboveBelowCommand = function (options) {
        ist.MovePropCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};

		this._from_obj = this._options.from_obj;
		this._from_name = this._options.from_name;
		this._target_obj = this._options.target_obj;
		this._target_name = this._options.target_name;
		this._above_below = this._options.above_below;
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
			if(!_.isNumber(this._to_index)) {
				if(this._target_name) {
					this._to_index =  this._target_obj.prop_index(this._target_name);
					if(this._above_below === "below") {
						this._to_index++;
					}
				} else {
					this._to_index = 0;
				}

				this._from_index = this._from_obj.prop_index(this._from_name);
				if(this._from_obj === this._target_obj) {
					if(this._from_index < this._to_index) {
						this._to_index--;
					}
				}
			}

			if(this._from_obj === this._target_obj) {
				this._from_obj.move_prop(this._from_name, this._to_index);
			} else {
				var val = this._from_obj._get_direct_prop(this._from_name);
				this._from_obj.unset_prop(this._from_name);
				this._target_obj.set_prop(this._from_name, val, this._to_index);
			}
        };
        proto._unexecute = function () {
			if(this._from_obj === this._target_obj) {
				this._from_obj.move_prop(this._from_name, this._from_index);
			} else {
				var val = this._target_obj._get_direct_prop(this._from_name);
				this._target_obj.unset_prop(this._from_name);
				this._from_obj.set_prop(this._from_name, val, this._to_index);
			}
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
        ist.register_serializable_type("move_prop_above_below_command",
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
					from_obj: ist.find_uid(obj.from_obj),
					target_obj: ist.find_uid(obj.target_obj),
					from_name: obj.from_name,
					target_name: obj.target_name,
					above_below: obj.above_below
                });
            });
    }(ist.MovePropAboveBelowCommand));
}(interstate));
