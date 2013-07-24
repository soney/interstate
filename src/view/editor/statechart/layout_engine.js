/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,window,RedMap */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var show_all_start_states = red.__debug_statecharts;

	var FAKE_ROOT_STATECHART = {
			hash: function () {
				return "null";
			},
			get_incoming_transitions: function () {
				return [];
			},
			id: function () {
				return "FAKE";
			},
			parent_is_concurrent: function() { return false; },
			is_initialized: function () { return true; },
			basis: function () { return false; }
		};

	red.RootStatechartLayoutEngine = function (options) {
		able.make_this_optionable(this, {
			theta_degrees: 45,
			transition_height: 18,
			transition_margin: 1,
			state_name_width: 90,
			state_name_height: function() { return this.option("transition_height"); },
			state_padding_y: function() { return this.option("transition_margin"); },
			state_padding_x: 8,
			add_state_width: 50,
			start_state_width: function() { return this.option("state_name_width"); },
			start_state_radius: 5,
			theta_radians: function() { return this.option("theta_degrees") * Math.PI / 180; },
			tan_theta: function() { return Math.tan(this.option("theta_radians")); },
			transition_width: function() { return this.option("transition_height") / this.option("tan_theta"); },
			state_line_padding_factor: 1/2,
			padding_top: 0,
			statecharts_with_add_state_button: [],
			statecharts: []
		}, options);
		this.$layout = cjs.$(_.bind(this._compute_layout, this));
	};
	(function (My) {
		var proto = My.prototype;

		able.make_proto_optionable(proto);

		proto.destroy = function() {
			able.destroy_this_optionable(this);
			this.$layout.destroy();
			delete this.$layout;
		};

		proto.invalidate = function() {
			this.$layout.invalidate();
		};

		proto.get_statechart_tree = function () {
			var expand_node = function (node, is_root) {
				var sc = node.statechart;
				if (sc instanceof red.Statechart && sc.is_initialized()) {
					var substates = sc.get_substates();

					if(_.size(substates) > 0 || is_root || show_all_start_states) { // use is_root for root statecharts with only a start state
						if(!sc.is_concurrent() || show_all_start_states) {
							node.children.push({statechart: sc.get_start_state(), children: []});
						}
						node.children.push.apply(node.children, _.map(substates, function (x) {
							var subnode = {statechart: x, children: []};
							expand_node(subnode);
							return subnode;
						}));
					}
				}
			};
			var curr_node = {statechart: FAKE_ROOT_STATECHART, children: _.map(this.option("statecharts"), function (sc) {
				var node = {statechart: sc, children: []};
				expand_node(node, true);
				return node;
			}, this)};
			return curr_node;
		};

		proto.get_x = function (state_wrapper) {
			var full_layout_info = this.get_layout();
			if (state_wrapper) {
				var id = state_wrapper.cobj_id;
				var layout = full_layout_info.locations;
				var keys = _.map(layout.keys(), function (x) { return x.puppet_master_id || x.id() || -1; }),
					values = layout.values();

				var i = _.indexOf(keys, id);
				var layout_info = values[i];
				if (layout_info) {
					if (state_wrapper.type() === "statechart") {
						return layout_info.center.x;
					} else if (state_wrapper.type() === "transition") {
						return layout_info.from.x;
					} else if(state_wrapper.type() === "start_state") {
						return layout_info.center.x;
					}
				}
			} else {
				return full_layout_info.width;
			}
		};
		proto.total_width = function () {
			var full_layout_info = this.get_layout();
			return full_layout_info.width;
		};

		proto.get_width = function (state_wrapper) {
			if (state_wrapper.type() === "statechart") {
				return this.option("state_name_width");
			} else if (state_wrapper.type() === "transition") {
				return this.option("transition_width");
			} else if (state_wrapper.type() === "start_state") {
				return this.option("start_state_width");
			}
			return 0;
		};

		proto.get_layout = function () {
			return this.$layout.get();
		};

		proto._compute_layout = function () {
			var THETA_DEGREES = this.option("theta_degrees"),
				TRANSITION_HEIGHT = this.option("transition_height"),
				TRANSITION_MARGIN = this.option("transition_margin"),
				STATE_NAME_WIDTH = this.option("state_name_width"),
				STATE_NAME_HEIGHT = this.option("state_name_height"),
				STATE_PADDING_Y = this.option("state_padding_y"),
				STATE_PADDING_X = this.option("state_padding_x"),
				ADD_STATE_WIDTH = this.option("add_state_width"),
				START_STATE_WIDTH = this.option("start_state_width"),
				THETA_RADIANS = this.option("theta_radians"),
				TAN_THETA = this.option("tan_theta"),
				TRANSITION_WIDTH = this.option("transition_width"),
				STATE_LINE_PADDING_FACTOR = this.option("state_line_padding_factor"),
				START_STATE_RADIUS = this.option("start_state_radius"),
				PADDING_TOP = this.option("padding_top");

			var sc_tree = this.get_statechart_tree();
			var rows = [];
			var columns = [];
			var i, j;

			var col_indicies = new RedMap({
				hash: "hash"
			});
			var depth = 0;
			var push_node_columns = function (node, depth) {
				var statechart = node.statechart;
				var children = node.children;
				var children_split_index = children.length;// Math.ceil(children.length / 2);

				var col_len = columns.length;
				var li, ri;
				if (statechart instanceof red.StartState) {
					columns.push({ state: statechart, lr: "c", depth: depth + 1});
					col_indicies.put(statechart, {c: col_len});
					li = ri = col_len;
				} else {
					li = col_len;
					columns.push({ state: statechart, lr: "l", depth: depth});

					_.each(children.slice(0, children_split_index), function (childnode) {
						push_node_columns(childnode, depth + 1);
					});

					var ci = columns.length;
					columns.push({ state: statechart, lr: "c", depth: depth});

					_.each(children.slice(children_split_index), function (childnode) {
						push_node_columns(childnode, depth + 1);
					});

					ri = columns.length;
					columns.push({ state: statechart, lr: "r", depth: depth});

					col_indicies.put(statechart, {l: li, r: ri });
				}

				var row;
				if (rows[depth]) {
					row = rows[depth];
				} else {
					rows[depth] = row = [];
				}
				for (i = li; i <= ri; i += 1) {
					row[i] = statechart;
				}
			};
			push_node_columns(sc_tree, 0);

			var from_to = [];
			var collect_from_to = function (node) {
				var statechart = node.statechart,
					indicies = col_indicies.get(statechart);

				var li, ri;
				if(statechart instanceof red.StartState) {
					li = ri = indicies.c;
				} else {
					li = indicies.l;
					ri = indicies.r;
				}

				if (statechart.is_initialized()) {
					var incoming_transitions;

					if(statechart.parent_is_concurrent() && !red.__debug_statecharts) {
						incoming_transitions = [];
					} else {
						incoming_transitions = statechart.get_incoming_transitions();
					}

					_.each(incoming_transitions, function (t) {
						if (!t.is_initialized()) {
							return;
						}
						var x = t.from();
						if (x === statechart) {
							from_to.push({min_x: ri, max_x: ri, type: "self", transition: t});
						} else {
							if(x.parent_is_concurrent() && !red.__debug_statecharts) {
								return;
							}

							var x_indicies = col_indicies.get(x);
							var min_x, max_x, type;
							if (statechart.order(x) < 0) {
								min_x = _.has(x_indicies, "r") ? x_indicies.r : x_indicies.c;
								max_x = li;
								type = "right";
							} else {
								min_x = ri;
								max_x = _.has(x_indicies, "l") ? x_indicies.l : x_indicies.c;
								type = "left";
							}
							from_to.push({ min_x: min_x, max_x: max_x, type: type, transition: t });
						}
					});
				}

				_.each(node.children, collect_from_to);
			};
			collect_from_to(sc_tree);

			_.each(from_to, function (info) {
				var from = info.min_x,
					to = info.max_x;

				var has_enough_space;
				var curr_row = false;
				var row_index;
				for (i = 0; i < rows.length; i += 1) {
					has_enough_space = true;
					var row = rows[i];
					for (j = from; j <= to; j += 1) {
						if (row[j]) {
							has_enough_space = false;
							break;
						}
					}
					if (has_enough_space) {
						curr_row = rows[i];
						row_index = i;
						break;
					}
				}
				if (!curr_row) {
					curr_row = [];
					row_index = rows.length;
					rows.push(curr_row);
				}

				var transition = info.transition;
				for (i = from; i <= to; i += 1) {
					curr_row[i] = transition;
				}
			});

	// FOR DEBUGGING
	/*
		if(uid.strip_prefix(this.statecharts[0].id()) == 24) {
			_.each(this.statecharts, function (statechart) {
				try {
				statechart.print();
				}
				catch(e) {}
			});
			var curr_element, curr_element_start_col;
			for (i = rows.length - 1; i >= 0; i -= 1) {
				row = rows[i];
				var row_arr = [];
				for (j = 0; j <= row.length; j += 1) {
					if (row[j] !== curr_element) {
						if (curr_element) {
							var col_length = j - curr_element_start_col;
							var cl_2 = Math.floor(col_length / 2);
							var id = "-" + uid.strip_prefix(curr_element.id());
							while (id.length < 4) {
								id += "-";
							}
							for (var k = curr_element_start_col; k<j; k += 1) {
								if (k === curr_element_start_col + cl_2) {
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
					if (!curr_element) {
						row_arr[j] = "    ";
					}
				}
				var row_str = row_arr.join("");
				console.log(row_str);
				curr_element = false;
			}
		}
			/**/

			// So far, we have poles for each state's left transitions, the state itself, and its right transitions.
			// Now, we have to figure out how far to spread each state's left poles

			var location_info_map = new RedMap({
				hash: "hash"
			});

			var y = PADDING_TOP;
			var column_widths = [];
			var num_rows = rows.length;

			var H = TRANSITION_HEIGHT + 2 * TRANSITION_MARGIN;

			var dy = H / 2;
			var dx =  dy / TAN_THETA;

			var x = dx;

			var is_from, is_to, row, location_info, cell, wing_start_x, wing_start_y, column_values;
			var return_empty_obj = function () { return {}; };
			for (i = 0; i < columns.length; i += 1) {
				var column = columns[i];
				var state = column.state;
				if (column.lr === "l" || column.lr === "r") { //it's a transition pole
					column_values = _.pluck(rows, i);

					if (column.lr === "l") {
						x += STATE_PADDING_X / 2;
						y = PADDING_TOP + H * (num_rows - column_values.length + 1) + (H / 2);

						var found_relevant_transition = false;
						for (row = column_values.length - 1; row >= column.depth; row -= 1) {
							cell = column_values[row];

							//if (found_relevant_transition) {x += dx; y += dy; }
							if (cell === state) {
								if (!found_relevant_transition) {
									wing_start_x = x - dx * STATE_LINE_PADDING_FACTOR;
									wing_start_y = y - dy * STATE_LINE_PADDING_FACTOR;
								}
								break;
							} else {
								if (cell instanceof red.StatechartTransition) {
									is_from = cell.from() === state;
									is_to = cell.to() === state;
									if (is_from || is_to) {
										var to_continue = false;
										if (!found_relevant_transition) {
											found_relevant_transition = true;
											wing_start_x = x - dx * STATE_LINE_PADDING_FACTOR;
											wing_start_y = y - dy * STATE_LINE_PADDING_FACTOR;
											to_continue = true;
										}
										location_info = location_info_map.get_or_put(cell, return_empty_obj);

										if (is_from && is_to) {
											location_info.from = location_info.to = {x: x, y: y};
										} else if (is_from) {
											location_info.from = {x: x, y: y};
										} else { // includes start state
											location_info.to = {x: x, y: y};
										}
									}
								}

							}
							if (found_relevant_transition) {x += 2 * dx; }
							y += H;
						}

						location_info = {};
						location_info.left_wing_start = { x: wing_start_x, y: wing_start_y };
						location_info.left_wing_end = { x: x, y: y };
						location_info_map.put(state, location_info);
					} else {
						var found_state;
						y = PADDING_TOP + H * (num_rows - column.depth) + H / 2;
						wing_start_x = x;
						wing_start_y = y;
						var wing_end_x = x + dx * STATE_LINE_PADDING_FACTOR,
							wing_end_y = y - dy * STATE_LINE_PADDING_FACTOR;

						var last_relevant_transition_index = -1;
						for (row = column_values.length - 1; row >= column.depth; row -= 1) {
							cell = column_values[row];
							if (cell instanceof red.StatechartTransition && (cell.from() === state || cell.to() === state)) {
								last_relevant_transition_index  = row;
								break;
							}
						}
						for (row = column.depth; row < column_values.length; row += 1) {
							cell = column_values[row];
							if (cell === state) {
								wing_start_x = x;
								wing_start_y = y;
							} else {
								if (cell instanceof red.StatechartTransition) {
									is_from = cell.from() === state;
									is_to = cell.to() === state;
									if (is_from || is_to) {
										wing_end_x = x + dx * STATE_LINE_PADDING_FACTOR;
										wing_end_y = y - dy * STATE_LINE_PADDING_FACTOR;

										location_info = location_info_map.get_or_put(cell, return_empty_obj);

										if (is_from && is_to) {
											location_info.from = location_info.to = {x: x, y: y};
										} else if (is_from) {
											location_info.from = {x: x, y: y};
										} else { // includes start state
											location_info.to = {x: x, y: y};
										}
									}
								}
							}
							if (row <= last_relevant_transition_index) { x += 2 * dx; }
							y -= H;
						}
						location_info = location_info_map.get(state);
						location_info.right_wing_start = { x: wing_start_x, y: wing_start_y };
						location_info.right_wing_end = { x: wing_end_x, y: wing_end_y };

						x += STATE_PADDING_X / 2;
						if (_.indexOf(this.option("statecharts_with_add_state_button"), state) >= 0) {
							x += ADD_STATE_WIDTH / 2;
							location_info.add_state_button_x = x;
							x += ADD_STATE_WIDTH / 2;
							location_info.right_wing_end.x += ADD_STATE_WIDTH;
							location_info.right_wing_start.x += ADD_STATE_WIDTH;
						}
					}
				} else {
					if (state === FAKE_ROOT_STATECHART) {
						x += STATE_PADDING_X;
					} else if (_.indexOf(this.option("statecharts"), state) >= 0) {
						//x += STATE_PADDING_X/2;
						y = PADDING_TOP + H * (num_rows - column.depth) + H / 2;
						location_info = location_info_map.get(state);
						location_info.center = { x: x, y: y };
						//x += STATE_PADDING_X/2;
					} else if (state instanceof red.StartState) {
						x += START_STATE_WIDTH / 2;
						y = PADDING_TOP + H * (num_rows - column.depth) + H / 2;
						location_info_map.put(state, { center: { x: x, y: y } });

						column_values = _.pluck(rows, i);

						for (row = column_values.length - 1; row >= column.depth; row -= 1) {
							cell = column_values[row];
							if (cell instanceof red.StatechartTransition && (cell.from() === state || cell.to() === state)) {
								is_from = cell.from() === state;
								is_to = cell.to() === state;

								location_info = location_info_map.get_or_put(cell, return_empty_obj);
								if (is_from && is_to) {
									location_info.from = location_info.to = {x: x, y: y};
								} else {
									if (is_from) {
										location_info.from = {x: x, y: y};
									} else { // includes start state
										location_info.to = {x: x, y: y};
									}
								}
							}
						}

						x += START_STATE_WIDTH / 2;
					} else {
						x += STATE_NAME_WIDTH / 2;
						y = PADDING_TOP + H * (num_rows - column.depth) + H / 2;
						location_info = location_info_map.get(state);
						location_info.center = { x: x, y: y };
						x += STATE_NAME_WIDTH / 2;
					}
				}
			}

			var width = x;
			var height = PADDING_TOP + (num_rows - 1) * H;

			return {width: width, height: height, locations: location_info_map};
		};
	}(red.RootStatechartLayoutEngine));
}(red));
