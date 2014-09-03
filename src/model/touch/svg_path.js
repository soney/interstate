/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.Path = function() {
		this._tree = [];
		this._curr_tree_node = this._tree;
		this._stack = [this._tree];
		this.drawing_fns = [];
	};

	(function(My) {
		var proto = My.prototype;

		var IF_CMD = "IF",
			WHILE_CMD = "WHILE";

		proto.relativeMoveTo = proto.m = function(x, y) {
			this._curr_tree_node.push(["m", x, y]);
			return this;
		};

		proto.absoluteMoveTo = proto.moveTo = proto.M = function(x, y) {
			this._curr_tree_node.push(["M", x, y]);
			return this;
		};

		proto.close = proto.Z = function() {
			this._curr_tree_node.push(["Z"]);
			return this;
		};

		proto.relativeLineTo = proto.l = function(x, y) {
			this._curr_tree_node.push(["l", x, y]);
			return this;
		};
		
		proto.absoluteLineTo = proto.lineTo = proto.L = function(x, y) {
			this._curr_tree_node.push(["L", x, y]);
			return this;
		};

		proto.relativeHorizontalLineTo = proto.h = function(x) {
			this._curr_tree_node.push(["h", x]);
			return this;
		};

		proto.absoluteHorizontalLineTo = proto.horizontalLineTo = proto.H = function(x) {
			this._curr_tree_node.push(["H", x]);
			return this;
		};

		proto.relativeVerticalLineTo = proto.v = function(y) {
			this._curr_tree_node.push(["v", y]);
			return this;
		};

		proto.absoluteVerticalLineTo = proto.verticalLineTo = proto.V = function(y) {
			this._curr_tree_node.push(["V", y]);
			return this;
		};

		proto.relativeCurveTo = proto.c = function(x1, y1, x2, y2, x, y) {
			this._curr_tree_node.push(["c", x1, y1, x2, y2, x, y]);
			return this;
		};
		
		proto.absoluteCurveTo = proto.curveTo = proto.C = function(x1, y1, x2, y2, x, y) {
			this._curr_tree_node.push(["C", x1, y1, x2, y2, x, y]);
			return this;
		};

		proto.relativeSmoothCurveTo = proto.s = function(x2, y2, x, y) {
			this._curr_tree_node.push(["s", x2, y2, x, y]);
			return this;
		};

		proto.absoluteSmoothCurveTo = proto.smoothCurveTo = proto.S = function(x2, y2, x, y) {
			this._curr_tree_node.push(["S", x2, y2, x, y]);
			return this;
		};

		proto.relativeQuadraticCurveTo = proto.q = function(x1, y1, x, y) {
			this._curr_tree_node.push(["q", x1, y1, x, y]);
			return this;
		};

		proto.absoluteQuadraticCurveTo = proto.quadraticCurveTo = proto.Q = function(x1, y1, x, y) {
			this._curr_tree_node.push(["Q", x1, y1, x, y]);
			return this;
		};

		proto.relativeSmoothQuadraticCurveTo = proto.t = function(x, y) {
			this._curr_tree_node.push(["t", x, y]);
			return this;
		};

		proto.absoluteSmoothQuadraticCurveTo = proto.smoothQuadraticCurveTo = proto.T = function(x, y) {
			this._curr_tree_node.push(["T", x, y]);
			return this;
		};

		proto.relativeArc = proto.a = function(rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, x, y) {
			this._curr_tree_node.push(["a", rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, x, y]);
			return this;
		};

		proto.absoluteArc = proto.arc = proto.A = function(rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, x, y) {
			this._curr_tree_node.push(["A", rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, x, y]);
			return this;
		};

		proto.circle = function(cx, cy, r) {
			return this.ellipse(cx, cy, r, r);
		};

		proto.ellipse = function(cx, cy, rx, ry) {
			var cx_sub_rx,
				nothing = 0.0001;

			if(cjs.isConstraint(cx)) {
				cx_sub_rx = cx.sub(rx);
			} else if(cjs.isConstraint(rx)){
				cx_sub_rx = cjs(function() {
					return cx - rx.get();
				});
			} else {
				cx_sub_rx = cx - rx;
			}

			this._curr_tree_node.push(["M", cx_sub_rx, cy],
										["a", rx, ry, 0, 1, 1, 0, nothing],
										["Z"]);
			return this;
		};

		proto.rect = function(x, y, width, height) {
			var neg_width;

			if(cjs.isConstraint(width)) {
				neg_width = width.neg();
			} else {
				neg_width = -width;
			}

			this._curr_tree_node.push(["M", x, y],
										["h", width],
										["v", height],
										["h", neg_width],
										["Z"]);
			return this;
		};

		proto.startIF = function(cond) {
			var new_tree = [];
			this._curr_tree_node.push([IF_CMD, {
					condition: cond,
					tree: new_tree
				}]);

			this._curr_tree_node = new_tree;
			this._stack.push(new_tree);
			return this;
		};

		proto.startELIF = function(cond) {
			this._stack.pop();

			var popped_tree_node = _.last(this._stack),
				if_stmt = _.last(popped_tree_node),
				elif_tree = [];

			if_stmt.push({
				condition: cond,
				tree: elif_tree
			});

			this._curr_tree_node = elif_tree;
			this._stack.push(elif_tree);
			return this;
		};

		proto.startELSE = function() {
			this._stack.pop();

			var popped_tree_node = _.last(this._stack),
				if_stmt = _.last(popped_tree_node),
				else_tree = [];

			if_stmt.push({
				tree: else_tree
			});

			this._curr_tree_node = else_tree;
			this._stack.push(else_tree);

			return this;
		};
		proto.endIF = function() {
			this._stack.pop();
			this._curr_tree_node = _.last(this._stack);
			return this;
		};

		var nodeToString = function(node) {
			var command = node[0],
				node_i,
				i, cond, cond_value, tree = false;
			if(command === IF_CMD) {
				for(i = 1; i<node.length; i++) {
					node_i = node[i];
					if(_.has(node_i, "condition")) {
						cond = node_i.condition;
						if(_.isFunction(cond)) {
							cond_value = cond();
						} else {
							cond_value = cjs.get(cond);
						}
					} else {
						cond_value = true;
					}

					if(cond_value) {
						tree = node[i].tree;
						break;
					}
				}
				if(!tree) {
					tree = [];
				}

				return _.map(tree, nodeToString);
			} else {
				var args = _.map(_.rest(node), function(arg) {
								return cjs.get(arg);
							}),
					result = command + (args.length === 0 ? "" : (" " + args.join(",")));
				return result;
			}
		};

		proto.toString = function() {
			var commands = _.map(this._tree, nodeToString),
				stringified_command = commands.join(" ");
			return stringified_command;
		};
	}(ist.Path));
}(interstate));
