/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,RedSet */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;
    
    ist.AddStateCommand = function (options) {
        ist.AddStateCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._statechart = this._options.statechart;
        this._state_name = this._options.name;
        if (this._options.state) {
            this._state = this._options.state;
        }
        this._index = this._options.index;
		this._make_start = this._options.make_start;
    
        if (this._statechart.basis && this._statechart.basis()) {
            this._statechart = this._statechart.basis();
        }
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            if (_.has(this, "_state")) {
                this._statechart.add_state(this._state_name, this._state, this._index);
            } else {
                this._statechart.add_state(this._state_name, "statechart", this._index);
                this._state = this._statechart.find_state(this._state_name);
            }

			if(this._make_start) {
				this._statechart.starts_at(this._state);
			}
        };
    
        proto._unexecute = function () {
            this._statechart.remove_state(this._state_name, false); //don't destroy
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (!in_effect) {
                this._state.destroy();
            }
			delete this._options;
			delete this._statechart;
			delete this._state_name;
			delete this._state;
			delete this._index;
			delete this._make_start;
        };
        ist.register_serializable_type("add_state_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var args = _.toArray(arguments);
                return {
                    statechart: this._statechart.id(),
                    name: this._state_name,
                    index: this._index,
                    state: ist.serialize.apply(ist, ([this._state]).concat(args)),
					make_start: this._make_start
                };
            },
            function (obj) {
                return new My({
                    statechart: ist.find_uid(obj.statechart),
                    name: obj.name,
                    index: obj.index,
                    state: ist.deserialize(obj.state),
					make_start: obj.make_start
                });
            });
    }(ist.AddStateCommand));
    
    ist.RemoveStateCommand = function (options) {
        ist.RemoveStateCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._statechart = this._options.statechart;
        this._state_name = this._options.name;
        if (this._statechart.basis && this._statechart.basis()) {
            this._statechart = this._statechart.basis();
        }
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._index = this._statechart.get_state_index(this._state_name);
            this._state = this._statechart.find_state(this._state_name);
            var transitions = new RedSet({
                hash: "hash"
            });
            var incoming_transitions = this._state.get_incoming_transitions(),
                outgoing_transitions = this._state.get_outgoing_transitions();
            transitions.add.apply(transitions, incoming_transitions);
            transitions.add.apply(transitions, outgoing_transitions);
            this._transitions = transitions.toArray();
            this._statechart.remove_state(this._state_name, false); //don't destroy
        };
    
        proto._unexecute = function () {
            this._statechart.add_state(this._state_name, this._state, this._index);
            var self = this;
            _.forEach(this._transitions, function (transition) {
                self._statechart.add_transition(transition);
            });
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
				if(this._statechart && this._statechart.destroy) {
					this._statechart.destroy();
				}
                _.forEach(this._transitions, function (transition) {
                    transition.destroy();
                });
            }
			delete this._options;
			delete this._statechart;
			delete this._state_name;
        };
        ist.register_serializable_type("remove_state_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
                    statechart: this._statechart.id(),
                    name: this._state_name
                };
            },
            function (obj) {
                return new My({
                    statechart: ist.find_uid(obj.statechart),
                    name: obj.name
                });
            });
    }(ist.RemoveStateCommand));
    
    ist.MoveStateCommand = function (options) {
        ist.MoveStateCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._statechart = this._options.statechart;
        this._state_name = this._options.name;
        this._to_index = this._options.index;
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._from_index = this._statechart.get_substate_index(this._state_name);
            this._statechart.move_state(this._state_name, this._to_index);
        };
    
        proto._unexecute = function () {
            this._statechart.move_state(this._state_name, this._from_index);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
		};
    
        ist.register_serializable_type("move_state_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
                    statechart: this._statechart.id(),
                    name: this._state_name,
                    index: this._to_index
                };
            },
            function (obj) {
                return new My({
                    statechart: ist.find_uid(obj.statechart),
                    name: obj.name,
                    index: obj.index
                });
            });
    }(ist.MoveStateCommand));
    
    ist.RenameStateCommand = function (options) {
        ist.RenameStateCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._statechart = this._options.statechart;
        this._from_state_name = this._options.from;
        this._to_state_name = this._options.to;
    
        if (this._statechart.basis && this._statechart.basis()) {
            this._statechart = this._statechart.basis();
        }
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._statechart.rename_state(this._from_state_name, this._to_state_name);
        };
    
        proto._unexecute = function () {
            this._statechart.rename_state(this._to_state_name, this._from_state_name);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
		};
    
        ist.register_serializable_type("rename_state_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
                    statechart: this._statechart.id(),
                    from: this._from_state_name,
                    to: this._to_state_name
                };
            },
            function (obj) {
                return new My({
                    statechart: ist.find_uid(obj.statechart),
                    from: obj.from,
                    to: obj.to
                });
            });
    }(ist.RenameStateCommand));
    
    ist.MakeConcurrentCommand = function (options) {
        ist.MakeConcurrentCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._statechart = this._options.statechart;
        this._concurrent = !!this._options.concurrent;
        if (this._statechart.basis && this._statechart.basis()) {
            this._statechart = this._statechart.basis();
        }
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._statechart.make_concurrent(this._concurrent);
        };
    
        proto._unexecute = function () {
            this._statechart.make_concurrent(!this._concurrent);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
		};
        ist.register_serializable_type("make_concurrent_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
                    statechart: this._statechart.id(),
                    concurrent: this._concurrent
                };
            },
            function (obj) {
                return new My({
                    statechart: ist.find_uid(obj.statechart),
                    concurrent: obj.concurrent
                });
            });
    }(ist.MakeConcurrentCommand));
    
    
    ist.AddTransitionCommand = function (options) {
        ist.AddTransitionCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.from || !this._options.to || !this._options.statechart) {
            throw new Error("Must specify statechart, from, and to");
        }
    
        if (this._options.transition) {
            this._transition = this._options.transition;
        }
        this._statechart = this._options.statechart;
        this._from_state = this._options.from;
        this._to_state = this._options.to;
        this._event = this._options.event;
    
        if (this._statechart.basis && this._statechart.basis()) {
            this._statechart = this._statechart.basis();
        }
        if (this._from_state.basis && this._from_state.basis()) {
            this._from_state = this._from_state.basis();
        }
        if (this._to_state.basis && this._to_state.basis()) {
            this._to_state = this._to_state.basis();
        }
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            if (_.has(this, "_transition")) {
                this._statechart.add_transition(this._transition);
            } else {
                this._statechart.add_transition(this._from_state, this._to_state, this._event);
                this._transition = this._statechart._last_transition;
            }
        };
    
        proto._unexecute = function () {
            //this._statechart.remove_transition(this._transition, false);
            this._transition.remove(false);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (!in_effect) {
                this._transition.destroy();
            }
        };
        ist.register_serializable_type("add_transition_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    statechart_id: this._statechart.id(),
                    from_id: this._from_state.id(),
                    to_id: this._to_state.id(),
                    event: ist.serialize.apply(ist, ([this._event]).concat(arg_array)),
                    transition: ist.serialize.apply(ist, ([this._transition]).concat(arg_array))
                };
            },
            function (obj) {
                return new My({
                    statechart: ist.find_uid(obj.statechart_id),
                    from: ist.find_uid(obj.from_id),
                    to: ist.find_uid(obj.to_id),
                    event: ist.deserialize(obj.event),
                    transition: ist.deserialize(obj.transition)
                });
            });
    }(ist.AddTransitionCommand));
    
    
    ist.RemoveTransitionCommand = function (options) {
        ist.RemoveTransitionCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._statechart = this._options.statechart;
        this._transition = this._options.transition || this._statechart.get_transition_by_id(this._options.id);
        if (this._statechart.basis && this._statechart.basis()) {
            this._statechart = this._statechart.basis();
        }
        if (this._transition.basis && this._transition.basis()) {
            this._transition = this._transition.basis();
        }
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
        //	this._statechart.remove_transition(this._transition, false);
            this._transition.remove(false);
        };
    
        proto._unexecute = function () {
            this._transition.from()._add_direct_outgoing_transition(this._transition);
            this._transition.to()._add_direct_incoming_transition(this._transition);
            this._statechart.add_transition(this._transition);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            if (in_effect) {
                this._transition.destroy();
            }
        };
        ist.register_serializable_type("remove_transition_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    statechart: this._statechart.id(),
                    transition: this._transition.id()
                };
            },
            function (obj) {
                return new My({
                    statechart: ist.find_uid(obj.statechart),
                    transition: ist.find_uid(obj.transition)
                });
            });
    }(ist.RemoveTransitionCommand));
    
    ist.SetTransitionEventCommand = function (options) {
        ist.SetTransitionEventCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.transition) {
            throw new Error("Must select a transition");
        }
    
        this._event_str = this._options.event;
    
        this._transition = this._options.transition || this._options.statechart.get_transition_by_id(this.options.id);
        if (this._transition.basis && this._transition.basis()) {
            this._transition = this._transition.basis();
        }
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            var event = this._transition.event();
            this._from_str = event.get_str();
            event.set_str(this._event_str);
        };
    
        proto._unexecute = function () {
            var event = this._transition.event();
            event.set_str(this._from_str);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
		};
        ist.register_serializable_type("set_transition_event_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    transition_id: this._transition.id(),
                    event_str: this._event_str
                };
            },
            function (obj) {
                return new My({
                    transition: ist.find_uid(obj.transition_id),
                    event: obj.event_str
                });
            });
    }(ist.SetTransitionEventCommand));
    
    
    ist.SetTransitionFromCommand = function (options) {
        ist.SetTransitionFromCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._transition = this._options.transition;
        this._statechart = this._options.statechart;
        if (this._transition.basis && this._transition.basis()) {
            this._transition = this._transition.basis();
        }
        if (this._statechart.basis && this._statechart.basis()) {
            this._statechart = this._statechart.basis();
        }
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
			this._old_statechart = this._transition.from();
            this._transition.setFrom(this._statechart);
        };
    
        proto._unexecute = function () {
            this._transition.setFrom(this._old_statechart);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
		};
        ist.register_serializable_type("set_transition_from_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    transition_id: this._transition.id(),
                    state_id: this._statechart.id()
                };
            },
            function (obj) {
                return new My({
                    transition: ist.find_uid(obj.transition_id),
                    statechart: ist.find_uid(obj.state_id)
                });
            });
    }(ist.SetTransitionFromCommand));
    
    
    ist.SetTransitionToCommand = function (options) {
        ist.SetTransitionToCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._transition = this._options.transition;
        this._statechart = this._options.statechart;
        if (this._transition.basis && this._transition.basis()) {
            this._transition = this._transition.basis();
        }
        if (this._statechart.basis && this._statechart.basis()) {
            this._statechart = this._statechart.basis();
        }
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
			this._old_statechart = this._transition.to();
            this._transition.setTo(this._statechart);
        };
    
        proto._unexecute = function () {
            this._transition.setTo(this._old_statechart);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
		};
        ist.register_serializable_type("set_transition_to_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    transition_id: this._transition.id(),
                    state_id: this._statechart.id()
                };
            },
            function (obj) {
                return new My({
                    transition: ist.find_uid(obj.transition_id),
                    statechart: ist.find_uid(obj.state_id)
                });
            });
    }(ist.SetTransitionToCommand));
    
    var null_fn = function () {};
    
    ist.StatechartOnCommand = function (options) {
        ist.StatechartOnCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._statechart = this._options.statechart;
        this._context = this._options.context;
        //this._pcontext = this._options.pcontext;
        if (this._options.listener instanceof ist.ParsedFunction) {
            var func = this._options.listener;
            this._listener = function (info, type) {
                var state = info.state;
                var event = info.event;
                var pcontext = state.context();
                var js_context;
                if (pcontext) {
                    js_context = ist.find_or_put_contextual_obj(pcontext.pointsAt(), pcontext);
                }
                func._call(js_context, pcontext, event);
            };
        } else {
            this._listener = this._options.listener;
        }
        this._spec = this._options.spec;
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._statechart.on_transition(this._spec, this._listener, null_fn, this._context);
        };
    
        proto._unexecute = function () {
            this._statechart.off_transition(this._spec, this._listener, null_fn, this._context);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
		};
        ist.register_serializable_type("set_transition_on_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    statechart_id: this._statechart.id(),
                    context: ist.serialize.apply(ist, ([this._context]).concat(arg_array)),
                    pcontext: ist.serialize.apply(ist, ([this._pcontext]).concat(arg_array)),
                    listener: ist.serialize.apply(ist, ([this._listener]).concat(arg_array)),
                    spec: this._spec
                };
            },
            function (obj) {
                return new My({
                    statechart: ist.find_uid(obj.statechart_id),
                    context: ist.deserialize(obj.context),
                    pcontext: ist.deserialize(obj.pcontext),
                    listener: ist.deserialize(obj.listener),
                    spec: obj._spec
                });
            });
    }(ist.StatechartOnCommand));
    
    ist.StatechartOff = function (options) {
        ist.StatechartOff.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.statechart) {
            throw new Error("Must select a statechart");
        }
    
        this._statechart = this._options.statechart;
        this._context = this._options.context;
        this._listener = this._options.listener;
        this._spec = this._options.spec;
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._statechart.off_transition(this._spec, this._listener, null_fn, this._context);
        };
    
        proto._unexecute = function () {
            this._statechart.on_transition(this._spec, this._listener, null_fn, this._context);
        };
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
		};
        ist.register_serializable_type("set_transition_off_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    statechart_id: this._statechart.id(),
                    context: ist.serialize.apply(ist, ([this._context]).concat(arg_array)),
                    pcontext: ist.serialize.apply(ist, ([this._pcontext]).concat(arg_array)),
                    listener: ist.serialize.apply(ist, ([this._listener]).concat(arg_array)),
                    spec: this._spec
                };
            },
            function (obj) {
                return new My({
                    statechart: ist.find_uid(obj.statechart_id),
                    context: ist.deserialize(obj.context),
                    pcontext: ist.deserialize(obj.pcontext),
                    listener: ist.deserialize(obj.listener),
                    spec: obj._spec
                });
            });
    }(ist.StatechartOff));

}(interstate));
