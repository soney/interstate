(function(red) {
var cjs = red.cjs, _ = red._;
Raphael.fn.addGuides = function() {
	this.ca.guide = function(g) {
		return {
			guide: g
		};
	};
	this.ca.along = function(from_percent, to_percent) {
		var g = this.attr("guide");
		var len = g.getTotalLength();
		if(from_percent === to_percent && to_percent === 1) { from_percent = 0.9999; }
		var subpath = g.getSubpath(from_percent*len, to_percent*len);
		return { path: subpath };
	};
};
var Arrow = function(paper, options) {
	red.make_this_optionable(this, {
		arrowLength: 7
		, fromX: 10
		, toX: 20
		, fromY: 20
		, toY: 20
		, radius: 3
		, arrowAngle: 20
		, bottom: 45
		, animation_duration: 600
		, self_pointing_theta: 45
		, animate_creation: false
	}, options);

	this.state_attrs = this.get_state_attrs();

	this.rrcompound = red.create("rrcompound", paper, {
		contents: {
			"arrow": "path"
			, "line": "path"
			, "circle": "circle"
		}
		, attrs: this.state_attrs
	});
	this.paper = paper;
	this.paper.addGuides();
};

(function(my) {
	var proto = my.prototype;
	red.make_proto_optionable(proto);

	proto.get_state_attrs = function() {
		var fromX = this.option("fromX")
			, fromY = this.option("fromY")
			, toX = this.option("toX")
			, toY = this.option("toY");

		var xDiff = toX - fromX
			, yDiff = toY - fromY;

		var radius = this.option("radius")
			, arrowLength = this.option("arrowLength")
			, arrowAngleRadians = this.option("arrowAngle") * Math.PI/180;

		var line_path_str;
		var lineStartX, lineStartY, lineEndX, lineEndY, theta, arrow_theta;

		if(Math.pow(xDiff, 2) + Math.pow(yDiff, 2) <= Math.pow(radius + arrowLength, 2)) {
			var curve_radius = 2*radius * radius;

			theta = this.option("self_pointing_theta") * Math.PI/180;
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
	proto.flash = function() {
		var line = this.rrcompound.find("line");
		var arrow = this.rrcompound.find("arrow");
		var line_elem = line.get_element();
		var len = line_elem.getTotalLength();

		var the_flash = this.paper.path(line_elem.getSubpath(0, 0));
		the_flash.attr({
			stroke: "red"
			, "stroke-width": 3
			, guide: line_elem
			, along: [0, 0]
		});
		the_flash.animate({
			along: [0, 1]
		}, 400, "ease-in", function() {
			the_flash.animate({
				along: [1, 1]
			}, 400, "ease-out", function() {
				the_flash.remove();
				console.log("all done");
			});
			arrow.option({"fill": "red"});
			arrow.option({
				fill: "white"
			}, {
				ms: 400
				, easing: "ease-out"
			});
		});

	};
	proto.get_attrs = function() {
		var attrs = {};
		if(this.expanded) { _.deepExtend(attrs, this.state_attrs.expanded); }
		else { _.deepExtend(attrs, this.state_attrs.collapsed); }

		if(this.highlighted) { _.deepExtend(attrs, this.state_attrs.highlighted); }
		else { _.deepExtend(attrs, this.state_attrs.dim); }

		
		return attrs;
	};

	proto.collapse = function() {
		this.expanded = false;
		this.rrcompound.option("attrs", this.get_attrs(), this.option("animation_duration"));
	};
	proto.expand = function() {
		this.expanded = true;
		this.rrcompound.option("attrs", this.get_attrs(), this.option("animation_duration"));
	};

	proto._on_options_set = function(key, value, animated) {
		this.state_attrs = this.get_state_attrs();
		this.rrcompound.option("attrs", this.get_attrs(), animated);
	};
	proto.remove = function (animated) {
		if(animated) {
			this.collapse({
				callback: function() {
				}
			});
		} else {
			this.rrcompound.remove();
		}
	};
}(Arrow));
red.define("arrow", function(a, b) { return new Arrow(a,b); });

var Transition = function(transition, paper, options) {
	red.make_this_listenable(this);
	red.make_this_optionable(this, {
		from_view: null
		, animate_creation: false
		, y_offset: 4
		, y: 0
	}, options);

	this.transition = transition;
	this.paper = paper;
	var from_view = this.option("from_view");
	var to_view = this.option("to_view");

	console.log(to_view.option("state_name"), to_view.option("x"));
	//console.log("from_x: " + from_view.option("x"), "from_width: " + from_view.option("width"), "to_x: " + to_view.option("x") , "to_width: " + to_view.option("width"));
	//console.log(to_view.antenna.rrcompound.find("circle")._element.node);

	this.arrow = red.create("arrow", this.paper, {
		fromX: from_view.option("x") + from_view.option("width")/2
		, toX: to_view.option("x") + to_view.option("width")/2
		, animate_creation: this.option("animate_creation")
		, fromY: this.option("y")
		, toY: this.option("y")
	});
	var event = this.transition.event();
	this.label = red.create("editable_text", this.paper, {
		x: (this.arrow.option("fromX") + this.arrow.option("toX"))/2
		, y: (this.arrow.option("fromY") + this.arrow.option("toY"))/2 - this.option("y_offset")
		, width: Math.max(from_view.option("width"), Math.abs(this.arrow.option("fromX") - this.arrow.option("toX")) - this.arrow.option("radius") - this.arrow.option("arrowLength"))
		, "text-anchor": "middle"
		, text: event.get_str()
		, default: "<event>"
	});

	var update_position = _.bind(function() {
		this.arrow.option({
			fromX: from_view.option("x") + from_view.option("width")/2
			, toX: to_view.option("x") + to_view.option("width")/2
			, animate_creation: this.option("animate_creation")
			, fromY: this.option("y")
			, toY: this.option("y")
		});
		this.label.option({
			x: (this.arrow.option("fromX") + this.arrow.option("toX"))/2
			, y: (this.arrow.option("fromY") + this.arrow.option("toY"))/2 - this.option("y_offset")
			, width: Math.max(from_view.option("width"), Math.abs(this.arrow.option("fromX") - this.arrow.option("toX")) - this.arrow.option("radius") - this.arrow.option("arrowLength"))
		});
	}, this);

	from_view.transition_column.on("move", update_position);
	to_view.transition_column.on("move", update_position);
	from_view.transition_column.on("resize", update_position);
	to_view.transition_column.on("resize", update_position);

	this.$onSetEventRequest = _.bind(this.onSetEventRequest, this);
	this.label.on("change", this.$onSetEventRequest);
};

(function(my) {
	var proto = my.prototype;
	red.make_proto_listenable(proto);
	red.make_proto_optionable(proto);
	proto.onSetEventRequest = function(e) {
		var str = e.value;
		var transition_event = this.transition.event();
		this._emit("set_event_str", {
			transition: this.transition
			, originalEvent: e
			, str: str
			, transition_event: this.transition.event()
		});
	};
	proto.option = function(key, value, animated) {
		if(arguments.length <= 1) {
			return this.options[key];
		} else {
			this.options[key] = value;
			if(key === "y") {
				this.arrow.option("fromY", this.option("y"), animated);
				this.arrow.option("toY", this.option("y"), animated);
				this.label.option("y", (this.arrow.option("fromY") + this.arrow.option("toY"))/2 - this.option("y_offset"));
			}
		}
	};
	proto.remove = function() {
		this.arrow.remove();
		this.label.remove();
	};
}(Transition));

red.define("transition", function(a,b,c) { return new Transition(a,b,c); });
}(red));
