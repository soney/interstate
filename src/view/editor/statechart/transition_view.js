/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

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
			self_pointing_theta: 40,
			color: "black",
			active_color: "red",
			text_background: "white",
			text_foreground: "black",
			font_family: "Sourse Sans Pro",
			font_size: "13px",
			padding_top: 0
		}, options);
		var paper = this.option("paper");
		var paths = this.get_paths();

		this.line_path = paper.path(paths.line.path);
		this.line_path.attr({
			stroke: this.option("color")
		});
		this.arrow_path = paper.path(paths.arrow.path);
		this.arrow_path.attr({
			fill: this.option("color"),
			stroke: "none"
		});
		this.circle = paper.circle(paths.circle.cx, paths.circle.cy, paths.circle.r);
		this.circle.attr({
			fill: this.option("color"),
			stroke: "none"
		});
		var transition = this.option("transition");
		var event = transition.event();
		var str = "";
		if (event instanceof red.ParsedEvent) {
			str = event.get_str();
		}
		var c = center(this.option("from"), this.option("to"));
		this.label = new red.EditableText(paper, {x: c.x, y: c.y + 8, text: str, fill: this.option("text_background"), color: this.option("text_foreground")});
		this.label.option({
			"font-size": this.option("font_size"),
			"font-family": this.option("font_family")
		});
		
		this.$flash = _.bind(this.flash, this);
		transition.on("fire", this.$flash);
		this.label.on("change", this.forward);
		var from = this.option("from");

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
		};

		proto.get_paths = function () {
			var from = this.option("from"),
				to = this.option("to"),
				self_pointing_theta = this.option("self_pointing_theta"),
				radius = this.option("radius"),
				arrowLength = this.option("arrowLength"),
				arrowAngleRadians = this.option("arrowAngle") * Math.PI / 180;
			var padding_top = this.option("padding_top");
			
			return get_arrow_paths({x: from.x, y: from.y + padding_top}, {x: to.x, y: to.y + padding_top}, self_pointing_theta, radius, arrowLength, arrowAngleRadians);
		};

		proto.flash = function () {
			var paper = this.option("paper");
			var line_elem = this.line_path;
			var arrow = this.arrow_path;
			var len = line_elem.getTotalLength();

			var the_flash = paper.path(line_elem.getSubpath(0, 0));
			the_flash.attr({
				stroke: this.option("active_color"),
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
						fill: this.option("color")
					}, 200, "ease-out");
				}, 200);
			});
		};

		proto.remove = function () {
			this.label.remove();
			this.circle.remove();
			this.line_path.remove();
			this.arrow_path.remove();
			var transition = this.option("transition");
			transition.off("fire", this.$flash);
		};

		proto.destroy = function () {
		};
	}(red.TransitionView));
}(red));
