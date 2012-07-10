(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;
red.parse_table = function(table_str) {
	var lines = table_str.split("\n");
	var i, len = lines.length;
	var match, line;

	var objs = {};

	for(i = 0; i<len; i++) {
		line = lines[i];
		if(match = line.match(/@(\w+):\s*FSM\s*\(\s*$/)) {
			var var_name = match[1];

			var fsm = objs[var_name] = {type: "fsm", states: [], transitions: []};

			var from_state;
			i++;
			for(; i<len; i++) {
				line = lines[i];
				if(match = line.match(/^\)$/)) {
					break;
				} else if(match = line.match(/states:\s*([a-zA-Z0-9_, ]+)$/)) {
					var state_names = match[1];
					state_names = _.map(state_names.split(","), function(state_name) {
						return state_name.trim();
					});
					fsm.states = state_names;
				} else if(match = line.match(/start:\s*(\w+)$/)) {
					var start_state = match[1];
					fsm.start_state = start_state;
				} else if(match = line.match(/in (\w+)$/)) {
					from_state = match[1];
				} else if(match = line.match(/(.+)->\s*([a-zA-Z0-9_]+)\s*$/)) {
					var event = match[1].trim();
					var to_state = match[2].trim();
					fsm.transitions.push({"on": event, "from": from_state, "to": to_state});
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

	console.log(objs);
};
}(red));
