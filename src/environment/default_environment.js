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
	this.root = cjs.create("red_dict");

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
		//this.root.set_prop("mouse", cjs.mouse);
		//this.root.set_prop("keyboard", cjs.keyboard);
		//this.root.set_prop("dom", red.blueprints.dom_obj());
		this.set("a", "1");
		this.set("b", "1+2");
		this.set("c", "1+2+3");
	};

	proto._do = function(command) { this._command_stack._do(command); };
	proto.undo = function() { this._command_stack._undo(); return this.print(); };
	proto.redo = function() { this._command_stack._redo(); return this.print(); };

	proto.add = proto.set = function(prop_name, value, index) {
		var parent_obj = this._context.get_context();
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
			}
		} else if(_.isString(value)) {
			if(value === "dict") {
				value = cjs.create("red_dict");
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
		var parent_obj = this._context.get_context();
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
		var parent_obj = this._context.get_context();
		var command = red.command("rename_prop", {
			parent: parent_obj
			, from: from_name
			, to: to_name
		});
		this._do(command);
		return this.print();
	};
	proto.move = function(prop_name, index) {
		var parent_obj = this._context.get_context();
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

	proto.set_cell = function(arg0, arg1) {
		var cell, str;
		if(arguments.length === 1) {
			cell = this._context.get_context();
			str = arg0;
		} else {
			cell = this.root;
			_.forEach(arg0.split("."), function(name) {
				cell = cell.get_prop(name);
			});
			str = arg1;
		}
		var command = red.command("change_cell", {
			cell: cell
			, str: str
		});
		this._do(command);
		return this.print();
	};


	proto.print = function() {
		var context = this._context.get_context();

		var value_to_value_str = function(val) {
			if(_.isNumber(val)) {
				return val + "";
			} else if(_.isString(val)) {
				return '"' + val + '"';
			} else if(_.isArray(val)) {
				return "[" + _.map(val, function(v) { return value_to_value_str(v);}).join(", ") + "]";
			} else if(cjs.is_constraint(val)) {
				if(val.type === "red_dict") {
					return "(dict)";
				}
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
			} else if(val.type === "red_cell") {
				return "= " + val.get_str();
			} else if(cjs.is_constraint(val)) {
				if(val.type === "red_dict") {
					return "";
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

				var row = [prop_name, value_to_value_str(value_got), value_to_source_str(value)];

				rows.push(row);

				if(cjs.is_constraint(value)) {
					if(value.type === "red_dict" || value.type === "red_stateful_obj") {
						var tablified_values = tablify_dict(value, indentation_level + 2);
						rows.push.apply(rows, tablified_values);
					}
				}
			});
			return rows;
		};

		var table = tablify_dict(this.root);
		var str = print_table(table);
		return "\n" + str + "\n"
	};
}(Env));

red.create_environment = function() {
	var env = new Env();
	return env;
};
}(red));
