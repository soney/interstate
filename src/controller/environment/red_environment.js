(function(red) {
var cjs = red.cjs, _ = red._;

var pad = function(str, len) {
	if(str.length > len) {
		return str.substring(0, len-3) + "...";
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

	var root, root_pointer;
	if(options && _.has(options, "root")) {
		root = options.root;
		root_pointer = red.create("pointer", {stack: [root]});
	} else {
		root = red.create("dict", {has_protos: false, direct_attachments: [red.create("dom_attachment", {
			instance_options: {
				tag: "div"
			}
		})]});

		root_pointer = red.create("pointer", {stack: [root]});
		this.initialize_props(root_pointer);
	}

	//Context tracking
	this.pointer = root_pointer;
	this.print_on_return = false;

	root.set("on", red.on_event);
	root.set("find", function(find_root) {
		if(arguments.length === 0) {
			find_root = root_pointer;
		}
		return new red.Query({value: find_root});
	});
};

(function(my) {
	var proto = my.prototype;

	proto.initialize_props = function(root_pointer) {
		var root_dict = root_pointer.points_at();

		var dom = red.create("dict", {has_protos: false, direct_attachments: [red.create("dom_attachment")]});
		root_dict.set("dom", dom);

		var children = red.create("dict", {has_protos: false});
		root_dict.set("children", children);
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
		this.pointer = this.pointer.call("get_prop_pointer", prop_name);

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
		return this.pointer.points_at();
	};
	proto.get_statechart_pointer = function() {
		var pointer = this.get_pointer_obj();
		var statechart;
		
		if(red.is_statechart(pointer)) {
			statechart = pointer;
		} else if(pointer instanceof red.StatefulObj) {
			statechart = pointer.get_own_statechart();
		}
		if(!statechart) {
			throw new Error("Could not find statechart");
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
			if(parent_obj instanceof red.StatefulObj) {
				value = red.create("stateful_prop");
			} else if(parent_obj instanceof red.Dict) {
				value = red.create("cell", {str: ""});
			}
		} else if(_.isString(value)) {
			if(value === "dict") {
				value = red.create("dict");
				var direct_protos = red.create("cell", {str: "[]", ignore_inherited_in_contexts: [value]});
				value._set_direct_protos(direct_protos);
			} else if(value === "stateful") {
				value = red.create("stateful_obj", undefined, true);
				value.do_initialize({
					direct_protos: red.create("stateful_prop", {can_inherit: false, ignore_inherited_in_contexts: [value]})
				});
				value.get_own_statechart()	.add_state("INIT")
											.starts_at("INIT");
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
				if(curr_val instanceof red.Cell) {
					var command = red.command("change_cell", {
						cell: curr_val
						, str: value
					});
				} else {
					if(_.isString(value)) {
						value = red.create("cell", {str: value});
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
				var obj = this.get_pointer_obj();
				var name = arg0;
				prop = obj._get_prop(name, this.pointer);
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
					var inherited_statecharts = pointer.get_inherited_statecharts(this.pointer);
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
	proto.print = function() {
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
			} else if(val instanceof red.StatefulObj) {
				return "(stateful:"+val.id+")";
			} else if(val instanceof red.Dict) {
				return "(dict:"+val.id+")";
			} else if(val instanceof red.Cell) {
				return "(cell:" + val.id + ")";
			} else if(val instanceof red.StatefulProp) {
				return "(prop:" + val.id + ")";
			} else if(val instanceof red.Query) {
				return value_to_value_str(val.value());
			} else if(val instanceof red.Pointer) {
				var points_at = val.points_at();
				return value_to_value_str(points_at);
			} else if(val instanceof red.ManifestationContext) {
				return val.id();
			} else if(_.isArray(val)) {
				return ("[" + _.map(val, function(v) { return value_to_value_str(v);}).join(", ") + "]");
			} else if(val instanceof cjs.ArrayConstraint) {
				var array_got = val.toArray();
				return "$" + value_to_value_str(array_got);
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
			} else if(val instanceof red.Dict) {
				return "";
			} else if(val instanceof red.Cell) {
				return "=(" + val.id + ")= " + val.get_str();
			} else {
				return val + "";
			}
		};

		var PROP_NAME_WIDTH = 30;
		var PROP_ID_WIDTH = 5;
		var PROP_VALUE_WIDTH = 40;

		var STATE_NAME_WIDTH = 30;
		var STATE_ID_WIDTH = 5;
		var TRANSITION_NAME_WIDTH = 20;
		var TRANSITION_VALUE_WIDTH = 100;
		var STATE_VALUE_WIDTH = 100;

		var current_pointer = this.pointer;
		var tablify = function(pointer) {
			var points_at = pointer.points_at();

			if(points_at instanceof red.Dict || points_at instanceof red.ManifestationContext) {
				var dict;

				if(points_at instanceof red.Dict) {
					var manifestation_pointers = points_at.get_manifestation_pointers(pointer);
					if(_.isArray(manifestation_pointers)) {
						var is_expanded = current_pointer.has(points_at);

						console[is_expanded ? "group" : "groupCollapsed"]("(manifestations)");
						_.each(manifestation_pointers, function(manifestation_pointer) {
							var manifestation_obj = manifestation_pointer.points_at();
							var is_expanded2 = current_pointer.has(manifestation_obj);
							var context_obj = manifestation_obj.get_context_obj();
							var manifestation_text = pad("" + context_obj.basis_index, PROP_NAME_WIDTH);
							manifestation_text = manifestation_text + pad("("+manifestation_obj.id()+")", PROP_ID_WIDTH)
							manifestation_text = manifestation_text + pad(value_to_value_str(context_obj.basis), PROP_VALUE_WIDTH)

							console[is_expanded2 ? "group" : "groupCollapsed"](manifestation_text);
							tablify(manifestation_pointer);
							console.groupEnd();
						});
						console.groupEnd();
						return;
					}
				}

				if(points_at instanceof red.ManifestationContext) {
					dict = pointer.points_at(-2);
				} else {
					dict = points_at;
				}

				if(dict instanceof red.StatefulObj) {
					var state_specs = dict.get_state_specs(pointer);
					console.group("  Statechart:");
					_.each(state_specs, function(state_spec) {
						var state = state_spec.state;
						var state_name;

						if(state instanceof red.State) {
							state_name = pad(state.get_name(), STATE_NAME_WIDTH-2);
						} else if(state instanceof red.StatechartTransition) { //transition
							var from = state.from(),
								to = state.to();
							state_name = pad(from.get_name() + "->" + to.get_name(), TRANSITION_NAME_WIDTH-2);
							state_name = state_name + pad(state.stringify(), TRANSITION_VALUE_WIDTH);
						}

						if(state_spec.active) {
							state_name = "* " + state_name;
						} else {
							state_name = "  " + state_name;
						}

						state_name = pad(state.id(), STATE_ID_WIDTH) + state_name;
						console.log(state_name);
					});
					console.groupEnd();
				}

				if(points_at instanceof red.ManifestationContext) {
					var context_obj = points_at.get_context_obj();
					_.each(context_obj, function(value, key) {
						var prop_text = "  " + key;
						prop_text = pad(prop_text, PROP_NAME_WIDTH + PROP_ID_WIDTH);
						prop_text = prop_text + pad(value_to_value_str(value), PROP_VALUE_WIDTH);
					});
				}
				var prop_names = dict.get_prop_names(pointer);
				_.each(prop_names, function(prop_name) {
					var is_inherited = dict.is_inherited(prop_name, pointer);
					var prop_pointer = dict.get_prop_pointer(prop_name, pointer);
					var prop_points_at = prop_pointer.points_at();

					var is_expanded = current_pointer.has(prop_points_at);
					var is_pointed_at = current_pointer.eq(prop_pointer);

					var prop_text = prop_name;
					if(is_inherited) {
						prop_text = prop_text + " (i)";
					}

					if(is_pointed_at) {
						prop_text = "> " + prop_text;
					} else {
						prop_text = "  " + prop_text;
					}

					if(prop_points_at instanceof red.StatefulProp) {
						prop_text = pad(prop_text, PROP_NAME_WIDTH);
						prop_text = prop_text + pad("(" + prop_points_at.id + ")", PROP_ID_WIDTH);
					} else {
						prop_text = pad(prop_text, PROP_NAME_WIDTH + PROP_ID_WIDTH);
					}

					prop_text = pad(prop_text + value_to_value_str(prop_pointer.val()), PROP_NAME_WIDTH + PROP_ID_WIDTH + PROP_VALUE_WIDTH);

					if((prop_points_at instanceof red.Dict) || (prop_points_at instanceof red.StatefulProp)) {
						console[is_expanded ? "group" : "groupCollapsed"](prop_text);
						tablify(prop_pointer);
						console.groupEnd();
					} else {
						console.log(prop_text + value_to_source_str(prop_points_at));
					}
				});
			} else if(points_at instanceof red.StatefulProp) {
				var value_specs = points_at.get_value_specs(pointer);
				_.each(value_specs, function(value_spec) {
					var value = value_spec.value;
					var source_str = value_to_source_str(value);

					var state = value_spec.state;
					var state_name;
					if(state instanceof red.State) {
						state_name = pad(state.get_name(), STATE_NAME_WIDTH-2);
					} else if(state instanceof red.StatechartTransition) { //transition
						var from = state.from(),
							to = state.to();
						state_name = pad(from.get_name() + "->" + to.get_name(), TRANSITION_NAME_WIDTH-2);
						state_name = state_name + pad(state.stringify(), TRANSITION_VALUE_WIDTH);
					}

					if(value_spec.active) {
						state_name = "*" + state_name;
					} else {
						state_name = " " + state_name;
					}

					if(value_spec.using) {
						state_name = "*" + state_name;
					} else {
						state_name = " " + state_name;
					}

					state_name = pad(state.id(), STATE_ID_WIDTH) + state_name;
					console.log(state_name);
				});
			}
		};

		var root = this.pointer.points_at(0);
		var root_str;
		if(this.pointer.points_at() === root) {
			root_str = ">root";
		} else {
			root_str = "root";
		}
		console.log(root_str + " (" + root.id + ")");
		tablify(this.pointer.slice(0,1));

		return "ok...";
	};
}(Env));

red.define("environment", function(options) {
	var env = new Env(options);
	return env;
});
}(red));
