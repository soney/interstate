(function(red) {
var cjs = red.cjs, _ = cjs._;
red.parse_table = function(table_str) {
	var lines = table_str.split("\n");
	var i, len = lines.length;
	var match, line;

	var objs = {};

	for(i = 0; i<len; i++) {
		line = lines[i];
		if(match = line.match(/@(\w+):\s*FSM\s*\(\s*$/)) {
			var var_name = match[1];

			var root_fsm = objs[var_name] = {type: "fsm", states: {}, transitions: [], parent: null, name: null, options: null};

			var curr_fsm = root_fsm;

			var from_state;
			i++;
			var curr_tab_level = 1;
			for(; i<len; i++) {
				line = lines[i];
				if(match = line.match(/^\)$/)) {
					break;
				} else if(match = line.match(/^(\t+)([a-zA-Z_\$][a-zA-Z_\$0-9]*)\s*(\(([a-zA-Z,\s]*)\))?\s*:\s*$/)) {
					var tab_level = match[1].length;
					var state_name = match[2];
					var options = match[4]

					while(curr_tab_level > tab_level) {
						curr_fsm = curr_fsm.parent;
						curr_tab_level--;
					}

					var state = {type: "fsm", states:{}, transitions: [], parent: curr_fsm, name: state_name, options: options};
					curr_fsm.states[state_name] = state;

					curr_fsm = state;
					curr_tab_level = tab_level + 1;
				} else if(match = line.match(/^(\t+)(.+)->\s*([a-zA-Z0-9_]+)\s*$/)) {
					var tab_level = match[1].length;
					var event = match[2].trim();
					var from_state = curr_fsm.name;
					var to_state = match[3].trim();

					while(curr_tab_level > tab_level) {
						curr_fsm = curr_fsm.parent;
						curr_tab_level--;
					}

					curr_fsm.parent.transitions.push({"on": event, "from": from_state, "to": to_state});
					curr_tab_level = tab_level;
				} else if(match = line.match(/^\(([a-zA-Z0-9,\s]*)\)/)) {
					root_fsm.options = match[1];
				}
			}
		} else if(match = line.match(/@(\w+):\s*OBJ\s*\(\s*$/)) {
			var var_name = match[1];
			var obj = objs[var_name] = {type: "obj", fsm: null, props: {}};
			i++;
			for(; i<len; i++) {
				line = lines[i];
				if(match = line.match(/^\)$/)) {
					break;
				} else if(match = line.match(/FSM:\s*@([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_, ]+)\)/)) {
					var fsm_name = match[1];
					var fsm_template = objs[fsm_name];
					var state_names = match[2];
					state_names = _.map(state_names.split(","), function(state_name) {
						return state_name.trim();
					});

					obj.fsm = fsm_template;
					obj.states = state_names;
				} else if(match = line.match(/^\s*([a-zA-Z0-9_]+)\s*:(.+)$/)) {
					var prop_name = match[1];
					var cells = match[2];
					cells = _.map(cells.split(";"), function(cell) {
						return cell.trim();
					});
					obj.props[prop_name] = cells;
				}
			}
		}
	}

	var create_statechart = function(obj) {
		var statechart = red.create_statechart();
		_.forEach(obj.states, function(state, state_name) {
			var sc = create_statechart(state);
			statechart.add_state(state_name, sc);
			if(_.isString(state.options) && state.options.indexOf("start") >= 0) {
				statechart.starts_at(sc);
			}
		});
		if(_.isString(state.options) && state.options.indexOf("concurrent") >= 0) {
			statechart.concurrent(true);
		}

		_.forEach(obj.transitions, function(transition) {
			statechart.add_transition(transition.from, transition.to, red.create_event("parsed", transition.on));
		});
		return statechart;
	};

	var translated_objects = {};
	_.forEach(objs, function(obj, key) {
		if(obj.type === "fsm") {
//			translated_objects[key] = create_statechart(obj);
		} else if(obj.type === "obj") {
			var red_obj = red.create_object();
			var statechart = create_statechart(obj.fsm);
			var cloned_statechart = statechart.clone(red_obj);
			red_obj.use_statechart(cloned_statechart, "own");
			translated_objects[key] = red_obj;

			var states = _.map(obj.states, function(state_name) {
				if(state_name === "INIT") {
					return red_obj.get_statechart().get_state_with_name("INIT");
				} else {
					return cloned_statechart.get_state_with_name(state_name);
				}
			});

			_.forEach(obj.props, function(cells, prop_name) {
				red_obj.add_prop(prop_name);
				var prop = red_obj.find_prop(prop_name);
				_.forEach(cells, function(cell_text, index) {
					var state = states[index];

					var match = cell_text.match(/^@([A-Za-z_\$][A-Za-z_\$0-9]*)$/);
					if(match) {
						var obj_name = match[1];
						var o = translated_objects[obj_name];
						prop.set_value(state, o);
					} else {
						var cell = red.create_cell(cell_text);
						prop.set_value(state, cell);
					}
				});
			});
		}
	});

	return translated_objects;
};
}(red));
