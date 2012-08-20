(function(red) {
var cjs = red.cjs, _ = cjs._;

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
				cell = cell+"";
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

var command_stack_factory = function() {
	var stack = [];
	var index = -1; // Points at the next thing to undo

	var can_undo = function() {
		return index >= 0;
	};
	var can_redo = function() {
		return index < stack.length - 1;
	};

	return {
		_do: function(command) {
			var discarded_commands = stack.splice(index + 1, stack.length - index);

			command._do();
			_.forEach(discarded_commands, function(discarded_command) {
				if(cjs.is_constraint(discarded_command)) {
					discarded_command.destroy();
				}
			});

			stack.push(command);
			index++;
		}
		, _undo: function() {
			if(can_undo()) {
				var last_command = stack[index];
				last_command._undo();
				index--;
			}
		}
		, _redo: function() {
			if(can_redo()) {
				var last_command = stack[index+1];
				last_command._do()
				index++;
			}
		}
		, print: function() {
			console.log(stack, index);
		}
		, can_undo: can_undo
		, can_redo: can_redo
	};
};

var context_factory = function(initial_context) {
	var context = initial_context;

	return {
		parent: function() {
		}
		, prop: function() {
		}
		, get_context: function() {
			return context;
		}
		, set_context: function(c) {
			context = c;
		}
	};
};

var Env = function() {
	this._proto_prop_blueprint = red.blueprints.proto_prop();
	this._dom_container_blueprint = red.blueprints.dom_container();
	this._dom_obj_blueprint = red.blueprints.dom_obj();

	this.root = cjs.create("red_dict", {implicit_protos: [this._dom_container_blueprint]});

	// Undo stack
	this._command_stack = command_stack_factory();

	//Context tracking
	this._context = context_factory(this.root);

	this.initialize_props();
	console.log(this.print());
};

(function(my) {
	var proto = my.prototype;

	proto.initialize_props = function() {
		this.set("dom", this._dom_obj_blueprint);
		this.set("children", "dict");
		this.in_prop("children");
	/*
		this.set("a", "1");
		this.set("b", "1+2");
		this.set("c", "1+2+3");
		this.set("d", "stateful");
		this.in_prop("d");
		var inita_event = cjs.create_event("manual");
		var ab_event = cjs.create_event("manual");
		var ba_event = cjs.create_event("manual");
		var bc_event = cjs.create_event("manual");
		var cb_event = cjs.create_event("manual");
		var self = this;
		window.inita = function() { inita_event.fire(); return self.print(); };
		window.ab = function() { ab_event.fire(); return self.print(); };
		window.ba = function() { ba_event.fire(); return self.print(); };
		window.bc = function() { bc_event.fire(); return self.print(); };
		window.cb = function() { cb_event.fire(); return self.print(); };
		this.add_state("a");
		this.add_state("b");
		this.add_state("c");
		this.add_transition("INIT", "a", inita_event);
		this.add_transition("a", "b", ab_event);
		this.add_transition("b", "a", ba_event);
		this.add_transition("b", "c", bc_event);
		this.add_transition("c", "b", cb_event);

		this.set("x");
		*/
		this.set("x", "stateful");
		this.in_prop("children.x");
		window.x = this.get_context();
	};

	proto._do = function(command) { this._command_stack._do(command); };
	proto.undo = function() { this._command_stack._undo(); return this.print(); };
	proto.redo = function() { this._command_stack._redo(); return this.print(); };

	proto.get_context = function() {
		return this._context.get_context();
	};
	proto.get_statechart_context = function() {
		var context = this.get_context();
		var statechart;
		
		if(cjs.is_statechart(context)) {
			statechart = context;
		} else if(cjs.is_constraint(context) && context.type === "red_stateful_obj") {
			statechart = context.get_statechart();
		}
		return statechart;
	};

	proto.add = proto.set = function(prop_name, value, index) {
		var parent_obj = this.get_context();
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
			if(parent_obj.type === "red_dict") {
				value = cjs.create("red_cell", {str: ""});
			} else if(parent_obj.type === "red_stateful_obj") {
				value = cjs.create("red_stateful_prop");
			}
		} else if(_.isString(value)) {
			if(value === "dict") {
				value = cjs.create("red_dict");
			} else if(value === "stateful") {
				value = cjs.create("red_stateful_obj", {implicit_protos: [this._proto_prop_blueprint]});
				value.run();
			} else {
				value = cjs.create("red_cell", {str: value});
			}
		}

		var command = red.command("set_prop", {
			parent: parent_obj
			, name: prop_name
			, value: value
			, index: index
		});
		this._do(command);
		return this.print();
	};
	proto.unset = function(prop_name) {
		var parent_obj = this.get_context();
		if(!_.isString(prop_name)) {
			console.error("No name given");
			return;
		}
		var command = red.command("unset_prop", {
			parent: parent_obj
			, name: prop_name
		});
		this._do(command);
		return this.print();
	};
	proto.rename = function(from_name, to_name) {
		var parent_obj = this.get_context();
		var command = red.command("rename_prop", {
			parent: parent_obj
			, from: from_name
			, to: to_name
		});
		this._do(command);
		return this.print();
	};
	proto.move = function(prop_name, index) {
		var parent_obj = this.get_context();
		var command = red.command("move_prop", {
			parent: parent_obj
			, name: prop_name
			, to: index
		});
		this._do(command);
		return this.print();
	};

	proto.in_prop = function(prop_name) {
		prop_name = prop_name || "";
		var context = this.root;

		_.forEach(prop_name.split("."), function(name) {
			context = context.get_prop(name);
		});
		this._context.set_context(context);

		return this.print();
	};
	proto.up = function() {
		this._context.set_context(this.root);

		return this.print();
	};

	proto.set_cell = function(arg0, arg1, arg2) {
		var cell, str, for_state;
		if(arguments.length === 1) {
			cell = this.get_context();
			str = arg0;
		} else if(arguments.length === 2) {
			cell = this.root;
			_.forEach(arg0.split("."), function(name) {
				cell = cell.get_prop(name);
			});
			str = arg1;
		} else {
			prop = this.get_context();
			_.forEach(arg0.split("."), function(name) {
				prop = prop.get_prop(name);
			});

			for_state = arg1;
			str = arg2;

			var context = this.get_context();
			var context_states = context.get_states();
			if(_.isNumber(for_state)) {
				for(var i = 0; i<context_states.length; i++) {
					if(context_states[i].id === for_state) {
						for_state = context_states[i];
						break;
					}
				}
			} else if(_.isString(for_state)) {
				var statechart = this.get_statechart_context();
				for_state = get_state(context, statechart, for_state);
			}
			cell = cjs.create("red_cell", {str: ""});
			prop.set_value(for_state, cell);
		}
		var command = red.command("change_cell", {
			cell: cell
			, str: str
		});
		this._do(command);
		return this.print();
	};

	proto.add_state = function(state_name, index) {
		var statechart = this.get_statechart_context().get_state_with_name("running.own");

		if(_.isNumber(index)) { index++; } // Because of the pre_init state

		var command = red.command("add_state", {
			state_name: state_name
			, statechart: statechart
			, index: index
		});
		this._do(command);
		return this.print();
	};

	proto.remove_state = function(state_name) {
		var statechart = this.get_statechart_context().get_state_with_name("running.own");

		var command = red.command("remove_state", {
			state_name: state_name
			, statechart: statechart
		});
		this._do(command);
		return this.print();
	};

	proto.move_state = function(state_name, index) {
		var statechart = this.get_statechart_context().get_state_with_name("running.own");

		if(_.isNumber(index)) { index++; } // Because of the pre_init state
		var command = red.command("move_state", {
			state_name: state_name
			, statechart: statechart
			, index: index
		});
		this._do(command);
		return this.print();
	};

	proto.rename_state = function(from_state_name, to_state_name) {
		var statechart = this.get_statechart_context().get_state_with_name("running.own");

		var command = red.command("rename_state", {
			from: from_state_name
			, to: to_state_name
			, statechart: statechart
		});
		this._do(command);
		return this.print();
	};

	var get_state = function(parent, statechart, state_name) {
		if(_.isString(state_name)) {
			if(state_name === "INIT") {
				return parent.get_init_state();
			} else {
				return statechart.get_state_with_name("running.own." + state_name);
			}
		} else {
			return state_name;
		}
	};

	proto.add_transition = function(from_state_name, to_state_name, event) {
		var statechart = this.get_statechart_context();
		var parent = this.get_context();

		var from_state = get_state(parent, statechart, from_state_name);
		var to_state = get_state(parent, statechart, to_state_name);

		var command = red.command("add_transition", {
			statechart: statechart
			, parent: parent
			, event: event
			, from: from_state
			, to: to_state
		});

		this._do(command);
		return this.print();
	};

	proto.remove_transition = function(transition_id) {
		var statechart = this.get_statechart_context();

		var command = red.command("remove_transition", {
			statechart: statechart
			, id: transition_id
		});

		this._do(command);
		return this.print();
	};

	proto.set_event = function(transition_id, event) {
		var statechart = this.get_statechart_context();

		var command = red.command("set_transition_event", {
			statechart: statechart
			, id: transition_id
			, event: event
		});

		this._do(command);
		return this.print();
	};

	proto.print = function() {
		var context = this._context.get_context();

		var value_to_value_str = function(val) {
			if(_.isUndefined(val)) {
				return "(undefined)";
			} else if(_.isNull(val)) {
				return "(null)";
			} else if(_.isNumber(val)) {
				return val + "";
			} else if(_.isString(val)) {
				return '"' + val + '"';
			} else if(cjs.is_constraint(val)) {
				if(val.type === "red_dict") {
					return "(dict)";
				} else if(val.type === "red_stateful_obj") {
					return "(stateful)";
				}
			} else if(_.isArray(val)) {
				return "[" + _.map(val, function(v) { return value_to_value_str(v);}).join(", ") + "]";
			} else {
				return "{ " + _.map(val, function(v, k) {
					return k + ": " + value_to_value_str(v);
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
			} else if(cjs.is_constraint(val)) {
				if(val.type === "red_dict") {
					return "";
				} else if(val.type === "red_stateful_obj") {
					return "";
				} else if(val.type === "red_cell") {
					return "= " + val.get_str();
				}
			} else {
				return val + "";
			}
		};

		var tablify_dict = function(dict, indentation_level) {
			if(!_.isNumber(indentation_level)) { indentation_level = 0; }
			var indent = "";
			while(indent.length < indentation_level) {
				indent += " ";
			}
			var rows = [];
			var prop_names = dict.get_all_prop_names();
			_.forEach(prop_names, function(prop_name) {
				var value = dict.get_prop(prop_name);
				var is_inherited = dict.is_inherited(prop_name);
				prop_name = indent + prop_name;
				if(is_inherited) { prop_name += " i" }
				if(value === context) { prop_name = "> " + prop_name; }
				else { prop_name = "  " + prop_name; }

				var value_got = cjs.get(value);


				if(cjs.is_constraint(value) && value.type === "red_dict") {
					var row = [prop_name, value_to_value_str(value_got), value_to_source_str(value)];
					rows.push(row);

					var tablified_values = tablify_dict(value, indentation_level + 2);
					rows.push.apply(rows, tablified_values);
				} else if(cjs.is_constraint(value) && value.type === "red_stateful_obj") {
					var statechart = value.get_statechart();
					to_print_statecharts.push(statechart);
					var own_running_statechart = statechart.get_state_with_name("running.own");

					var row = [prop_name, "(sc " + statechart.id + ")"];
					row = row.concat(_.map(value.get_states(), function(state) {
						var name = state.get_name(own_running_statechart) + " (" + state.id + ")";
						if(statechart.is(state)) {
							name = "* " + name + " *";
						}
						return name;
					}));
					rows.push(row);

					var tablified_values = tablify_dict(value, indentation_level + 2);
					rows.push.apply(rows, tablified_values);
				} else if(cjs.is_constraint(value) && value.type === "red_stateful_prop") {
					var parent = value.get_stateful_obj_parent();
					var parent_states = parent.get_states();

					var row = [prop_name, value_to_value_str(value_got)];
					_.forEach(parent_states, function(parent_state) {
						var val = value.get_value(parent_state);
						var val_got = val.get();
						row.push(value_to_source_str(val_got));
					});
					rows.push(row);
				} else {
					var row = [prop_name, value_to_value_str(value_got), value_to_source_str(value)];
					rows.push(row);
				}
			});
			return rows;
		};

		var to_print_statecharts = [];

		var table = tablify_dict(this.root);
		var str = print_table(table);
		str += "\n\n====\n";
		_.forEach(to_print_statecharts, function(statechart) {
			str += "\n"
			str += statechart.stringify();
			str += "\n"
		});
		return "\n" + str;
	};
}(Env));

red.create_environment = function() {
	var env = new Env();
	return env;
};
}(red));
