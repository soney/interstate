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
            if (in_effect) {
                if (this._old_prop_value) {
                    this._old_prop_value.destroy();
                }
            } else {
                if (this._prop_value) {
                    this._prop_value.destroy();
                }
            }
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
            if (in_effect) {
                if (this._old_prop_value) {
                    this._old_prop_value.destroy();
                }
            } else {
                if (this._prop_value) {
                    this._prop_value.destroy();
                }
            }
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
        proto._do_destroy = function (in_effect) { };
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
        proto._do_destroy = function (in_effect) { };
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
            if (!in_effect) {
                if (this._value && this._value.destroy) {
                    this._value.destroy();
                }
            }
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
            if (in_effect) {
                if (this._value && this._value.destroy) {
                    this._value.destroy();
                }
            }
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
            if (in_effect) {
                if (this._old_value && this._old_value.destroy) {
                    this._old_value.destroy();
                }
            } else {
                if (this._value && this._value.destroy) {
                    this._value.destroy();
                }
            }
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

}(red));
