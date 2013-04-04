(function(red) {
var cjs = red.cjs, _ = red._;

var FONT_FAMILY_STR = "Tahoma, Geneva, sans-serif";


red.RootStatechartView = function(statecharts, layout_engine, paper) {
	this.statecharts = statecharts;
	this.layout_engine = layout_engine;
	this.object_views = new Map({
		hash: "hash"
	});
	this.paper = paper;
	var curr_items = [];
	cjs.liven(function() {
		var layout_info = this.layout_engine.get_layout();
		var width = layout_info.width,
			height = layout_info.height,
			layout = layout_info.locations;
		this.paper.setSize(width, height);
		var new_items = [];
		layout.each(function(layout_info, state) {
			if(state instanceof red.Statechart) {
				if(_.indexOf(this.statecharts, state) >= 0) {
					return; //it's a root statechart
				}
				if(this.object_views.has(state)) {
					var view = this.get_view(state, layout_info);
					view.option({
						lws: layout_info.left_wing_start,
						lwe: layout_info.left_wing_end,
						rws: layout_info.right_wing_start,
						rwe: layout_info.right_wing_end,
						c: layout_info.center
					});
					new_items.push(view);
				} else {
					var view = this.get_view(state, layout_info);
					new_items.push(view);
				}
			} else if(state instanceof red.StatechartTransition) {
				if(this.object_views.has(state)) {
					var view = this.get_view(state, layout_info);
					view.option({
						from: layout_info.from,
						to: layout_info.to
					});
					new_items.push(view);
				} else {
					var view = this.get_view(state, layout_info);
					new_items.push(view);
				}
			}
		}, this);

		_.each(curr_items, function(ci) {
			if(new_items.indexOf(ci) < 0) {
				ci.remove();
			}
		});
		curr_items = new_items;
	}, {
		context: this
	});
};

(function(my) {
	var proto = my.prototype;
	proto.get_view = function(obj, layout_info) {
		return this.object_views.get_or_put(obj, function() {
			if(obj instanceof red.StatechartTransition) {
				if(obj.from() instanceof red.StartState) {
					return new red.StartTransitionView({
							paper: this.paper,
							transition: obj,
							to: layout_info.to
						});
				} else {
					return new red.TransitionView({
							paper: this.paper,
							transition: obj,
							from: layout_info.from,
							to: layout_info.to
						});
				}
			} else {
				return new red.StateView({
						state: obj,
						paper: this.paper,
						lws: layout_info.left_wing_start,
						lwe: layout_info.left_wing_end,
						rws: layout_info.right_wing_start,
						rwe: layout_info.right_wing_end,
						c: layout_info.center
					});
			}
		}, this);
	};
}(red.RootStatechartView));


red.StateView = function(options) {
	able.make_this_optionable(this, {
		state: null,
		paper: null,
		lws: {x:0, y:0},
		lwe: {x:0, y:0},
		rws: {x:0, y:0},
		rwe: {x:0, y:0},
		c: {x:0, y:0},
		default_stroke: "#777",
		default_fill: "#F9F9F9",
		active_fill: "#CCC",
		active_stroke: "red"
	}, options);
	this.active_fn = cjs.liven(function() {
		var state = this.option("state");
		if(state.is_initialized() && state.is_active()) {
			if(this.path) {
				this.path.animate({
					"fill": this.option("active_fill"),
					"stroke": this.option("active_stroke")
				}, 300, "ease-out");
			} 
		} else {
			if(this.path) {
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

	if(state.is_initialized()) {
		this.initialize();
	} else {
		state.once("initialized", _.bind(this.initialize, this));
	}
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_optionable(proto);
	proto.initialize = function() {
		var state = this.option("state");
		var paper = this.option("paper");
		this.path = paper.path(this.get_path_str());
		this.path.attr({
			"stroke": this.option(state.is_active() ? "active_stroke" : "default_stroke"),
			"fill": this.option(state.is_active() ? "active_fill" : "default_fill")
		}).toBack();
		var center = this.option("c");

		var name = state.get_name("parent");
		this.label = paper.text(center.x, center.y, name);
		this.label.attr({
			"font-size": "12px",
			"font-family": FONT_FAMILY_STR
		});
		var bbox = this.label.getBBox();
		this.label_background = paper.rect(bbox.x, bbox.y, bbox.width, bbox.height).insertBefore(this.label);
		this.label_background.attr({
			fill: "white",
			"fill-opacity": 0.7,
			stroke: "none"
		});
	};

	proto._on_options_set = function(values) {
		if(this.path) {
			var path_str = this.get_path_str();
			this.path.attr({
				"path": path_str
			});
			var center = this.option("c");
			var state = this.option("state");
			var name = state.get_name("parent");
			this.label.attr({
				x: center.x,
				y: center.y,
				text: name
			});

			var bbox = this.label.getBBox();
			this.label_background.attr({
				x: bbox.x,
				y: bbox.y,
				width: bbox.width,
				height: bbox.height
			});
		}
	};

	proto.get_path_str = function() {
		var pts = [this.option("lws"), this.option("lwe"), this.option("rws"), this.option("rwe")];
		var x0 = pts[0].x;
		var path_str = "M" + x0 + ",0" + "L" + _.map(pts, function(pt) {
			return pt.x+","+pt.y
		}).join("L") + "V0Z";
		return path_str;
	};
	proto.remove = function() {
		this.path.remove();
		this.label.remove();
		this.label_background.remove();
	};
}(red.StateView));

var get_arrow_paths = function(from, to, self_pointing_theta, radius, arrowLength, arrowAngleRadians) {
	var fromX = from.x
		, fromY = from.y
		, toX = to.x
		, toY = to.y;

	var xDiff = toX - fromX
		, yDiff = toY - fromY;

	var line_path_str;
	var lineStartX, lineStartY, lineEndX, lineEndY, theta, arrow_theta;

	if(Math.pow(xDiff, 2) + Math.pow(yDiff, 2) <= Math.pow(radius + arrowLength, 2)) {
		var curve_radius = 2*radius * radius + arrowLength + 2;

		theta = self_pointing_theta * Math.PI/180;
		arrow_theta = theta - (90 * Math.PI/180);

		lineStartX = fromX + radius * Math.cos(theta);
		lineStartY = fromY + radius * Math.sin(theta);
		lineEndX = (fromX + (radius + arrowLength) * Math.cos(theta));
		lineEndY = (fromY - (radius + arrowLength) * Math.sin(theta));

		line_path_str = "M" + lineStartX + "," + lineStartY
							+ "C" + (fromX + curve_radius * Math.cos(theta))
							+ "," + (fromY + curve_radius * Math.sin(theta))
							+ "," + (fromX + (curve_radius + arrowLength) * Math.cos(theta))
							+ "," + (fromY - (curve_radius + arrowLength) * Math.sin(theta))
							+ "," + lineEndX
							+ "," + lineEndY;

		toX = (toX + radius * Math.cos(theta));
		toY = (toY - radius * Math.sin(theta));
	} else {
		theta = arrow_theta = Math.atan2(yDiff, xDiff);
		lineStartX = fromX + Math.cos(theta) * radius;
		lineStartY = fromY + Math.sin(theta) * radius;
		lineEndX = toX - Math.cos(theta) * arrowLength;
		lineEndY = toY - Math.sin(theta) * arrowLength;

		line_path_str = "M" + lineStartX + "," + lineStartY + "L" + lineEndX + "," + lineEndY
	}

	var off_line = arrowLength * Math.tan(arrowAngleRadians);
	var arrow_path = [
		{x: toX, y:toY}
		, {x: lineEndX + off_line * Math.cos(arrow_theta - Math.PI/2)
			, y: lineEndY + off_line * Math.sin(arrow_theta - Math.PI/2)
		}
		, {x: lineEndX + off_line * Math.cos(arrow_theta + Math.PI/2)
			, y: lineEndY + off_line * Math.sin(arrow_theta + Math.PI/2)
		}
	];
	var arrow_path_str = "M" + _.map(arrow_path, function(point) {
					return point.x+","+point.y;
				}).join("L") + "Z";

	return {
		line: { path: line_path_str }
		, arrow: { path: arrow_path_str }
		, circle: { cx: fromX, cy: fromY, r: radius }
	};
};

var center = function(p1, p2) {
	return { x: (p1.x + p2.x) / 2,
				y: (p1.y + p2.y) / 2 };
};

red.TransitionView = function(options) {
	able.make_this_optionable(this, {
		transition: null,
		paper: null,
		from: {x:0, y:0},
		to: {x:0, y:0},
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
	if(event instanceof red.ParsedEvent) {
		str = event.get_str();
	}
	var c = center(this.option("from"), this.option("to"));
	this.label = paper.text(c.x, c.y+8, str);
	this.label.attr({
		"font-size": "10px",
		"font-family": FONT_FAMILY_STR
	});

	var bbox = this.label.getBBox();
	this.label_background = paper.rect(bbox.x, bbox.y, bbox.width, bbox.height).insertBefore(this.label);
	this.label_background.attr({
		fill: "white",
		"fill-opacity": 0.8,
		stroke: "none"
	});
	
	this.$flash = _.bind(this.flash, this);
	transition.on("fire", this.$flash);
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_optionable(proto);
	proto._on_options_set = function(values) {
		var transition = this.option("transition");
		var paths = this.get_paths();
		this.line_path.attr("path", paths.line.path);
		this.arrow_path.attr("path", paths.arrow.path);
		var event = transition.event();
		var str = "";
		if(event instanceof red.ParsedEvent) {
			str = event.get_str();
		}
		var c = center(this.option("from"), this.option("to"));
		this.label.attr({
			"text": str,
			x: c.x,
			y: c.y + 8
		});
		var bbox = this.label.getBBox();
		this.label_background.attr({
			x: bbox.x,
			y: bbox.y,
			width: bbox.width,
			height: bbox.height
		});
		this.circle.attr({
			cx: paths.circle.cx,
			cy: paths.circle.cy, 
			r: paths.circle.r
		});
	};

	proto.get_paths = function() {
		var from = this.option("from"),
			to = this.option("to"),
			self_pointing_theta = this.option("self_pointing_theta"),
			radius = this.option("radius"),
			arrowLength = this.option("arrowLength"),
			arrowAngleRadians = this.option("arrowAngle") * Math.PI / 180;
		return get_arrow_paths(from, to, self_pointing_theta, radius, arrowLength, arrowAngleRadians);
	};

	proto.flash = function() {
		var paper = this.option("paper");
		var line_elem = this.line_path;
		var arrow = this.arrow_path;
		var len = line_elem.getTotalLength();

		var the_flash = paper.path(line_elem.getSubpath(0, 0));
		the_flash.attr({
			stroke: "red"
			, "stroke-width": 3
			, guide: line_elem
			, along: [0, 0]
		});
		the_flash.animate({
			path: line_elem.getSubpath(0, len)
		}, 200, "ease-in", function() {
			the_flash.animate({
				path: line_elem.getSubpath(4*len/4.1, len)
			}, 200, "ease-out", function() {
				the_flash.remove();
			});
			arrow.attr({"fill": "red"});
			window.setTimeout(function() {
				arrow.animate({
					fill: "black"
				}, 200, "ease-out");
			}, 200);
		});
	};

	proto.remove = function() {
		this.label_background.remove();
		this.label.remove();
		this.circle.remove();
		this.line_path.remove();
		this.arrow_path.remove();
		transition.off("fire", this.$flash);
	};
}(red.TransitionView));

red.StartTransitionView = function(options) {
	able.make_this_optionable(this, {
		transition: null,
		paper: null,
		to: {x:0, y:0},
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
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_optionable(proto);
	proto.get_paths = function() {
		var to = this.option("to"),
			self_pointing_theta = 0,
			radius = this.option("radius"),
			arrowLength = this.option("arrowLength"),
			arrowAngleRadians = this.option("arrowAngle") * Math.PI / 180;

		var from = {x: to.x - this.option("arrowLength") - this.option("radius") - this.option("line_len"), y: to.y};

		return get_arrow_paths(from, to, self_pointing_theta, radius, arrowLength, arrowAngleRadians);
	};

	proto._on_options_set = function(values) {
		var paths = this.get_paths();
		this.line_path.attr("path", paths.line.path);
		this.arrow_path.attr("path", paths.arrow.path);
		this.circle.attr({
			cx: paths.circle.cx,
			cy: paths.circle.cy, 
			r: paths.circle.r
		});
	};
	proto.remove = function() {
		this.line_path.remove();
		this.arrow_path.remove();
		this.circle.remove();
	};
}(red.StartTransitionView));

}(red));
