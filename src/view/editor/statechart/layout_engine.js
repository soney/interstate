/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window,RedMap */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var show_all_start_states = ist.__debug_statecharts;

	var FAKE_ROOT_STATECHART = {
			id: "FAKE",
			outgoingTransitions: [],
			incomingTransitions: []
		};

	var NO_INDENT = 0,
		INDENT_AFTER = 1,
		INDENT_BEFORE = 2,
		INDENT_BOTH = 3;
	

	ist.RootStatechartLayoutEngine = function (options) {
		able.make_this_optionable(this, {
			theta_degrees: 45,
			transition_height: 18,
			transition_margin: 1,
			used_state_name_width: 90,
			unused_state_name_width: 20,
			state_name_height: function() { return this.option("transition_height"); },
			state_padding_y: function() { return this.option("transition_margin"); },
			state_padding_x: 8,
			add_state_width: 50,
			used_start_state_width: function() { return this.option("used_state_name_width"); },
			unused_start_state_width: function() { return this.option("unused_state_name_width"); },
			start_state_radius: 6,
			theta_radians: function() { return this.option("theta_degrees") * Math.PI / 180; },
			tan_theta: function() { return Math.tan(this.option("theta_radians")); },
			transition_width: function() { return this.option("transition_height") / this.option("tan_theta"); },
			state_line_padding_factor: 1/2,
			padding_top: 0,
			collapseUnusedTransitions: true,
			indentIncomingTransitions: false,
			stateMachineSummary: false 
		}, options);

		this.$stateMachineSummary = this.option("stateMachineSummary");
		this.$layout = cjs(_.bind(this._compute_layout, this));
	};
	(function (My) {
		var proto = My.prototype;

		My.INVISIBLE_DISPLAY_TYPE = "invisible",
		My.HRANGE_DISPLAY_TYPE = "hrange",
		My.STARTSTATE_DISPLAY_TYPE = "start",
		My.STATE_DISPLAY_TYPE = "state",
		My.TRANSITION_DISPLAY_TYPE = "transition";

		able.make_proto_optionable(proto);

		proto.destroy = function() {
			able.destroy_this_optionable(this);
			this.$layout.destroy();
			delete this.$layout;
		};

		proto.invalidate = function() {
			this.$layout.invalidate();
		};

		proto.get_statechart_tree = function (sc_summary) {
			var expand_node = function (node, is_root) {
				var sc = node.sc_summary;
				if (!sc.isStart) {
					var substates = sc.substates;

					if(_.size(substates) > 1 || is_root || show_all_start_states) { // use is_root for root statecharts with only a start state
						node.children.push.apply(node.children, _.compact(_.map(substates, function (x, name) {
							var subnode = {sc_summary: x, children: [], parent: node};
							expand_node(subnode);
							return subnode;
						})));
					}
				}
			};
			var curr_node = {
				sc_summary: FAKE_ROOT_STATECHART,
				children: _	.chain(sc_summary)
							.map(function (sc) {
								var node = {sc_summary: sc, children: []};
								expand_node(node, true);
								return node;
							}, this)
							.compact()
							.value(),
				parent: false
			};

			return curr_node;
		};

		proto.get_x = function (state_wrapper) {
			var full_layout_info = this.get_layout();
			if (state_wrapper) {
				var id = state_wrapper.cobj_id,
					layout_info = full_layout_info.locations[id];

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
				return this.option("used_state_name_width");
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
			var stateMachineSummary = this.$stateMachineSummary.get();
			if(!stateMachineSummary || stateMachineSummary.length === 0) {
				return {width: 0, height: 0, locations: {}};
			}

			var THETA_DEGREES = this.option("theta_degrees"),
				TRANSITION_HEIGHT = this.option("transition_height"),
				TRANSITION_MARGIN = this.option("transition_margin"),
				USED_STATE_NAME_WIDTH = this.option("used_state_name_width"),
				UNUSED_STATE_NAME_WIDTH = this.option("unused_state_name_width"),
				STATE_NAME_HEIGHT = this.option("state_name_height"),
				STATE_PADDING_Y = this.option("state_padding_y"),
				STATE_PADDING_X = this.option("state_padding_x"),
				ADD_STATE_WIDTH = this.option("add_state_width"),
				USED_START_STATE_WIDTH = this.option("used_start_state_width"),
				UNUSED_START_STATE_WIDTH = this.option("unused_start_state_width"),
				THETA_RADIANS = this.option("theta_radians"),
				TAN_THETA = this.option("tan_theta"),
				TRANSITION_WIDTH = this.option("transition_width"),
				STATE_LINE_PADDING_FACTOR = this.option("state_line_padding_factor"),
				START_STATE_RADIUS = this.option("start_state_radius"),
				PADDING_TOP = this.option("padding_top"),
				statecharts_with_add_state_button = stateMachineSummary[0],
				ROW_HEIGHT = this.option("transition_height");

			var sc_tree = this.get_statechart_tree(stateMachineSummary),
				state_wings = {},
				rows = [],
				col = 0;

			var push_node_columns = function (node, depth) {
				var sc_summary = node.sc_summary,
					id = sc_summary.id,
					isStart = !!sc_summary.isStart,
					outgoingTransitions = sc_summary.outgoingTransitions,
					info = (state_wings[id] = {type:"state", sc_summary: sc_summary, rowNum: depth, isAtomic: isStart});

				if(isStart) {
					_.extend(info, {
						centerColumn: col++,
						columnTransitions: {
							outgoing: {
								used: [],
								notUsed: []
							},
							incoming: []
						},
					});
				} else {
					var children = node.children,
						leftmostColumn = col++,
						centerColumn,
						rightmostColumn;

					_.each(children, function (childnode) {
						push_node_columns(childnode, depth + 1);
					});

					centerColumn = col++;
					rightmostColumn = col++;

					_.extend(info, {
						leftmostColumn: leftmostColumn,
						centerColumn: centerColumn,
						rightmostColumn: rightmostColumn,
						leftColumnTransitions: {
							outgoing: {
								used: [],
								notUsed: []
							},
							incoming: []
						},
						rightColumnTransitions: {
							outgoing: {
								used: [],
								notUsed: []
							},
							incoming: []
						}
					});
				}

				if (rows[depth]) {
					rows[depth].push(info);
				} else {
					rows[depth] = [info];
				}
			};
			push_node_columns(sc_tree, 0);

			_.each(state_wings, function(fromStateWing) {
				var sc_summary = fromStateWing.sc_summary,
					outgoingTransitions = sc_summary.outgoingTransitions,
					fromCenterColumn = fromStateWing.centerColumn,
					atomic = fromStateWing.isAtomic;

				_.each(outgoingTransitions, function(transition) {
					var usedByAnyProperties = transition.usedByAnyProperties,
						toStateClient = transition.to,
						toStateID = toStateClient.cobj_id,
						toStateWing = state_wings[toStateID],
						toCenterColumn = toStateWing.centerColumnn,
						columnTransitions, transitionTypeArr,
						fromColumn, toColumn, toCenterColumn = toStateWing.centerColumn;

					if(atomic) {
						columnTransitions = fromStateWing.columnTransitions.outgoing;
						fromColumn = fromStateWing.centerColumn;
					} else {
						if(toCenterColumn === fromCenterColumn) {
							columnTransitions = fromStateWing.rightColumnTransitions.outgoing;
							fromColumn = fromStateWing.rightmostColumn;
						} else if(fromCenterColumn > toCenterColumn) {
							columnTransitions = fromStateWing.leftColumnTransitions.outgoing;
							fromColumn = fromStateWing.leftmostColumn;
						} else {
							columnTransitions = fromStateWing.rightColumnTransitions.outgoing;
							fromColumn = fromStateWing.rightmostColumn;
						}
					}

					if(usedByAnyProperties) {
						transitionTypeArr = columnTransitions.used;
					} else {
						transitionTypeArr = columnTransitions.notUsed;
					}
					var transition_info = {
							type:"transition",
							transition_summary: transition,
							fromStateWing: fromStateWing,
							toStateWing: toStateWing,
						};
					transitionTypeArr.push(transition_info);

					if(toStateWing.isAtomic) {
						toStateWing.columnTransitions.incoming.push(transition_info);
						toColumn = toCenterColumn;
					} else {
						if(toCenterColumn>fromCenterColumn) {
							toStateWing.leftColumnTransitions.incoming.push(transition_info);
							toColumn = toStateWing.leftmostColumn;
						} else {
							toStateWing.rightColumnTransitions.incoming.push(transition_info);
							toColumn = toStateWing.rightmostColumn;
							debugger;
						}
					}

					_.extend(transition_info, {
						fromColumn: fromColumn,
						toColumn: toColumn,
						leftmostColumn: Math.min(fromColumn, toColumn),
						rightmostColumn: Math.max(fromColumn, toColumn)
					});
				});
			});

			function rowHasRoomforTransition(row, transition_info){
				var i = 0, len = row.length, cell, leftWing, rightWing, center,
					minCol = transition_info.leftmostColumn, maxCol = transition_info.rightmostColumn;
				while(i<len) {
					cell = row[i];
					if(cell.type === "state") {
						if(cell.isAtomic) {
							center = cell.centerColumn;
							if(center > minCol && center < maxCol) {
								return false;
							}
						} else {
							leftWing = cell.leftWingColumn;
							rightWing = cell.rightWingColumn;

							if((leftWing > minCol && leftWing < maxCol) || (rightWing > minCol && rightWing < maxCol) ||
								(leftWing > minCol && rightWing < maxCol) || (rightWing > minCol && leftWing < maxCol)) {
								return false;
							}
						}
						return false;
					} else if(cell.type === "transition") {
						leftWing = cell.leftmostColumn;
						rightWing = cell.rightmostColumn;

						if((leftWing >= minCol && leftWing <= maxCol) || (rightWing >= minCol && rightWing <= maxCol) ||
							(leftWing >= minCol && rightWing <= maxCol) || (rightWing >= minCol && leftWing <= maxCol)) {
							return false;
						}
					}
					i++;
				}
				return true;
			}

			_.each(state_wings, function(fromStateWing) {
				var sc_summary = fromStateWing.sc_summary,
					depth = fromStateWing.rowNum,
					row,
					transitions_infos;

				if(fromStateWing.isAtomic) {
					transitions_infos = fromStateWing.columnTransitions.outgoing.used.concat(fromStateWing.columnTransitions.outgoing.notUsed);
				} else {
					transitions_infos = fromStateWing.leftColumnTransitions.outgoing.used.concat(
															fromStateWing.rightColumnTransitions.outgoing.used,
															fromStateWing.leftColumnTransitions.outgoing.notUsed,
															fromStateWing.rightColumnTransitions.outgoing.notUsed
														);
				}

				_.each(transitions_infos, function(transition_info) {
					var row_num = depth;

					while(row_num < rows.length) {
						row = rows[row_num];
						if(rowHasRoomforTransition(row, transition_info)) {
							row.push(transition_info);
							_.extend(transition_info, {
								rowNum: row_num
							});
							return;
						}
						row_num++;
					}

					// not found; create a new row;
					_.extend(transition_info, {
						rowNum: row_num
					});
					row = [transition_info];
					rows[row_num] = row;
				});
			});

			var columnWidths = [],
				TRANSITION_WIDTH = this.option("transition_width");
			_.each(state_wings, function(stateWing) {
				var sc_summary = stateWing.sc_summary,
					depth = stateWing.rowNum,
					centerColumnWidth;

				if(sc_summary.isAtomic) {
					if(sc_summary.usedByAnyProperties) {
						centerColumnWidth = this.option("used_start_state_width");
					} else {
						centerColumnWidth = this.option("unused_start_state_width");
					}
				} else {
					if(sc_summary.usedByAnyProperties) {
						centerColumnWidth = this.option("used_state_name_width");
					} else {
						centerColumnWidth = this.option("unused_state_name_width");
					}
				}

				columnWidths[stateWing.centerColumn] = centerColumnWidth;
				stateWing.centerColumnWidth = centerColumnWidth;

				if(stateWing.isAtomic) {
					_.each(stateWing.columnTransitions.outgoing.used.concat(stateWing.columnTransitions.outgoing.notUsed),
						function(transition) {
							var rowNum = transition.rowNum;
							stateWing.rowNum = rowNum;
						});
					stateWing.ownHeight = stateWing.height = 1;
				} else {
					_.each([stateWing.leftColumnTransitions, stateWing.rightColumnTransitions],
						function(columnTransitions, i) {
							var columnIndex = (i === 0 ? stateWing.leftmostColumn : stateWing.rightmostColumn),
								width = 0;

							var collapseUnusedTransitions = this.option("collapseUnusedTransitions"),
								indentIncomingTransitions = this.option("indentIncomingTransitions"),
								indentations = [],
								overallHighestTransitionRow = false;

							_.each(columnTransitions.outgoing.used, function(transition_info) {
								var rowNum = transition_info.rowNum;

								indentations[rowNum-depth] = INDENT_BOTH;
								width += TRANSITION_WIDTH;
							});

							if(collapseUnusedTransitions) {
								var lowestTransitionRowNum = false,
									highestTransitionRowNum = false;

								_.each(columnTransitions.outgoing.notUsed, function(transition_info) {
									var rowNum = transition_info.rowNum;

									if(lowestTransitionRowNum === false || lowestTransitionRowNum > rowNum) {
										lowestTransitionRowNum = rowNum;
									}
									if(highestTransitionRowNum === false || highestTransitionRowNum < rowNum) {
										highestTransitionRowNum = rowNum;
									}
									indentations[rowNum-depth] = NO_INDENT;
								});

								if(lowestTransitionRowNum !== false && highestTransitionRowNum !== false) {
									width += TRANSITION_WIDTH;
									if(lowestTransitionRowNum === highestTransitionRowNum) {
										indentations[lowestTransitionRowNum-depth] = INDENT_BOTH;
									} else {
										indentations[lowestTransitionRowNum-depth] = INDENT_BEFORE;
										indentations[highestTransitionRowNum-depth] = INDENT_AFTER;
									}
								}
							} else {
								_.each(columnTransitions.outgoing.notUsed, function(transition_info) {
									var rowNum = transition_info.rowNum;

									indentations[rowNum-depth] = INDENT_BOTH;
									width += TRANSITION_WIDTH;
								});
							}

							if(indentIncomingTransitions) {
								_.each(columnTransitions.incoming, function(transition_info) {
									var rowNum = transition_info.rowNum;

									indentations[rowNum-depth] = INDENT_BOTH;
									width += TRANSITION_WIDTH;
								});
							} else {
								_.each(columnTransitions.incoming, function(transition_info) {
									var rowNum = transition_info.rowNum;

									indentations[rowNum-depth] = NO_INDENT;
								});
							}

							_.each(columnTransitions.incoming.concat(columnTransitions.outgoing.notUsed,
								columnTransitions.outgoing.used), function(transition_info) {
									var rowNum = transition_info.rowNum;

									if(overallHighestTransitionRow === false || overallHighestTransitionRow < rowNum) {
										overallHighestTransitionRow = rowNum;
									}
								});

							columnTransitions.indentations = indentations;
							columnTransitions.numRows = indentations.length;
							columnTransitions.width = width;
							columnTransitions.numRows = overallHighestTransitionRow || 0;

							columnWidths[columnIndex] = width;
						}, this
					);
					stateWing.numOwnRows = Math.max(stateWing.leftColumnTransitions.indentations.length,
													stateWing.rightColumnTransitions.indentations.length);
				}
			}, this);

			function computeNumRows(sc_summary) {
				var stateWings = state_wings[sc_summary.id],
					sc_row_num = stateWings.rowNum;
				if(sc_summary.substates.length === 0) {
					stateWings.numRows = stateWings.numOwnRows;
				} else {
					var maxNumRows = 0;
					_.each(sc_summary.substates, function(child) {
						var numChildRows = computeNumRows(child),
							childWings = state_wings[child.id],
							totalNumRows = (childWings.rowNum - sc_row_num) + numChildRows;
						if(totalNumRows > maxNumRows) {
							maxNumRows = totalNumRows;
						}
					});
					stateWings.numRows = maxNumRows;
				}
				return stateWings.numRows;
			}
			_.each(stateMachineSummary, computeNumRows);

			var overallNumRows = 0,
				totalWidth = 0;
			_.each(stateMachineSummary, function(sc_summary) {
				var stateWings = state_wings[sc_summary.id],
					numRows = stateWings.numRows;

				if(numRows > overallNumRows) {
					overallNumRows = numRows;
				}
			});

			_.each(columnWidths, function(cwidth) {
				totalWidth += cwidth;
			});

			_.extend(state_wings[FAKE_ROOT_STATECHART.id], {
				numRows: overallNumRows,
				width: totalWidth
			});

			var location_info_map = {};

			_.each(state_wings, function(stateWing) {
				var sc_summary = stateWing.sc_summary,
					locationInfo, centerColumnIndex, i, ccx;

				if(stateWing.isAtomic) {
					var centerColumnIndex = stateWing.centerColumn,
						i = 0,
						ccx = 0;
					for(;i<centerColumnIndex; i++) {
						ccx += columnWidths[i];
					}

					locationInfo = {
						columnX: ccx + stateWing.centerColumnWidth/2,
						columnWidth: stateWing.centerColumnWidth,
						x: ccx + stateWing.centerColumnWidth/2,
						y: (stateWing.rowNum + 0.5) * ROW_HEIGHT,
						displayType: My.STARTSTATE_DISPLAY_TYPE
					};
				} else if(sc_summary === FAKE_ROOT_STATECHART) {
					locationInfo = {
						x: 0,
						y: 0,
						width: stateWing.width,
						height: stateWing.numRows * ROW_HEIGHT,
						displayType: My.INVISIBLE_DISPLAY_TYPE
					};
				} else if(sc_summary.isRoot) {
					locationInfo = {
						x: 0,
						y: 0,
						width: stateWing.centerColumnWidth,
						displayType: My.HRANGE_DISPLAY_TYPE
					};
				} else {
					var centerColumnIndex = stateWing.centerColumn,
						i = 0,
						ccx = 0;
					for(;i<centerColumnIndex; i++) {
						ccx += columnWidths[i];
					}

					locationInfo = {
						columnX: ccx,
						columnWidth: stateWing.centerColumnWidth,
						x: ccx,
						y: (stateWing.rowNum + 0.5) * ROW_HEIGHT,
						displayType: My.STATE_DISPLAY_TYPE
					};

					var leftWingPoints = [],
						rightWingPoints = [],
						numRows = stateWing.numRows,
						leftColumnTransitions = stateWing.leftColumnTransitions,
						rightColumnTransitions = stateWing.rightColumnTransitions,
						i = 0,
						lastLeftIndentation = 0,
						lastRightIndentation = 0,
						leftIndentation, rightIndentation, points;

					while(i < numRows) {
						leftIndentation = leftColumnTransitions.indentations[i];
						rightIndentation = rightColumnTransitions.indentations[i];

						if(leftIndentation) {
							if(lastLeftIndentation < i-1) {
								leftWingPoints.push([0.0, (i - lastLeftIndentation - 1)]);
							}

							if(leftIndentation === INDENT_AFTER) {
								leftWingPoints.push([0.0, 0.5], [0.5, 0.5]);
							} else if(leftIndentation === INDENT_BEFORE) {
								leftWingPoints.push([0.5, 0.5], [0.0, 0.5]);
							} else if(leftIndentation === INDENT_BOTH) {
								leftWingPoints.push([0.5, 0.5], [0.5, 0.5]);
							}
							lastLeftIndentation = i;

							leftWingPoints.push(points);
						}

						if(rightIndentation) {
							if(lastRightIndentation < i-1) {
								rightWingPoints.push([0.0, (i - lastRightIndentation - 1)]);
							}

							if(rightIndentation === INDENT_AFTER) {
								rightWingPoints.push([0.0, 0.5], [0.5, 0.5]);
							} else if(rightIndentation === INDENT_BEFORE) {
								rightWingPoints.push([0.5, 0.5], [0.0, 0.5]);
							} else if(rightIndentation === INDENT_BOTH) {
								rightWingPoints.push([0.5, 0.5], [0.5, 0.5]);
							}
							lastRightIndentation = i;

							rightWingPoints.push(points);
						}

						i++;
					}

					if(lastLeftIndentation < numRows) {
						leftWingPoints.push([0.0, (numRows - lastLeftIndentation - 1)]);
					}

					if(lastRightIndentation < numRows) {
						rightWingPoints.push([0.0, (numRows - lastRightIndentation - 1)]);
					}
				}

				location_info_map[sc_summary.id] = locationInfo;
			}, this);
					_.each(stateWing.columnTransitions.outgoing.used.concat(stateWing.columnTransitions.outgoing.notUsed),
						function(transitionWing) {
							var transitionLocationInfo = {
									from: {
										x:locationInfo.x,
										y: locationInfo.y,
									},
									to: {
										x: locationInfo.x+20,
										y: locationInfo.y
									},
									columnX: locationInfo.columnX,
									columnWidth: locationInfo.columnWidth,
									displayType: My.TRANSITION_DISPLAY_TYPE
								},
								transition_info = transitionWing.transition_summary;

							location_info_map[transition_info.id] = transitionLocationInfo;
						});

			var rootWing = state_wings[FAKE_ROOT_STATECHART.id];

			return {width: rootWing.width, height: rootWing.height, locations: location_info_map};
			/*

			var collect_transitions = function(node) {
				
			};
			collect_transitions(sc_tree);
			/*

			var push_node_columns = function (node, depth) {
				var sc = node.sc_summary,
					children = node.children,
					children_split_index = children.length,//; Math.ceil(children.length / 2);
					col_len = columns.length,
					li, ri;
				if (sc.isStart) {
					columns.push({ sc_summary: sc, lr: "c", depth: depth + 1});
					col_indicies[sc.id] = {c: col_len};
					li = ri = col_len;
				} else {
					li = col_len;
					columns.push({ sc_summary: sc, lr: "l", depth: depth});

					_.each(children.slice(0, children_split_index), function (childnode) {
						push_node_columns(childnode, depth + 1);
					});

					var ci = columns.length;
					columns.push({ sc_summary: sc, lr: "c", depth: depth});

					_.each(children.slice(children_split_index), function (childnode) {
						push_node_columns(childnode, depth + 1);
					});

					ri = columns.length;
					columns.push({ sc_summary: sc, lr: "r", depth: depth});

					col_indicies[sc.id] = {l: li, r: ri };
				}

				var row;
				if (rows[depth]) {
					row = rows[depth];
				} else {
					rows[depth] = row = [];
				}
				for (i = li; i <= ri; i += 1) {
					row[i] = sc;
				}
			};
			push_node_columns(sc_tree, 0);
			*/
			/*


			var transition_from_to = [];
			var collect_transition_from_to = function (node) {
				var sc = node.sc_summary,
					indicies = col_indicies[sc.id],
					li, ri,
					outgoingTransitions;

				if(sc.isStart || sc === FAKE_ROOT_STATECHART ) {
					li = ri = indicies.c;
				} else {
					li = indicies.l;
					ri = indicies.r;
				}

				if(node.parent && node.parent.sc_summary.isConcurrent && !ist.__debug_statecharts) {
					outgoingTransitions = [];
				} else {
					outgoingTransitions = _.clone(sc.outgoingTransitions);
				}

				var transitionsUsedByProperties = [],
					transitionsNotUsedByProperties = [];

				_.each(outgoingTransitions, function(transition) {
					if(transition.usedByAnyProperties) {
						transitionsUsedByProperties.push(transition);
					} else {
						transitionsNotUsedByProperties.push(transition);
					}
				});

				_.each(transitionsUsedByProperties.concat(transitionsNotUsedByProperties), function(transition_info) {
					var from = transition_info.from,
						to = transition_info.to;

					if(from === to) {
						if(!sc.isStart) { // Don't include a self-transition in a start state.
							transition_from_to.push({min_x: ri, max_x: ri, type: "self", transition_info: transition_info});
						}
					} else {
						var isUsed = transition_info.usedByAnyProperties,
							from_indicies = col_indicies[from.cobj_id],
							to_indicies = col_indicies[to.cobj_id],
							from_l = _.has(from_indicies, "l") ? from_indicies.l : from_indicies.c,
							to_l = _.has(to_indicies, "l") ? to_indicies.l : to_indicies.c,
							min_x, max_x, type;

						if(from_l < to_l) {
							min_x = ri;
							max_x = _.has(to_indicies, "l") ? to_indicies.l : to_indicies.c;
							type = "right";
							
						} else {
							min_x = _.has(to_indicies, "r") ? to_indicies.r : to_indicies.c;
							max_x = li;
							type = "left";
						}

						transition_from_to.push({ min_x: min_x, max_x: max_x, type: type, transition_info: transition_info });
					}
				});
				_.each(node.children, collect_transition_from_to);
			};
			collect_transition_from_to(sc_tree);

			//row 0 is the bottom
			_.each(transition_from_to, function (info, index) {
				var from = info.min_x,
					to = info.max_x,
					curr_row = false,
					transition_info = info.transition_info,
					transition_from = transition_info.from,
					transition_to = transition_info.to,
					row, cell, row_index, is_splice_attempt;

				outer: for (i = 0; i < rows.length; i += 1) {
					row = rows[i];
					cell = row[from];
					is_splice_attempt = cell && cell.type === "state" && (cell.state === transition_from || cell.state === transition_to);
					inner: for (j = from; j <= to; j++) {
						cell = row[j];
						if (cell) {
							if(is_splice_attempt && cell.type === "state" && (cell.state === transition_from || cell.state === transition_to)) {
								continue inner;
							} else {
								is_splice_attempt = false;
								continue outer;
							}
						}
					}

					curr_row = rows[i];
					row_index = i;
					break;
				}
				if (!curr_row) {
					curr_row = [];
					row_index = rows.length;
					rows.push(curr_row);
				}

				if(is_splice_attempt) {
					var to_insert, to_minus_from = to-from;

					_.each(transition_from_to, function(info_2, index_2) {
						if(index_2 !== index) {
							if(info_2.max_x >= to) {
								info_2.max_x+=to_minus_from;
							}
							if(info_2.min_x > from) {
								info_2.min_x+=to_minus_from;
							}
						}
					})

					for (i = 0; i < rows.length; i += 1) {
						row = rows[i];
						if(row === curr_row) {
							to_insert = fillArray(transition_info, to_minus_from);
						} else {
							to_insert = fillArray(row[from], to_minus_from);
						}
						row.splice.apply(row, ([from+1, 0]).concat(to_insert));
					}
					var col_insert = {
							transition_summary: transition_info, lr: "c"
						},
						col_inserts = fillArray(col_insert, to_minus_from);
					columns.splice.apply(columns, ([from+1, 0]).concat(col_inserts));
				} else {
					for (i = from; i <= to; i += 1) {
						curr_row[i] = transition_info;
					}
				}
			});

			transition_from_to = false;
			*/

/*

			// FOR DEBUGGING
			var curr_element, curr_element_start_col;
			for (i = rows.length - 1; i >= 0; i -= 1) {
				row = rows[i];
				var row_arr = [];
				for (j = 0; j <= row.length; j += 1) {
					if (row[j] !== curr_element) {
						if (curr_element) {
							var col_length = j - curr_element_start_col;
							var cl_2 = Math.floor(col_length / 2);
							var id = "-" + uid.strip_prefix(curr_element.id);
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
			/**/

/*
			// So far, we have poles for each state's left transitions, the state itself, and its right transitions.
			// Now, we have to figure out how far to spread each state's left poles


			var y = PADDING_TOP;
			var column_widths = [];
			var num_rows = rows.length;

			var H = TRANSITION_HEIGHT + 2 * TRANSITION_MARGIN;

			var dy = H / 2;
			var dx =  dy / TAN_THETA;

			var x = dx;
			var width;

			var is_from, is_to, row, location_info, cell, wing_start_x, wing_start_y, column_values;
			//var return_empty_obj = function () { return {}; };
			for (i = 0; i < columns.length; i += 1) {
				var column = columns[i],
					state_info = column.sc_summary,
					lr = column.lr,
					state = state_info.state,
					sid;

				if(state) {
					sid = uid.strip_prefix(state.cobj_id);
				}

				if(lr === "l") { //left transition pole
					column_values = _.pluck(rows, i);
					x += STATE_PADDING_X / 2;
					y = PADDING_TOP + H * (num_rows - column_values.length + 1) + (H / 2);

					var found_relevant_transition = false;
					//console.log(column_values);
					for (row = column_values.length - 1; row >= column.depth; row --) {
						cell = column_values[row];
						if(!cell) continue;

						//if (found_relevant_transition) {x += dx; y += dy; }
						if (cell === state_info) {
							//if (!found_relevant_transition) {
								wing_start_x = x - dx * STATE_LINE_PADDING_FACTOR;
								wing_start_y = y - dy * STATE_LINE_PADDING_FACTOR;
							//}
							//break;
						} else if (cell.from) { // is transition
							is_from = cell.from === state;
							is_to = cell.to === state;
							if (is_from || is_to) {
								//var to_continue = false;
								//if (!found_relevant_transition) {
									//found_relevant_transition = true;
									wing_start_x = x - dx * STATE_LINE_PADDING_FACTOR;
									wing_start_y = y - dy * STATE_LINE_PADDING_FACTOR;
									//to_continue = true;
								//}
								if(location_info_map[cell.id]) {
									location_info = location_info_map[cell.id];
								} else {
									location_info = location_info_map[cell.id] = {};
								}
								//location_info = location_info_map.get_or_put(cell, return_empty_obj);

								if (is_from && is_to) {
									location_info.from = location_info.to = {x: x, y: y};
								} else if (is_from) {
									location_info.from = {x: x, y: y};
								} else { // includes start state
									location_info.to = {x: x, y: y};
								}
							}
						}
						//if (found_relevant_transition) {x += 2 * dx; }
						y += H;
					}

					location_info = {};
					location_info.left_wing_start = { x: wing_start_x, y: wing_start_y };
					location_info.left_wing_end = { x: x, y: y };
					location_info_map[state_info.id] = location_info;
				} else if (lr === "r") {
					var found_state;
					column_values = _.pluck(rows, i);
					y = PADDING_TOP + H * (num_rows - column.depth) + H / 2;
					wing_start_x = x;
					wing_start_y = y;
					var wing_end_x = x + dx * STATE_LINE_PADDING_FACTOR,
						wing_end_y = y - dy * STATE_LINE_PADDING_FACTOR;

					var last_relevant_transition_index = -1;
					for (row = column_values.length - 1; row >= column.depth; row -= 1) {
						cell = column_values[row];
						if (cell && cell.from && (cell.from === state || cell.to === state)) {
							last_relevant_transition_index  = row;
							break;
						}
					}
					for (row = column.depth; row < column_values.length; row++) {
						cell = column_values[row];
						if(!cell) continue;

						if (cell === state_info) {
							//console.log(lr, cell.id);
							wing_start_x = x;
							wing_start_y = y;
						} else if (cell.from) { // is transition
							is_from = cell.from === state;
							is_to = cell.to === state;
							if (is_from || is_to) {
								wing_end_x = x + dx * STATE_LINE_PADDING_FACTOR;
								wing_end_y = y - dy * STATE_LINE_PADDING_FACTOR;

								if(location_info_map[cell.id]) {
									location_info = location_info_map[cell.id];
								} else {
									location_info = location_info_map[cell.id] = {};
								}

								if (is_from && is_to) {
									location_info.from = location_info.to = {x: x, y: y};
								} else if (is_from) {
									location_info.from = {x: x, y: y};
								} else { // includes start state
									location_info.to = {x: x, y: y};
								}
							}
						}
						if (row <= last_relevant_transition_index) { x += 2 * dx; }
						y -= H;
					}
					location_info = location_info_map[state_info.id];
					location_info.right_wing_start = { x: wing_start_x, y: wing_start_y };
					location_info.right_wing_end = { x: wing_end_x, y: wing_end_y };

					x += STATE_PADDING_X / 2;
					if (statecharts_with_add_state_button === state_info) {
						x += ADD_STATE_WIDTH / 2;
						location_info.add_state_button_x = x;
						x += ADD_STATE_WIDTH / 2;
						location_info.right_wing_end.x += ADD_STATE_WIDTH;
						location_info.right_wing_start.x += ADD_STATE_WIDTH;
					}
				} else if (state_info === FAKE_ROOT_STATECHART) {
					x += STATE_PADDING_X;
				} else if (state_info.isRoot) {
					//x += STATE_PADDING_X/2;
					y = PADDING_TOP + H * (num_rows - column.depth) + H / 2;
					location_info = location_info_map[state_info.id];
					location_info.center = { x: x, y: y };
					//x += STATE_PADDING_X/2;
				} else if (state_info.isStart) {
					width = state_info.usedByAnyProperties ? USED_START_STATE_WIDTH : UNUSED_START_STATE_WIDTH;
					x += width / 2;
					y = PADDING_TOP + H * (num_rows - column.depth) + H / 2;
					location_info_map[state_info.id] = { center: { x: x, y: y } };

					column_values = _.pluck(rows, i);

					for (row = column_values.length - 1; row >= column.depth; row -= 1) {
						cell = column_values[row];
						if(!cell) continue;
						if (cell.from === state || cell.to === state) {
							is_from = cell.from === state;
							is_to = cell.to === state;

							if(location_info_map[cell.id]) {
								location_info = location_info_map[cell.id];
							} else {
								location_info = location_info_map[cell.id] = {};
							}

							//location_info = location_info_map.get_or_put(cell, return_empty_obj);
							if (is_from && is_to) {
								location_info.from = location_info.to = {x: x, y: y};
							} else if (is_from) {
								location_info.from = {x: x, y: y};
							} else { // includes start state
								location_info.to = {x: x, y: y};
							}
						}
					}

					x += width / 2;
				} else {
					width = state_info.usedByAnyProperties ? USED_STATE_NAME_WIDTH: UNUSED_STATE_NAME_WIDTH;

					x += width / 2;
					y = PADDING_TOP + H * (num_rows - column.depth) + H / 2;
					location_info = location_info_map[state_info.id];
					location_info.center = { x: x, y: y };
					x += width / 2;
				}
			}

			var width = x,
				height = PADDING_TOP + (num_rows - 1) * H;

*/
		};
	}(ist.RootStatechartLayoutEngine));

	function fillArray(value, len) {
		var arr = [], i = 0;
		while(i < len) { arr.push(value); i++; }
		return arr;
	}

}(interstate));
