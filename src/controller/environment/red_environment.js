(function(red) {
var cjs = red.cjs, _ = red._;
var print_on_return = false;

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

var print_table = function(table, max_width) {
	if(!max_width) {
		max_width = -1;
	}

	var column_widths = [];
	_.forEach(table, function(cells, row) {
		_.forEach(cells, function(cell, col) {
			if(!_.isString(cell)) {
				cell = cell + "";
			}
			var len = cell.length;
			column_widths[col] = _.isNumber(column_widths[col]) ? Math.max(len, column_widths[col]) : len;
		});
	});

	if(max_width > 0) {
		column_widths = _.map(column_widths, function(column_width) {
			return Math.min(column_width, max_width);
		});
	}

	var row_divider_length = 0;
	_.forEach(column_widths, function(column_width) {
		row_divider_length += column_width + 3;
	});
	var row_divider = "";
	while(row_divider.length < row_divider_length) {
		row_divider += "-";
	}

	var table_str= "";
	_.forEach(table, function(cells, row) {
		var row_str = "";
		_.forEach(cells, function(cell, col) {
			if(!_.isString(cell)) {
				cell = cell+"";
			}
			row_str += pad(cell, column_widths[col]);
			if(col < cells.length-1) {
				row_str += " | ";
			}
		});
		table_str += row_str;
		if(row < table.length-1) {
			table_str += "\n" + row_divider + "\n";
		}
	});
	return table_str;
};

var pointer_factory = function(initial_pointer) {
	var pointer = initial_pointer;
	var context = red.create("context", {stack: [initial_pointer]});

	return {
		parent: function() {
		}
		, prop: function() {
		}
		, get_pointer: function() {
			return pointer;
		}
		, set_pointer: function(p) {
			pointer = p;
		}
		, get_context: function() {
			return context;
		}
		, set_context: function(c) {
			context = c;
		}
	};
};

var Env = function(options) {
	// Undo stack
	this._command_stack = red.create("command_stack");

	if(options && _.has(options, "root")) {
		this._root = options.root;
		this._root_context = this._root.get_default_context();
	} else {
		this._root = red.create("dict", {direct_attachments: [red.create("dom_attachment", {
			instance_options: {
				tag: "div"
			}
		})]});
		this._root_context = red.create("context", {stack: [this._root]});
		this._root.set_default_context(this._root_context);

		this.initialize_props();
	}

	//Context tracking
	this._pointer = pointer_factory(this._root);
};

(function(my) {
	var proto = my.prototype;

	proto.initialize_props = function() {
		var dom = red.create("dict", {direct_attachments: [red.create("dom_attachment")]});
		this._root.set("dom", dom);
		dom.set_default_context(this._root_context.push(dom));

		var children = red.create("dict");
		this._root.set("children", children);
		children.set_default_context(this._root_context.push(children));
		/**/
	};

	proto._do = function(command) { this._command_stack._do(command); };
	proto.undo = function() { this._command_stack._undo(); };
	proto.redo = function() { this._command_stack._redo(); };

	proto.get_root = function() { return this._root; };
	proto.get_root_context = function() { return this._root_context; };

	proto.cd = proto.in = function(prop_name) {
		prop_name = prop_name || "";
		var pointer = this.get_pointer();
		var context = this.get_context();

		_.forEach(prop_name.split("."), function(name) {
			if(pointer) {
				pointer = pointer.get_prop(name, context);
				context = context.push(pointer);
			}
		});
		this._pointer.set_pointer(pointer);
		this._pointer.set_context(context);

		if(print_on_return) return this.print();
	};
	proto.top = function() {
		this._pointer.set_pointer(this._root);
		this._pointer.set_context(red.create("context", {stack: [this._root]}));

		if(print_on_return) return this.print();
	};
	proto.up = function() {
		var context = this.get_context();

		context = context.pop();
		var ptr = context.last() || this._root;
		this._pointer.set_pointer(ptr);
		this._pointer.set_context(context);
		if(print_on_return) return this.print();
	};
	proto.get_pointer = function() {
		return this._pointer.get_pointer();
	};
	proto.get_context = function() {
		return this._pointer.get_context();
	};
	proto.get_statechart_pointer = function() {
		var pointer = this.get_pointer();
		var statechart;
		
		if(red.is_statechart(pointer)) {
			statechart = pointer;
		} else if(pointer instanceof red.RedStatefulObj) {
			statechart = pointer.get_own_statechart();
		}
		return statechart;
	};

	proto.print = function() {
		var pointer = this.get_pointer();

		var value_to_value_str = function(val) {
			if(_.isUndefined(val)) {
				return "(undefined)";
			} else if(_.isNull(val)) {
				return "(null)";
			} else if(_.isNumber(val)) {
				return val + "";
			} else if(_.isString(val)) {
				return '"' + val + '"';
			} else if(_.isElement(val)) {
				return "(dom)";
			} else if(val instanceof red.RedStatefulObj) {
				return "(stateful)";
			} else if(val instanceof red.RedDict) {
				return "(dict)";
			} else if(val instanceof red.RedCell) {
				return "(cell)";
			} else if(_.isArray(val)) {
				return "[" + _.map(val, function(v) { return value_to_value_str(v);}).join(", ") + "]";
			} else {
				return "{ " + _.map(val, function(v, k) {
					return k + ": " + v;
				}).join(", ") + " }";
			}
		};

		var value_to_source_str = function(val) {
			if(_.isUndefined(val)) {
				return "(undefined)";
			} else if(_.isNull(val)) {
				return "(null)";
			} else if(_.isString(val)) {
				return '"' + val + '"';
			} else if(_.isNumber(val)) {
				return val + "";
			} else if(val instanceof red.RedDict) {
				return "";
			} else if(val instanceof red.RedCell) {
				return "=(" + val.id + ")= " + val.get_str();
			} else {
				return val + "";
			}
		};

		var tablify_dict = function(dict, indentation_level, context) {
			if(!_.isNumber(indentation_level)) { indentation_level = 0; }
			if(_.isUndefined(context)) { context = red.create("context"); }

			var indent = "";
			while(indent.length < indentation_level) {
				indent += " ";
			}
			var rows = [];
			var dictified_context = context.push(dict);
			var prop_names = dict.get_prop_names(dictified_context);
			_.forEach(prop_names, function(prop_name) {
				var value = dict.get_prop(prop_name, dictified_context);
				var is_inherited = dict.is_inherited(prop_name, dictified_context);
				prop_name = indent + prop_name;
				if(is_inherited) { prop_name += " i" }
				if(value === pointer) { prop_name = "> " + prop_name; }
				else { prop_name = "  " + prop_name; }

				var value_got = red.get_contextualizable(value, dictified_context);
				value_got = cjs.get(value_got);

				if(value instanceof red.RedStatefulObj) {
					var state_specs = value.get_state_specs(dictified_context.push(value));
					var row = [prop_name + " - " + value.id, value_to_value_str(value_got)];

					var state_strs = _.map(state_specs, function(state_spec) {
						var rv;
						var state = state_spec.state;
						if(state instanceof red.Statechart) {
							rv = state.get_name(state.parent());
							rv += " " + state.id();
							if(state.basis()) {
								rv += "<-"+state.basis().id();
							}
							if(state_spec.active) {
								rv = "* " + rv + " *";
							}
						} else if(state instanceof red.StatechartTransition) {
							var transition = state
								, to_state = transition.to();
							
							rv = "(" + transition.stringify() + ")-> " + to_state.get_name(to_state.parent());
						}
						return rv;
					});

					row.push.apply(row, state_strs);
					to_print_statecharts.push.apply(to_print_statecharts, value.get_statecharts(dictified_context.push(value)));
					to_print_statecharts.push(value.get_own_statechart());

					rows.push(row);
					
					var tablified_values = tablify_dict(value, indentation_level + 2, dictified_context);
					rows.push.apply(rows, tablified_values);
				} else if(value instanceof red.RedDict) {
					var row = [prop_name + " - " + value.id, value_to_value_str(value_got), value_to_source_str(value)];
					rows.push(row);

					var tablified_values = tablify_dict(value, indentation_level + 2, dictified_context);
					rows.push.apply(rows, tablified_values);
				} else if(value instanceof red.RedStatefulProp) {
					var value_specs = value.get_value_specs(dictified_context);
					var row = [prop_name + " - " + value.id, value_to_value_str(value_got)];

					var value_strs = _.map(value_specs, function(value_spec) {
						var value = value_spec.value;
						var rv = value_to_source_str(value);
						if(value_spec.active) {
							rv = rv + " *";
						}

						if(value_spec.using) {
							rv = "* " + rv;
						}
						return rv;
					});
					row.push.apply(row, value_strs);

					rows.push(row);
				} else {
					var row = [prop_name, value_to_value_str(value_got), value_to_source_str(value)];
					rows.push(row);
				}
			});
			return rows;
		};

		var to_print_statecharts = [];

		var table = tablify_dict(this._root);
		var str = print_table(table);
		str += "\n\n====\n";
		_.forEach(_.uniq(to_print_statecharts), function(statechart) {
			str += "\n"
			str += statechart.stringify();
			str += "\n"
		});
		return "\n" + str;
	};

	proto._get_set_prop_command = function(prop_name, value, index) {
		var parent_obj = this.get_pointer();
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
					, manifestations: red.create("stateful_prop")
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
			if(print_on_return) return this.print();
		}
	};
	proto._get_unset_prop_command = function(prop_name) {
		var parent_obj = this.get_pointer();
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
		if(print_on_return) return this.print();
	};

	proto._get_rename_prop_command = function(from_name, to_name) {
		var parent_obj = this.get_pointer();
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
		if(print_on_return) return this.print();
	};
	proto._get_move_prop_command = function(prop_name, index) {
		var parent_obj = this.get_pointer();
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
		if(print_on_return) return this.print();
	};

	proto._get_set_cell_command = function(arg0, arg1, arg2) {
		var combine_command = false;
		var cell, str, for_state;
		if(arguments.length === 1) {
			cell = this.get_pointer();
			str = arg0;
		} else if(arguments.length === 2) {
			cell = this._root;
			var pointer = this.get_pointer();
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

			var pointer = this.get_pointer();

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
				var ptr_context = this.get_context();
				prop = this.get_pointer();
				_.forEach(arg0.split("."), function(name) {
					prop = prop.get_prop(name, ptr_context);
					ptr_context = ptr_context.push(prop);
				});
			}

			for_state = arg1;
			str = arg2;

			var statechart_pointer = this.get_statechart_pointer();
			/*
			var pointer_states = statechart_pointer.get_states();
			//var pointer_states = pointer.get_states(this.get_context());
			if(_.isNumber(for_state)) {
				for(var i = 0; i<pointer_states.length; i++) {
					var state= pointer_states[i];
					if(state instanceof red.Statechart) {
						if(state.id === for_state) {
							for_state = pointer_states[i];
							break;
						}
					} else {
						if(state.id() === for_state || (state.basis() && state.basis().id() === for_state)) {
							for_state = state;
							break;
						}
					}
				}
			} else if(_.isString(for_state)) {
				for_state = get_state(for_state, pointer_states);
			}
			*/
			for_state = statechart_pointer.find_state(for_state);
			cell = red.create("cell", {str: "", ignore_inherited_in_contexts: ignore_inherited_in_contexts });
			combine_command = this._get_stateful_prop_set_value_command(prop, for_state, cell);
		}
		var command;
		var change_cell_command = red.command("change_cell", {
			cell: cell
			, str: str
		});
		if(combine_command) {
			command = red.command("combined", {
				commands: [combine_command, change_cell_command]
			});
		} else {
			command = change_cell_command;
		}
		return command;
	};

	proto.set_cell = function() {
		var command = this._get_set_cell_command.apply(this, arguments);
		this._do(command);
		if(print_on_return) return this.print();
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
		if(print_on_return) return this.print();
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
		if(print_on_return) return this.print();
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
		if(print_on_return) return this.print();
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
		if(print_on_return) return this.print();
	};


	proto._get_add_transition_command = function(from_state_name, to_state_name, event) {
		var statechart = this.get_statechart_pointer();
		var parent = this.get_pointer();

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
		if(print_on_return) return this.print();
	};

	proto._get_remove_transition_command = function(transition_id) {
		var statechart = this.get_statechart_pointer();

		var command = red.command("remove_transition", {
			statechart: statechart
			, id: transition_id
		});
		return command;
	};
	proto.remove_transition = function() {
		var command = this._get_remove_transition_command.apply(this, arguments);
		this._do(command);
		if(print_on_return) return this.print();
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
		if(print_on_return) return this.print();
	};

	proto._get_set_basis_command = function(basis) {
		var group = this.get_pointer();

		var command = red.command("set_group_basis", {
			group: group
			, basis: basis
		});
		return command
	};
	proto.set_basis = function() {
		var command = this._get_set_basis_command.apply(this, arguments);
		this._do(command);
		if(print_on_return) return this.print();
	};

	proto._get_set_template_command = function(template) {
		var group = this.get_pointer();

		var command = red.command("set_group_template", {
			group: group
			, template: template
		});
		return command
	};
	proto.set_template = function() {
		var command = this._get_set_template_command.apply(this, arguments);
		this._do(command);
		if(print_on_return) return this.print();
	};
}(Env));

red.define("environment", function(options) {
	var env = new Env(options);
	return env;
});
}(red));
