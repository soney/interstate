(function(red) {
var cjs = red.cjs, _ = red._;
var Arrow = function(paper, options) {
	this.options = _.extend({
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
	this.paper = paper;

	if(this.options.animate_creation) {
		this.expanded = false;
		this.ellipse = paper.ellipse(this.options.fromX
									, this.options.bottom
									, 0
									, 0);
		this.line = paper.path("M"+this.options.fromX+","+this.options.bottom);
		this.triangle = paper.path("M"+this.options.fromX+","+this.options.bottom);
		this.expand();
	} else {
		this.expanded = true;
		this.ellipse = paper.ellipse(this.options.fromX
									, this.options.fromY
									, this.options.radius
									, this.options.radius);
		this.line = paper.path(this.getLinePath());
		this.triangle = paper.path(this.getTrianglePath());
	}
};
(function(my) {
	var proto = my.prototype
	proto.getTheta = function() {
		var dy = this.options.toY - this.options.fromY;
		var dx = this.options.toX - this.options.fromX;
		return Math.atan2(dy, dx);
	};
	proto.getLinePath = function() {
		var xDiff = this.options.fromX - this.options.toX;
		var yDiff = this.options.fromY - this.options.toY;
		if(Math.pow(xDiff, 2) + Math.pow(yDiff, 2) <= Math.pow(this.options.radius + this.options.arrowLength, 2)) {
			var fromX = this.options.fromX;
			var fromY = this.options.fromY;
			var radius = this.options.radius;
			var curve_radius = 2*radius * radius;
			var theta = this.options.self_pointing_theta * Math.PI/180;
			var arrowLength = this.options.arrowLength;

			return    "M" + (fromX + radius * Math.cos(theta))+","+(fromY + radius * Math.sin(theta))
					+ "C" + (fromX + curve_radius * Math.cos(theta))+","+(fromY + curve_radius * Math.sin(theta))
					+ "," + (fromX + (curve_radius + arrowLength) * Math.cos(theta))+","+(fromY - (curve_radius + arrowLength) * Math.sin(theta))
					+ "," + (fromX + (radius + arrowLength) * Math.cos(theta))+","+(fromY - (radius + arrowLength) * Math.sin(theta))
		} else {
			var lineStart = this.getLineStart();
			var lineEnd = this.getLineEnd();
			return "M"+lineStart.x+","+lineStart.y+"L"+lineEnd.x+","+lineEnd.y;
		}

	};
	proto.getLineStart = function() {
		var theta = this.getTheta();
		return {
			x: this.options.fromX + Math.cos(theta) * this.options.radius
			, y: this.options.fromY + Math.sin(theta) * this.options.radius
		};
	};
	proto.getLineEnd = function() {
		var theta = this.getTheta();
		return {
			x: this.options.toX - Math.cos(theta) * this.options.arrowLength
			, y: this.options.toY - Math.sin(theta) * this.options.arrowLength
		};
	};
	proto.getTrianglePath = function() {
		var xDiff = this.options.fromX - this.options.toX;
		var yDiff = this.options.fromY - this.options.toY;

		var theta, lineEndX, lineEndY, toX, toY;

		if(Math.pow(xDiff, 2) + Math.pow(yDiff, 2) <= Math.pow(this.options.radius + this.options.arrowLength, 2)) {
			theta = (this.options.self_pointing_theta - 90) * Math.PI/180;
			lineEndX = (this.options.fromX + (this.options.radius + this.options.arrowLength) * Math.cos(theta));
			lineEndY = (this.options.fromY + (this.options.radius + this.options.arrowLength) * Math.sin(theta));
			toX = (this.options.fromX + (this.options.radius) * Math.cos(theta));
			toY = (this.options.fromY + (this.options.radius) * Math.sin(theta));
		} else {
			theta = this.getTheta();
			var line_end = this.getLineEnd();
			lineEndX = line_end.x;
			lineEndY = line_end.y;
			toX = this.options.toX;
			toY = this.options.toY;
		}
			
		var arrowAngleRadians = this.options.arrowAngle * Math.PI/180;

		var off_line = this.options.arrowLength * Math.tan(arrowAngleRadians);
		
		var path = [
			{x: toX, y:toY}
			, {x: lineEndX + off_line * Math.cos(theta - Math.PI/2)
				, y: lineEndY + off_line * Math.sin(theta - Math.PI/2)
			}
			, {x: lineEndX + off_line * Math.cos(theta + Math.PI/2)
				, y: lineEndY + off_line * Math.sin(theta + Math.PI/2)
			}
		];
		return "M" + _.map(path, function(point) {
						return point.x+","+point.y;
					}).join("L") + "Z";
	};
	proto.collapse = function() {
		this.ellipse.animate({
			cx: this.options.fromX
			, cy: this.options.bottom
			, rx: 0
			, ry: 0
		}, this.options.animation_duration);
		this.line.animate({
			path: "M"+this.options.fromX+","+this.options.bottom
		}, this.options.animation_duration);
		this.triangle.animate({
			path: "M"+this.options.fromX+","+this.options.bottom
		}, this.options.animation_duration);
		this.expanded = false;
	};
	proto.expand = function() {
		this.expanded = true;
		var lineStart = this.getLineStart();
		var lineEnd = this.getLineEnd();
		this.ellipse.animate({
			cx: this.options.fromX
			, cy: this.options.fromY
			, rx: this.options.radius
			, ry: this.options.radius
		}, this.options.animation_duration);
		this.line.animate({
			path: this.getLinePath()
		}, this.options.animation_duration);
		this.triangle.animate({
			path: this.getTrianglePath()
		}, this.options.animation_duration);
	};
	proto.remove = function() {
		this.ellipse.remove();
		this.line.remove();
		this.triangle.remove();
	};
	proto.option = function(key, value, animated) {
		if(arguments.length <= 1) {
			return this.options[key];
		} else {
			this.options[key] = value;
			var animation_duration = animated ? this.options.animation_duration : 0;
			if(this.expanded) {
				this.ellipse.animate({
					cx: this.options.fromX
					, cy: this.options.fromY
					, rx: this.options.radius
					, ry: this.options.radius
				}, animation_duration);
				this.line.animate({
					path: this.getLinePath()
				}, animation_duration);
				this.triangle.animate({
					path: this.getTrianglePath()
				}, animation_duration);
			} else {
				this.ellipse.animate({
					cx: this.options.fromX
					, cy: this.options.bottom
					, rx: 0
					, ry: 0
				}, 0);
				this.line.animate({
					path: "M"+this.options.fromX+","+this.options.bottom
				}, 0);
				this.triangle.animate({
					path: "M"+this.options.fromX+","+this.options.bottom
				}, 0);
			}
			return this;
		}
	};
} (Arrow));
red.define("arrow", function(a, b) { return new Arrow(a,b); });

var Transition = function(transition, paper, options) {
	this.options = _.extend({
		from_view: null
		, animate_creation: false
		, y_offset: 4
		, y: 0
	}, options);

	this.transition = transition;
	this.paper = paper;
	var from_view = this.option("from_view");
	var to_view = this.option("to_view");
	this.arrow = red.create("arrow", this.paper, {
		fromX: from_view.option("left") + from_view.option("width")/2
		, toX: to_view.option("left") + to_view.option("width")/2
		, animate_creation: this.option("animate_creation")
		, fromY: this.option("y")
		, toY: this.option("y")
	});
	var event = this.transition.event();
	this.label = red.create("editable_text", this.paper, {
		x: (this.arrow.option("fromX") + this.arrow.option("toX"))/2
		, y: (this.arrow.option("fromY") + this.arrow.option("toY"))/2 - this.option("y_offset")
		, width: Math.max(from_view.option("width"), Math.abs(this.arrow.option("fromX") - this.arrow.option("toX")) - this.arrow.option("radius") - this.arrow.option("arrowLength"))
		, text_anchor: "middle"
		, text: event.get_str()
		, default: "<event>"
	});
	this.$onSetEventRequest = _.bind(this.onSetEventRequest, this);
	this.label.on("change", this.$onSetEventRequest);
};

(function(my) {
	var proto = my.prototype;
	proto.onSetEventRequest = function(e) {
		var str = e.value;
		var transition_event = this.transition.event();
		transition_event.set_str(str);
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
}(Transition));

red.define("transition", function(a,b,c) { return new Transition(a,b,c); });

}(red));
