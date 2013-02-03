(function(red) {
var cjs = red.cjs, _ = red._;

var pad = function(str, len) {
	if(str.length > len) {
		return str.substring(0, len);
	} else if(str.length < len) {
		var rv = str;
		while(rv.length < len) {
			rv += " ";
		}
		return rv;
	} else {
		return str;
	}
};


var Env = function(options) {
	// Undo stack
	this._command_stack = red.create("command_stack");

	var root;
	if(options && _.has(options, "root")) {
		root = options.root;
	} else {
		root = red.create("dict", {direct_attachments: [red.create("dom_attachment", {
			instance_options: {
				tag: "div"
			}
		})]});

		var root_context = red.create("context", {stack: [root]});
		root.set_default_context(root_context);

		this.initialize_props(root_context);
	}
	root.set("on", red.on_event);

	//Context tracking
	this.pointer = red.create("context", { stack: [root] });
	this.print_on_return = false;
};

(function(my) {
	var proto = my.prototype;

	proto.initialize_props = function(root) {
		var dom = red.create("dict", {direct_attachments: [red.create("dom_attachment")]});
		root.set("dom", dom);
		//dom.set_default_context(this._root_context.push(dom));

		var children = red.create("dict");
		root.set("children", children);
		//children.set_default_context(this._root_context.push(children));
		/**/
	};

	proto._do = function(command) { this._command_stack._do(command); };
	proto.undo = function() {
		this._command_stack._undo();
		if(this.print_on_return) { return this.print(); }
		else { return this; }
	};
	proto.redo = function() {
		this._command_stack._redo();
		if(this.print_on_return) { return this.print(); }
		else { return this; }
	};

	proto.cd = proto.in = function(prop_name) {
		this.pointer = this.pointer.prop(prop_name);

		if(this.print_on_return) return this.print();
		else return this;
	};
	proto.top = function() {
		this.pointer = this.pointer.slice(0, 1);

		if(this.print_on_return) return this.print();
		else return this;
	};
	proto.up = function() {
		this.pointer = this.pointer.pop();

		if(this.print_on_return) return this.print();
		else return this;
	};
	proto.get_root_pointer = function() {
		return this.pointer.slice(0, 1);
	};
	proto.get_pointer_obj = function() {
		return this.pointer.last();
	};
	proto.get_statechart_pointer = function() {
		var pointer = this.get_pointer_obj();
		var statechart;
		
		if(red.is_statechart(pointer)) {
			statechart = pointer;
		} else if(pointer instanceof red.RedStatefulObj) {
			statechart = pointer.get_own_statechart();
		}
		return statechart;
	};


	proto._get_set_prop_command = function(prop_name, value, index) {
		var parent_obj = this.get_pointer_obj();
		if(!_.isString(prop_name)) {
			var parent_direct_props = parent_obj._get_direct_props();
			prop_name = "prop_" + parent_direct_props.length;

			var original_prop_name = prop_name;
			var prop_try = 0;
			while(parent_obj.has_prop(prop_name)) {
				prop_name = original_prop_name + "_" + prop_try;
				prop_try++;
			}
		}

		if(_.isUndefined(value)) {
			if(parent_obj instanceof red.RedStatefulObj) {
				value = red.create("stateful_prop");
			} else if(parent_obj instanceof red.RedDict) {
				value = red.create("cell", {str: ""});
				value.set_default_context(parent_obj.get_default_context());
			}
		} else if(_.isString(value)) {
			if(value === "dict") {
				value = red.create("dict");
				value.set_default_context(parent_obj.get_default_context().push(value));
				var direct_protos = red.create("cell", {str: "[]", ignore_inherited_in_contexts: [value]});
				value._set_direct_protos(direct_protos);
			} else if(value === "stateful") {
				value = red.create("stateful_obj", undefined, true);
				value.do_initialize({
					default_context: parent_obj.get_default_context().push(value)
					, direct_protos: red.create("stateful_prop", {can_inherit: false, ignore_inherited_in_contexts: [value]})
					//, manifestations: red.create("cell")
				});
				value.get_own_statechart()	.add_state("INIT")
											.starts_at("INIT");
			} else {
				//value = red.create("cell", {str: value});
			}
		}

		if(prop_name[0] === "(" && prop_name[prop_name.length-1] === ")") {
			var builtin_name = prop_name.slice(1, prop_name.length-1);

			var builtin_info;
			var builtins = parent_obj.get_builtins();
			for(var i in builtins) {
				var builtin = builtins[i];
				var env_name = builtin._get_env_name();
				if(builtin_name === env_name) {
					builtin_info = builtin;
					break;
				}
			}
			if(builtin_info) {
				var getter_name = builtin_info._get_getter_name();
				var curr_val = parent_obj[getter_name]();
				if(curr_val instanceof red.RedCell) {
					var command = red.command("change_cell", {
						cell: curr_val
						, str: value
					});
				} else {
					if(_.isString(value)) {
						value = red.create("cell", {str: value});
						value.set_default_context(parent_obj.get_default_context());
					}
					var command = red.command("set_builtin", {
						parent: parent_obj
						, name: builtin_name
						, value: value
					});
				}
			}
		} else {
			if(_.isString(value)) {
				value = red.create("cell", {str: value});
				value.set_default_context(parent_obj.get_default_context());
			}
			var command = red.command("set_prop", {
				parent: parent_obj
				, name: prop_name
				, value: value
				, index: index
			});
		}
		return command;
	};
	proto.set = function() {
		if(arguments.length === 3) {
			return this.set_cell.apply(this, arguments);
		} else {
			var command = this._get_set_prop_command.apply(this, arguments);
			this._do(command);
			if(this.print_on_return) return this.print();
			else return this;
		}
	};
	proto._get_unset_prop_command = function(prop_name) {
		var parent_obj = this.get_pointer_obj();
		if(!_.isString(prop_name)) {
			console.error("No name given");
			return;
		}
		var command = red.command("unset_prop", {
			parent: parent_obj
			, name: prop_name
		});
		return command;
	};
	proto.unset = function() {
		var command = this._get_unset_prop_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};

	proto._get_rename_prop_command = function(from_name, to_name) {
		var parent_obj = this.get_pointer_obj();
		var command = red.command("rename_prop", {
			parent: parent_obj
			, from: from_name
			, to: to_name
		});
		return command;
	};
	proto.rename = function() {
		var command = this._get_rename_prop_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};
	proto._get_move_prop_command = function(prop_name, index) {
		var parent_obj = this.get_pointer_obj();
		var command = red.command("move_prop", {
			parent: parent_obj
			, name: prop_name
			, to: index
		});
		return command;
	};
	proto.move = function() {
		var command = this._get_move_prop_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};

	proto._get_set_cell_command = function(arg0, arg1, arg2) {
		var combine_command = false;
		var cell, str, for_state;
		var commands = [];
		if(arguments.length === 1) {
			cell = this.get_pointer_obj();
			str = arg0;
		} else if(arguments.length === 2) {
			cell = this._root;
			var pointer = this.get_pointer_obj();
			var builtins = pointer.get_builtins();
			for(var i = 0; i<builtins.lenth; i++) {
				if(arg0 === "(" + builtins[i].env_name + ")") {
					cell = pointer[builtins[i].getter_name];
					break;
				}
			}
			str = arg1;
		} else {
			var prop;
			var ignore_inherited_in_contexts = [];

			var pointer = this.get_pointer_obj();

			if(arg0[0] === "(" && arg0[arg0.length-1] === ")") {
				prop = pointer.direct_protos();
				ignore_inherited_in_contexts = [pointer];

				var builtins = pointer.get_builtins();
				for(var i in builtins) {
					var env_name = builtins[i]._get_env_name();
					if(arg0 === "(" + env_name + ")") {
						var getter_name = builtins[i]._get_getter_name();
						prop = pointer[getter_name]();
						break;
					}
				}
			} else {
				prop = this.get_pointer_obj();
				var name = arg0;
				prop = prop.get_prop(name, this.pointer);
			}

			var for_state_name = arg1;
			str = arg2;

			var statechart_pointer = this.get_statechart_pointer();
			if(for_state_name instanceof red.StatechartTransition) {
				for_state = for_state_name;
			} else {
				for_state = statechart_pointer.find_state(for_state_name);
				if(!for_state) {
					var pointer = this.get_pointer_obj();
					var context = pointer.get_default_context();
					var inherited_statecharts = pointer.get_inherited_statecharts(context);
					for(var i = 0; i<inherited_statecharts.length; i++) {
						var isc = inherited_statecharts[i];
						for_state = isc.find_state(for_state_name);
						if(for_state) {
							break;
						}
					}
				}
			}
			cell = red.create("cell", {str: "", ignore_inherited_in_contexts: ignore_inherited_in_contexts });
			commands.push(this._get_stateful_prop_set_value_command(prop,
																	for_state,
																	cell));
		}

		commands.push(red.command("change_cell", {
			cell: cell
			, str: str
		}));

		var command;
		if(commands.length === 1) {
			command = command[0];
		} else {
			command = red.command("combined", {
				commands: commands
			});
		}
		return command;
	};

	proto.set_cell = function() {
		var command = this._get_set_cell_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};

	var get_state = function(state_name, states) {
		for(var i = 0; i<states.length; i++) {
			var state = states[i];
			if(!(state instanceof red.Statechart)) { continue; }
			if(state === state_name) {
				return state;
			} else if(state.get_name() === state_name) {
				return state;
			} else if(state.get_name(state.parent()) === state_name) {
				return state;
			}
		}
		return undefined
	};

	proto._get_stateful_prop_set_value_command = function(stateful_prop, state, value) {
		var command = red.command("set_stateful_prop_value", {
			stateful_prop: stateful_prop
			, state: state
			, value: value
		});
		return command;
	};

	proto._get_stateful_prop_unset_value_command = function(stateful_prop, state) {
		var command = red.command("unset_stateful_prop_value", {
			stateful_prop: stateful_prop
			, state: state
		});
		return command;
	};

	proto._get_add_state_command = function(state_name, index) {
		var statechart = this.get_statechart_pointer();

		if(_.isNumber(index)) { index++; } // Because of the pre_init state

		var command = red.command("add_state", {
			name: state_name
			, statechart: statechart
			, index: index
		});
		return command;
	};

	proto.add_state = function() {
		var command = this._get_add_state_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};

	proto._get_remove_state_command = function(state_name) {
		var statechart = this.get_statechart_pointer();

		var command = red.command("remove_state", {
			name: state_name
			, statechart: statechart
		});
		return command;
	};
	proto.remove_state = function() {
		var command = this._get_remove_state_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};

	proto._get_move_state_command = function(state_name, index) {
		var statechart = this.get_statechart_pointer();

		if(_.isNumber(index)) { index++; } // Because of the pre_init state
		var command = red.command("move_state", {
			name: state_name
			, statechart: statechart
			, index: index
		});
		return command;
	};

	proto.move_state = function() {
		var command = this._get_move_state_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};


	proto._get_rename_state_command = function(from_state_name, to_state_name) {
		var statechart = this.get_statechart_pointer();

		var command = red.command("rename_state", {
			from: from_state_name
			, to: to_state_name
			, statechart: statechart
		});
		return command;
	};
	proto.rename_state = function() {
		var command = this._get_rename_state_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};


	proto._get_add_transition_command = function(from_state_name, to_state_name, event) {
		var statechart = this.get_statechart_pointer();
		var parent = this.get_pointer_obj();

		var from_state = statechart.find_state(from_state_name);
		var to_state = statechart.find_state(to_state_name);

		if(_.isString(event)) {
			event = red.create_event("parsed", {str: event, inert_super_event: true});
		} else {
			this._event = this._options.event;
		}

		var command = red.command("add_transition", {
			statechart: statechart
			, event: event
			, from: from_state
			, to: to_state
		});
		return command;
	};
	proto.add_transition = function() {
		var command = this._get_add_transition_command.apply(this, arguments);
		this._do(command);
		this._last_transition = command._transition;
		if(this.print_on_return) return this.print();
		else return this;
	};

	proto._get_remove_transition_command = function(transition_id) {
		var statechart = this.get_statechart_pointer();
		console.log(transition_id)

		var id, transition
		
		if(transition_id instanceof red.StatechartTransition) {
			transition = transition_id;
		} else {
			id = transition_id;
		}
		var command = red.command("remove_transition", {
			statechart: statechart
			, id: id
			, transition: transition
		});
		return command;
	};
	proto.remove_transition = function() {
		var command = this._get_remove_transition_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};

	proto._get_set_event_command = function(transition_id, event) {
		var statechart = this.get_statechart_pointer();

		var command = red.command("set_transition_event", {
			statechart: statechart
			, id: transition_id
			, event: event
		});
		return command
	};
	proto.set_event = function() {
		var command = this._get_set_event_command.apply(this, arguments);
		this._do(command);
		if(this.print_on_return) return this.print();
		else return this;
	};
	proto.print = function(only_values) {
		only_values = !!only_values;

		var value_to_value_str = function(val) {
			if(_.isUndefined(val)) {
				return "(undefined)";
			} else if(_.isNull(val)) {
				return "(null)";
			} else if(_.isNumber(val) || _.isBoolean(val)) {
				return val + "";
			} else if(_.isString(val)) {
				return '"' + val + '"';
			} else if(_.isFunction(val)) {
				return '(func)';
			} else if(_.isElement(val)) {
				return "(dom)";
			} else if(val instanceof red.RedStatefulObj) {
				return "(stateful:"+val.id+")";
			} else if(val instanceof red.RedDict) {
				return "(dict:"+val.id+")";
			} else if(val instanceof red.RedCell) {
				return "(cell)";
			} else if(val instanceof red.RedContext) {
				var last = val.last();
				return value_to_value_str(last);
			} else if(_.isArray(val)) {
				return ("[" + _.map(val, function(v) { return value_to_value_str(v);}).join(", ") + "]").slice(0, 10);
			} else {
				return ("{ " + _.map(val, function(v, k) {
					return k + ": " + v;
				}).join(", ") + " }");
			}
		};

		var value_to_source_str = function(val) {
			if(_.isUndefined(val)) {
				return "(undefined)";
			} else if(_.isNull(val)) {
				return "(null)";
			} else if(_.isString(val)) {
				return '"' + val + '"';
			} else if(_.isNumber(val) || _.isBoolean(val)) {
				return val + "";
			} else if(_.isFunction(val)) {
				return 'function() {...}';
			} else if(val instanceof red.RedDict) {
				return "";
			} else if(val instanceof red.RedCell) {
				return "=(" + val.id + ")= " + val.get_str();
			} else {
				return val + "";
			}
		};

		var pointer = this.pointer;
		var tablify_dict = function(dict, context) {
			if(_.isUndefined(context)) { context = red.create("context", {stack: [dict]}); }

			var manifestations = dict.get_manifestation_objs(context);

			if(_.isArray(manifestations)) {
				console.groupCollapsed(pad("(" + manifestations.length + " manifestation" + (manifestations.length === 1 ? "" : "s") + ")", 40) + value_to_source_str(dict.get_manifestations(context)));
				_.each(manifestations, function(manifestation) {
					console.groupCollapsed(pad(value_to_value_str(manifestation.prop_val("basis")), 20), " ("+manifestation.id+")");
					var manifestation_context = context.push(manifestation);
					tablify_dict(dict, manifestation_context);
					console.groupEnd();
				});
				console.groupEnd();
			} else {
				if(dict instanceof red.RedStatefulObj) {
					var state_specs = dict.get_state_specs(context);
					console.group("  Statechart:");
					var state_obj = {};
					_.each(state_specs, function(state_spec) {
						var state = state_spec.state;
						var state_name;

						if(state instanceof red.State) {
							state_name = state.get_name();
						} else if(state instanceof red.StatechartTransition) { //transition
							var from = state.from(),
								to = state.to();
							state_name = pad(from.get_name() + "->" + to.get_name(), 25) + state.stringify();
						}

						if(state_spec.active) {
							state_name = "* " + state_name;
						} else {
							state_name = "  " + state_name;
						}

						console.log(pad(state.id(), 5), state_name);
					});
					console.groupEnd();
				}
				var prop_names = dict.get_prop_names(context);

				_.forEach(prop_names, function(prop_name) {
					var value = dict.get_prop(prop_name, context);
					var value_got;

					try {
						value_got = dict.prop_val(prop_name, context);
						value_got = cjs.get(value_got);
					} catch(e) {
					}


					var is_inherited = dict.is_inherited(prop_name, context);
					var printed_prop_name;

					if(is_inherited) { printed_prop_name = prop_name + " i"; }
					else { prinded_prop_name = prop_name; }

					if(value === pointer.last()) { printed_prop_name = "> " + prop_name; }
					else { printed_prop_name = "  " + prop_name; }

					if(value && value.id) { printed_prop_name += " ("+value.id+")"; }

					printed_prop_name = pad(printed_prop_name, 40);

					if(value instanceof red.RedDict) {
						var group_type = value instanceof red.RedStatefulObj ? "stateful" : "dict";
						var group_name = printed_prop_name + " (" + group_type +")"
						if(pointer.has(value)) {
							console.group(group_name);
						} else {
							console.groupCollapsed(group_name);
						}
						tablify_dict(value, context.push(value));
						console.groupEnd();
					} else if(value instanceof red.RedStatefulProp) {
						if(only_values) {
							console.log(printed_prop_name + value_to_value_str(value_got));
						} else {
							var value_specs = value.get_value_specs(context);
							var group_name = printed_prop_name + " (" + value.id +")";
							if(pointer.has(value)) {
								console.group(group_name, value_to_value_str(value_got));
							} else {
								console.groupCollapsed(group_name, value_to_value_str(value_got));
							}
							_.each(value_specs, function(value_spec) {
								var value = value_spec.value;
								var source_str = value_to_source_str(value);

								var state = value_spec.state;
								var state_name;
								if(state instanceof red.State) {
									state_name = state.get_name() + " (" + state.id() + ")";
								} else if(state instanceof red.StatechartTransition) { //transition
									var from = state.from(),
										to = state.to();
									state_name = from.get_name() + "->" + to.get_name() + " (" + state.id() + ")";
								}

								if(value_spec.active) {
									state_name = "* " + state_name;
								} else {
									state_name = "  " + state_name;
								}

								if(value_spec.using) {
									state_name = state_name + " *";
								}

								console.log(pad(state_name + ": ", 30), source_str);
							});
							console.groupEnd();
						}
					} else {
						if(only_values) {
							console.log(printed_prop_name, value_to_value_str(value_got));
						} else {
							console.log(printed_prop_name, pad(value_to_value_str(value_got), 25), value_to_source_str(value));
						}
					}
				});
			}
		};
		var root = pointer.first();

		var root_str;
		if(pointer.last() === root) {
			root_str = ">root";
		} else {
			root_str = "root";
		}
		console.log(root_str + " (" + root.id + ")");
		tablify_dict(root);
		return "ok...";
	};
}(Env));

red.define("environment", function(options) {
	var env = new Env(options);
	return env;
});
}(red));
