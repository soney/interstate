(function(red) {
var cjs = red.cjs, _ = red._;

// Constants
var THETA_DEGREES = 30,
	TRANSITION_HEIGHT = 15,
	TRANSITION_MARGIN = 1,
	STATE_NAME_WIDTH = 70,
	STATE_NAME_HEIGHT = TRANSITION_HEIGHT,
	STATE_PADDING = 2; // each side

var THETA_RADIANS = THETA_DEGREES * Math.PI / 180,
	TAN_THETA = Math.tan(THETA_RADIANS);

red.RootStatechartLayoutEngine = function(statecharts) {
	this.statechart = statechart;
};
(function(my) {
	var proto = my.prototype;

	proto.get_statechart_tree = function() {
		var curr_node = {statechart: this.statechart};
		var expand_node = function(node) {
			var sc = node.statechart;
			node.children = _.map(sc.get_substates(), function(x) {
				var subnode = {statechart: x};
				expand_node(subnode);
				return subnode;
			});
		};
		expand_node(curr_node);
		return curr_node;
	};

	proto._compute_layout = function() {
		var sc_tree = this.get_statechart_tree();
		var rows = [];
		var columns = [];

		var col_indicies = new Map({
			hash: "hash"
		});
		var depth = 0;
		var push_node_columns = function(node, depth) {
			var statechart = node.statechart;
			var children = node.children;
			var children_split_index = Math.ceil(children.length/2);

			var li = columns.length;
			columns.push({ state: statechart, lr: "l", depth: depth});

			_.each(children.slice(0, children_split_index), function(childnode) {
				push_node_columns(childnode, depth+1);
			});

			var ci = columns.length;
			columns.push({ state: statechart, lr: "c", depth: depth});

			_.each(children.slice(children_split_index), function(childnode) {
				push_node_columns(childnode, depth+1);
			});

			var ri = columns.length;
			columns.push({ state: statechart, lr: "r", depth: depth});

			col_indicies.put(statechart, {l: li, r: ri });
			var row;
			if(rows[depth]) {
				row = rows[depth];
			} else {
				rows[depth] = row = [];
			}
			for(var i = li; i<=ri; i++) {
				row[i] = statechart;
			}
		};
		push_node_columns(sc_tree, 0);

		var from_to = [];
		var collect_from_to = function(node) {
			var statechart = node.statechart,
				indicies = col_indicies.get(statechart);
				li = indicies.l,
				ri = indicies.r;

			var incoming_transitions = statechart.get_incoming_transitions();
			var targets_from_to = _.map(incoming_transitions, function(t) {
				var x = t.from();
				if(x instanceof red.StartState) {
					return {from: li, to: li, transition: t};
				} else if(x === statechart) {
					return {from: ri, to: ri};
				} else {
					var x_indicies = col_indicies.get(x);
					if(statechart.order(x) < 0) {
						return {from: x_indicies.r, to: li, transition: t };
					} else {
						return {from: ri, to: x_indicies.l, transition: t };
					}
				}
			});
			from_to.push.apply(from_to, targets_from_to);
			_.each(node.children, collect_from_to);
		};
		collect_from_to(sc_tree);

		_.each(from_to, function(info) {
			var from = info.from,
				to = info.to;

			var has_enough_space;
			var curr_row = false;
			var row_index;
			for(var i = 0; i<rows.length; i++) {
				has_enough_space = true;
				var row = rows[i];
				for(var j = from; j<=to; j++) {
					if(row[j]) {
						has_enough_space = false;
						break;
					}
				}
				if(has_enough_space) {
					curr_row = rows[i];
					row_index = i;
					break;
				}
			}
			if(!curr_row) {
				curr_row = []
				row_index = rows.length;
				rows.push(curr_row);
			}

			var transition = info.transition
			for(var i = from; i<=to; i++) {
				curr_row[i] = transition;
			}
		});


		// So far, we have poles for each state's left transitions, the state itself, and its right transitions.
		// Now, we have to figure out how far to spread each state's left poles

		var location_info_map = new Map({
			hash: "hash"
		});

		var x = 0;
		var y = 0;
		var column_widths = [];
		var num_rows = rows.length;
		for(var i = 0; i<columns.length; i++) {
			var column = columns[i];
			var state = column.state;
			if(column.lr === "l" || column.lr === "r") { //it's a transition pole
				var transitions = _	.chain(rows)
									.pluck(i)
									.filter(function(x) {
										return x instanceof red.StatechartTransition;
									})
									.value();
				
				var dy = TRANSITION_MARGIN + TRANSITION_HEIGHT/2;
				if(column.lr === "l") {
					y = (num_rows - column.depth) * STATE_NAME_HEIGHT - 2 * dy * transitions.length;
					transitions.reverse();
				} else {
					y = (num_rows - column.depth) * STATE_NAME_HEIGHT;
				}

				var init_x = x,
					init_y = y;

				for(var j = 0; j<transitions.length; j++) {
					var transition = transitions[j];
					if(column.lr === "l") { y += dy; } else { y -= dy; }
					x += dy / TAN_THETA;
					if(location_info_map.has(transition)) {
						var prop_name = transition.from() === state ? "from" : "to";
						var location_info = location_info_map.get(transition);
						location_info[prop_name] = {x: x, y: y};
					} else {
						if(transition.from() === transition.to()) {
							location_info_map.put(transition, {from: {x: x, y: y}, to: {x: x, y: y}});
						} else {
							var tfrom = transition.from();
							var prop_name;
							if(tfrom instanceof red.StartState) {
								prop_name = "to";
							} else {
								prop_name = transition.from() === state ? "from" : "to";
							}
							var info = {};
							info[prop_name] = {x: x, y: y};
							location_info_map.put(transition, info);
						}
					}
					if(column.lr === "l") { y += dy; } else { y -= dy; }
					x += dy / TAN_THETA;
				}

				if(column.lr === "l") {
					var location_info = {};
					location_info.left_wing_start = { x: init_x, y: init_y };
					location_info.left_wing_end = { x: x, y: y };
					location_info_map.put(state, location_info);
				} else {
					var location_info = location_info_map.get(state);
					location_info.right_wing_start = { x: init_x, y: init_y };
					location_info.right_wing_end = { x: x, y: y };
				}
			} else {
				x+= STATE_NAME_WIDTH/2;
				y = (num_rows - column.depth) * STATE_NAME_HEIGHT;
				var location_info = location_info_map.get(state);
				location_info.center = { x: x, y: y };
				x+= STATE_NAME_WIDTH/2;
			}
		}

		return location_info_map;
	};
}(red.RootStatechartLayoutEngine));
}(red));
