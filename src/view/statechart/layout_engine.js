(function(red) {
var cjs = red.cjs, _ = red._;

// Constants
var THETA_DEGREES = 45,
	TRANSITION_HEIGHT = 15,
	TRANSITION_MARGIN = 1,
	STATE_NAME_WIDTH = 70,
	STATE_NAME_HEIGHT = TRANSITION_HEIGHT,
	STATE_PADDING_Y = TRANSITION_MARGIN, 
	STATE_PADDING_X = 8;

var THETA_RADIANS = THETA_DEGREES * Math.PI / 180,
	TAN_THETA = Math.tan(THETA_RADIANS);

var FAKE_ROOT_STATECHART = {
		hash: function() {
					return "null";
				},
		get_incoming_transitions: function() {
					return [];
				},
		id: function() {
					return "FAKE";
				},
		is_initialized: function() { return true; }
	};

red.RootStatechartLayoutEngine = function(statecharts) {
	this.statecharts = statecharts;
};
(function(my) {
	var proto = my.prototype;

	proto.get_statechart_tree = function() {
		var expand_node = function(node) {
			var sc = node.statechart;
			if(sc.is_initialized()) {
				node.children = _.map(sc.get_substates(), function(x) {
					var subnode = {statechart: x};
					expand_node(subnode);
					return subnode;
				});
			} else {
				node.children = [];
			}
		};
		var curr_node = {statechart: FAKE_ROOT_STATECHART , children: _.map(this.statecharts, function(sc) {
			var node = {statechart: sc};
			expand_node(node);
			return node;
		})};
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

			if(statechart.is_initialized()) {
				var incoming_transitions = statechart.get_incoming_transitions();
				_.each(incoming_transitions, function(t) {
					if(!t.is_initialized()) {
						return;
					}
					var x = t.from();
					if(x instanceof red.StartState) {
						from_to.push({min_x: li, max_x: li, type: "start", transition: t});
					} else if(x === statechart) {
						from_to.push({min_x: ri, max_x: ri, type: "self", transition: t});
					} else {
						var x_indicies = col_indicies.get(x);
						var min_x, max_x, type;
						if(statechart.order(x) < 0) {
							min_x = x_indicies.r;
							max_x = li;
							type = "right";
						} else {
							min_x = ri;
							max_x = x_indicies.l;
							type = "left";
						}
						from_to.push({ min_x: min_x, max_x: max_x, type: type, transition: t });
					}
				});
			}

			_.each(node.children, collect_from_to);
		};
		collect_from_to(sc_tree);

		_.each(from_to, function(info) {
			var from = info.min_x,
				to = info.max_x;

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

// FOR DEBUGGING
/*
		_.each(this.statecharts, function(statechart) {
			statechart.print();
		});
		var curr_element, curr_element_start_col;
		for(var i = rows.length-1; i>=0; i--) {
			var row = rows[i];
			var row_arr = [];
			for(var j = 0; j<=row.length; j++) {
				if(row[j] !== curr_element) {
					if(curr_element) {
						var col_length = j - curr_element_start_col;
						var cl_2 = Math.floor(col_length/2);
						var id = "-" + uid.strip_prefix(curr_element.id());
						while(id.length < 4) {
							id += "-";
						}
						for(var k = curr_element_start_col; k<j; k++) {
							if(k === curr_element_start_col + cl_2) {
								row_arr[k] = id;
							} else {
								row_arr[k] = "----";
							}
						}
						row_arr[curr_element_start_col] = "|" + row_arr[curr_element_start_col].slice(1);
						row_arr[j-1] = row_arr[j-1].slice(0, 3) + "|";
					}
					curr_element_start_col = j;
					curr_element = row[j];
				}
				if(!curr_element) {
					row_arr[j] = "    ";
				}
			}
			var row_str = row_arr.join("");
			console.log(row_str);
			curr_element = false;
		}

/**/
		// So far, we have poles for each state's left transitions, the state itself, and its right transitions.
		// Now, we have to figure out how far to spread each state's left poles

		var location_info_map = new Map({
			hash: "hash"
		});

		var y = 0;
		var column_widths = [];
		var num_rows = rows.length;

		var H = TRANSITION_HEIGHT + 2 * TRANSITION_MARGIN; 

		var dy = H/2;
		var dx =  dy / TAN_THETA;

		var x = dx;

		var is_from, is_to;
		for(var i = 0; i<columns.length; i++) {
			var column = columns[i];
			var state = column.state;
			if(column.lr === "l" || column.lr === "r") { //it's a transition pole
				var column_values = _.pluck(rows, i);

				if(column.lr === "l") {
					x += STATE_PADDING_X/2;
					y = H * (num_rows - column_values.length + 1) + H/2;

					var wing_start_x, wing_start_y;
					var found_relevant_transition = false;
					for(var row = column_values.length-1; row>=column.depth; row--) {
						var cell = column_values[row];

						//if(found_relevant_transition) {x += dx; y += dy; }
						if(cell === state) {
							if(!found_relevant_transition) {
								wing_start_x = x - dx;
								wing_start_y = y - dy;
							}
							break;
						} else {
							if(cell instanceof red.StatechartTransition) {
								is_from = cell.from() === state;
								is_to = cell.to() === state;
								if(is_from || is_to) {
									var to_continue = false;
									if(!found_relevant_transition) {
										found_relevant_transition = true;
										wing_start_x = x - H/2;
										wing_start_y = y - H/2;
										to_continue = true;
									}
									var location_info = location_info_map.get_or_put(cell, function() { return {}; });

									if(is_from && is_to) {
										location_info.from = location_info.to = {x: x, y: y};
									} else if(is_from) {
										location_info.from = {x: x, y: y};
									} else { // includes start state
										location_info.to = {x: x, y: y};
									}
								}
							}

						}
						if(found_relevant_transition) {x += 2 * dx; }
						y += H;
					}

					var location_info = {};
					location_info.left_wing_start = { x: wing_start_x, y: wing_start_y };
					location_info.left_wing_end = { x: x, y: y };
					location_info_map.put(state, location_info);

				} else {
					var found_state;
					y = H * (num_rows - column.depth) + H/2;
					var wing_start_x = x, wing_start_y = y, wing_end_x = x + dx, wing_end_y = y - dy;
					for(var row = column.depth; row < column_values.length; row++) {
						var cell = column_values[row];
						if(cell === state) {
							wing_start_x = x;
							wing_start_y = y;
						} else if(cell instanceof red.StatechartTransition) {
							x += 2*dx;
							is_from = cell.from() === state;
							is_to = cell.to() === state;
							if(is_from || is_to) {

								wing_end_x = x + dx;
								wing_end_y = y - dy;

								var location_info = location_info_map.get_or_put(cell, function() { return {}; });

								if(is_from && is_to) {
									location_info.from = location_info.to = {x: x, y: y};
								} else if(is_from) {
									location_info.from = {x: x, y: y};
								} else { // includes start state
									location_info.to = {x: x, y: y};
								}
							}
						}
						y -= H;
					}
					var location_info = location_info_map.get(state);
					location_info.right_wing_start = { x: wing_start_x, y: wing_start_y };
					location_info.right_wing_end = { x: wing_end_x, y: wing_end_y };

					x += STATE_PADDING_X/2;
				}
			} else {
				if(state === FAKE_ROOT_STATECHART) {
					x += 2*STATE_PADDING_X;
				} else if(_.indexOf(this.statecharts, state) >= 0) {
					x += STATE_PADDING_X;
					y = H * (num_rows - column.depth) + H/2;
					var location_info = location_info_map.get(state);
					location_info.center = { x: x, y: y };
					x += STATE_PADDING_X;
				} else {
					x+= STATE_NAME_WIDTH/2;
					y = H * (num_rows - column.depth) + H/2;
					var location_info = location_info_map.get(state);
					location_info.center = { x: x, y: y };
					x+= STATE_NAME_WIDTH/2;
				}
			}
		}

		return location_info_map;
	};
}(red.RootStatechartLayoutEngine));
}(red));
