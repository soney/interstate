/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var FONT_FAMILY_STR = "Tahoma, Geneva, sans-serif";


	red.RootStatechartView = function (statecharts, layout_engine, paper) {
		able.make_this_listenable(this);
		this.statecharts = statecharts;
		this.layout_engine = layout_engine;
		this.object_views = new RedMap({
			hash: "hash"
		});
		this.paper = paper;
		var add_state_button = paper.text(0, 20, "+");
		add_state_button.attr({
			"font-size": "30px",
			"cursor": "pointer"
		});
		add_state_button.click(_.bind(function () {
			this._emit("add_state", {statechart: this.statecharts[0]});
		}, this));
		var curr_items = [];
		this.live_layout = cjs.liven(function () {
			var layout_info = this.layout_engine.get_layout();
			var width = layout_info.width,
				height = layout_info.height,
				layout = layout_info.locations;
			this.paper.setSize(width, height);
			var new_items = [];
			layout.each(function (layout_info, state) {
				var view;
				if (state instanceof red.Statechart) {
					if (_.indexOf(this.statecharts, state) >= 0) {
						if (layout_info.add_state_button_x) {
							add_state_button.attr({
								x: layout_info.add_state_button_x,
								y: height / 2
							});
						}
						return; //it's a root statechart
					}
					if (this.object_views.has(state)) {
						view = this.get_view(state, layout_info);
						view.option({
							lws: layout_info.left_wing_start,
							lwe: layout_info.left_wing_end,
							rws: layout_info.right_wing_start,
							rwe: layout_info.right_wing_end,
							c: layout_info.center
						});
						new_items.push(view);
					} else {
						view = this.get_view(state, layout_info);
						new_items.push(view);
					}
				} else if (state instanceof red.StatechartTransition) {
					if (this.object_views.has(state)) {
						view = this.get_view(state, layout_info);
						view.option({
							from: layout_info.from,
							to: layout_info.to
						});
						new_items.push(view);
					} else {
						view = this.get_view(state, layout_info);
						new_items.push(view);
					}
				}
			}, this);

			_.each(curr_items, function (ci) {
				if (new_items.indexOf(ci) < 0) {
					ci.remove();
				}
			});
			curr_items = new_items;
		}, {
			context: this
		});
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		proto.get_view = function (obj, layout_info) {
			return this.object_views.get_or_put(obj, function () {
				var rv;
				if (obj instanceof red.StatechartTransition) {
					if (obj.from() instanceof red.StartState) {
						rv  = new red.StartTransitionView({
							paper: this.paper,
							transition: obj,
							to: layout_info.to
						});
						return rv;
					} else {
						var event = obj.event();
						rv = new red.TransitionView({
							paper: this.paper,
							transition: obj,
							from: layout_info.from,
							to: layout_info.to
						});
						rv.on("change", function (event) {
							var value = event.value;
							if (value === "") {
								this._emit("remove_transition", {transition: obj});
							} else {
								this._emit("change_transition_event", {transition: obj, str: value});
							}
						}, this);
						return rv;
					}
				} else {
					rv = new red.StateView({
						state: obj,
						paper: this.paper,
						lws: layout_info.left_wing_start,
						lwe: layout_info.left_wing_end,
						rws: layout_info.right_wing_start,
						rwe: layout_info.right_wing_end,
						c: layout_info.center
					});
					rv.on("change", function (event) {
						var value = event.value;
						if (value === "") {
							this._emit("remove_state", {state: obj});
						} else {
							this._emit("rename_state", {state: obj, str: value});
						}
					}, this).on("mousedown", function (event) {
						this._from_state = obj;
					}, this).on("mouseup", function () {
						var to_state = obj,
							from_state = this._from_state;
						delete this._from_state;
						if (from_state && to_state) {
							this._emit("add_transition", {from: from_state, to: to_state});
						}
					}, this);
					return rv;
				}
			}, this);
		};

		proto.pause = function () {
			this.live_layout.pause();
		};
		proto.resume = function () {
			this.live_layout.resume();
			this.live_layout.run();
		};
		proto.destroy = function () {
			this.live_layout.destroy();
		};

	}(red.RootStatechartView));


	red.StateView = function (options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {
			state: null,
			paper: null,
			lws: {x: 0, y: 0},
			lwe: {x: 0, y: 0},
			rws: {x: 0, y: 0},
			rwe: {x: 0, y: 0},
			c: {x: 0, y: 0},
			default_stroke: "#777",
			default_fill: "#F9F9F9",
			active_fill: "#CCC",
			active_stroke: "red"
		}, options);
		this.active_fn = cjs.liven(function () {
			var state = this.option("state");
			if (state.is_initialized() && state.is_active()) {
				if (this.path) {
					this.path.animate({
						"fill": this.option("active_fill"),
						"stroke": this.option("active_stroke")
					}, 300, "ease-out");
				}
			} else {
				if (this.path) {
					this.path.animate({
						"fill": this.option("default_fill"),
						"stroke": this.option("default_stroke")
					}, 300, "ease-out");
				}
			}
		}, {
			context: this
		});

		var state = this.option("state");

		if (state.is_initialized()) {
			this.initialize();
		} else {
			state.once("initialized", _.bind(this.initialize, this));
		}
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);
		proto.initialize = function () {
			var state = this.option("state");
			var paper = this.option("paper");
			this.path = paper.path(this.get_path_str());
			this.path.attr({
				"stroke": this.option(state.is_active() ? "active_stroke" : "default_stroke"),
				"fill": this.option(state.is_active() ? "active_fill" : "default_fill")
			}).toBack();
			this.path.mousedown(_.bind(function (e) {
				e.preventDefault();
				e.stopPropagation();
				this._emit("mousedown");
			}, this));
			this.path.mouseup(_.bind(function (e) {
				e.preventDefault();
				e.stopPropagation();
				this._emit("mouseup");
			}, this));
			var center = this.option("c");

			var name = state.get_name("parent");
			this.label = new red.EditableText(paper, {x: center.x, y: center.y, text: name});
			this.label.option({
				"font-size": "12px",
				"font-family": FONT_FAMILY_STR
			});
			this.label.on("change", this.forward);
			this.vline = paper.path("M" + center.x + "," + (center.y + 5) + "V9999");
		};

		proto._on_options_set = function (values) {
			if (this.path) {
				var path_str = this.get_path_str();
				this.path.attr({
					"path": path_str
				});
				var center = this.option("c");
				var state = this.option("state");
				var name = state.get_name("parent");
				this.label.option({
					x: center.x,
					y: center.y,
					text: name
				});
				this.vline.attr({path: "M" + center.x + "," + (center.y + 5) + "V9999" });
			}
		};

		proto.get_path_str = function () {
			var pts = [this.option("lws"), this.option("lwe"), this.option("rws"), this.option("rwe")];
			var x0 = pts[0].x;
			var path_str = "M" + x0 + ",0" + "L" + _.map(pts, function (pt) {
				return pt.x + "," + pt.y;
			}).join("L") + "V0Z";
			return path_str;
		};
		proto.remove = function () {
			this.path.remove();
			this.label.remove();
			this.vline.remove();
		};
	}(red.StateView));

	var get_arrow_paths = function (from, to, self_pointing_theta, radius, arrowLength, arrowAngleRadians) {
		var fromX = from.x,
			fromY = from.y,
			toX = to.x,
			toY = to.y;

		var xDiff = toX - fromX,
			yDiff = toY - fromY;

		var line_path_str;
		var lineStartX, lineStartY, lineEndX, lineEndY, theta, arrow_theta;

		if (Math.pow(xDiff, 2) + Math.pow(yDiff, 2) <= Math.pow(radius + arrowLength, 2)) {
			var curve_radius = 2 * radius * radius + arrowLength + 2;

			theta = self_pointing_theta * Math.PI / 180;
			arrow_theta = theta - (90 * Math.PI / 180);

			lineStartX = fromX + radius * Math.cos(theta);
			lineStartY = fromY + radius * Math.sin(theta);
			lineEndX = (fromX + (radius + arrowLength) * Math.cos(theta));
			lineEndY = (fromY - (radius + arrowLength) * Math.sin(theta));

			line_path_str = "M" + lineStartX + "," + lineStartY +
								"C" + (fromX + curve_radius * Math.cos(theta)) +
								"," + (fromY + curve_radius * Math.sin(theta)) +
								"," + (fromX + (curve_radius + arrowLength) * Math.cos(theta)) +
								"," + (fromY - (curve_radius + arrowLength) * Math.sin(theta)) +
								"," + lineEndX +
								"," + lineEndY;

			toX = (toX + radius * Math.cos(theta));
			toY = (toY - radius * Math.sin(theta));
		} else {
			theta = arrow_theta = Math.atan2(yDiff, xDiff);
			lineStartX = fromX + Math.cos(theta) * radius;
			lineStartY = fromY + Math.sin(theta) * radius;
			lineEndX = toX - Math.cos(theta) * arrowLength;
			lineEndY = toY - Math.sin(theta) * arrowLength;

			line_path_str = "M" + lineStartX + "," + lineStartY + "L" + lineEndX + "," + lineEndY;
		}

		var off_line = arrowLength * Math.tan(arrowAngleRadians);
		var arrow_path = [
			{ x: toX, y: toY},
			{ x: lineEndX + off_line * Math.cos(arrow_theta - Math.PI / 2),
				y: lineEndY + off_line * Math.sin(arrow_theta - Math.PI / 2)
				},
			{ x: lineEndX + off_line * Math.cos(arrow_theta + Math.PI / 2),
				y: lineEndY + off_line * Math.sin(arrow_theta + Math.PI / 2)
				}
		];
		var arrow_path_str = "M" + _.map(arrow_path, function (point) {
			return point.x + "," + point.y;
		}).join("L") + "Z";

		return {
			line: { path: line_path_str },
			arrow: { path: arrow_path_str },
			circle: { cx: fromX, cy: fromY, r: radius }
		};
	};

	var center = function (p1, p2) {
		return { x: (p1.x + p2.x) / 2,
					y: (p1.y + p2.y) / 2 };
	};

	red.TransitionView = function (options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {
			transition: null,
			paper: null,
			from: {x: 0, y: 0},
			to: {x: 0, y: 0},
			arrowLength: 8,
			radius: 1,
			arrowAngle: 20,
			self_pointing_theta: 40
		}, options);
		var paper = this.option("paper");
		var paths = this.get_paths();

		this.line_path = paper.path(paths.line.path);
		this.arrow_path = paper.path(paths.arrow.path);
		this.arrow_path.attr({
			fill: "black"
		});
		this.circle = paper.circle(paths.circle.cx, paths.circle.cy, paths.circle.r);
		this.circle.attr({
			"fill": "black",
			"stroke": "none"
		});
		var transition = this.option("transition");
		var event = transition.event();
		var str = "";
		if (event instanceof red.ParsedEvent) {
			str = event.get_str();
		}
		var c = center(this.option("from"), this.option("to"));
		this.label = new red.EditableText(paper, {x: c.x, y: c.y + 8, text: str});
		this.label.option({
			"font-size": "10px",
			"font-family": FONT_FAMILY_STR
		});
		
		this.$flash = _.bind(this.flash, this);
		transition.on("fire", this.$flash);
		this.label.on("change", this.forward);
		var from = this.option("from");
		this.vline = paper.path("M" + from.x + "," + (from.y) + "V9999");
		this.vline.toBack();
		this.vline.attr({
			stroke: "#999",
			"stroke-dasharray": ". "
		});

		if (event instanceof red.ParsedEvent) {
			event.on("setString", function (e) {
				var str = e.to;
				this.label.option("text", str);
			}, this);
			str = event.get_str();
		} else {
			str = "";
		}
		this.label.option("text", str);
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);
		proto._on_options_set = function (values) {
			var transition = this.option("transition");
			var paths = this.get_paths();
			this.line_path.attr("path", paths.line.path);
			this.arrow_path.attr("path", paths.arrow.path);
			var event = transition.event();
			var c = center(this.option("from"), this.option("to"));
			this.label.option({
				x: c.x,
				y: c.y + 8
			});
			this.circle.attr({
				cx: paths.circle.cx,
				cy: paths.circle.cy,
				r: paths.circle.r
			});
			var from = this.option("from");
			this.vline.attr({
				path: "M" + from.x + "," + (from.y) + "V9999"
			});
		};

		proto.get_paths = function () {
			var from = this.option("from"),
				to = this.option("to"),
				self_pointing_theta = this.option("self_pointing_theta"),
				radius = this.option("radius"),
				arrowLength = this.option("arrowLength"),
				arrowAngleRadians = this.option("arrowAngle") * Math.PI / 180;
			return get_arrow_paths(from, to, self_pointing_theta, radius, arrowLength, arrowAngleRadians);
		};

		proto.flash = function () {
			var paper = this.option("paper");
			var line_elem = this.line_path;
			var arrow = this.arrow_path;
			var len = line_elem.getTotalLength();

			var the_flash = paper.path(line_elem.getSubpath(0, 0));
			the_flash.attr({
				stroke: "red",
				"stroke-width": 3,
				guide: line_elem,
				along: [0, 0]
			});
			the_flash.animate({
				path: line_elem.getSubpath(0, len)
			}, 200, "ease-in", function () {
				the_flash.animate({
					path: line_elem.getSubpath(4 * len / 4.1, len)
				}, 200, "ease-out", function () {
					the_flash.remove();
				});
				arrow.attr({"fill": "red"});
				window.setTimeout(function () {
					arrow.animate({
						fill: "black"
					}, 200, "ease-out");
				}, 200);
			});
		};

		proto.remove = function () {
			this.label.remove();
			this.circle.remove();
			this.line_path.remove();
			this.arrow_path.remove();
			this.vline.remove();
			var transition = this.option("transition");
			transition.off("fire", this.$flash);
		};
	}(red.TransitionView));

	red.StartTransitionView = function (options) {
		able.make_this_optionable(this, {
			transition: null,
			paper: null,
			to: {x: 0, y: 0},
			arrowLength: 8,
			radius: 4,
			line_len: 2,
			arrowAngle: 20
		}, options);

		var paper = this.option("paper");
		var paths = this.get_paths();

		this.line_path = paper.path(paths.line.path);
		this.arrow_path = paper.path(paths.arrow.path);
		this.arrow_path.attr({
			"fill": "black"
		});
		this.circle = paper.circle(paths.circle.cx, paths.circle.cy, paths.circle.r);
		this.circle.attr({
			"fill": "black",
			"stroke": "none"
		});

		var to = this.option("to");
		var from = {x: to.x - this.option("arrowLength") - this.option("radius") - this.option("line_len"), y: to.y};
		this.vline = paper.path("M" + from.x + "," + (from.y) + "V9999");
		this.vline.toBack();
		this.vline.attr({
			stroke: "#999",
			"stroke-dasharray": ". "
		});
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_optionable(proto);
		proto.get_paths = function () {
			var to = this.option("to"),
				self_pointing_theta = 0,
				radius = this.option("radius"),
				arrowLength = this.option("arrowLength"),
				arrowAngleRadians = this.option("arrowAngle") * Math.PI / 180;

			var from = {x: to.x - this.option("arrowLength") - this.option("radius") - this.option("line_len"), y: to.y};
			return get_arrow_paths(from, to, self_pointing_theta, radius, arrowLength, arrowAngleRadians);
		};

		proto._on_options_set = function (values) {
			var paths = this.get_paths();
			this.line_path.attr("path", paths.line.path);
			this.arrow_path.attr("path", paths.arrow.path);
			this.circle.attr({
				cx: paths.circle.cx,
				cy: paths.circle.cy,
				r: paths.circle.r
			});
			var to = this.option("to");
			var from = {x: to.x - this.option("arrowLength") - this.option("radius") - this.option("line_len"), y: to.y};
			this.vline.attr({
				path: "M" + from.x + "," + (from.y) + "V9999"
			});
			this.vline.toBack();
		};
		proto.remove = function () {
			this.vline.remove();
			this.line_path.remove();
			this.arrow_path.remove();
			this.circle.remove();
		};
	}(red.StartTransitionView));
}(red));
