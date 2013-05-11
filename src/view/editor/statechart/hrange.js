/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,jQuery,window,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.HorizontalRangeDisplay = function (options) {
		able.make_this_optionable(this, {
			font_family: "Source Sans Pro",
			font_size: "12px",
			line_color: "black",
			color: "black",
			background: "white",
			height: 10,
			y: 1,
			from_x: 0,
			to_x: 0,
			paper: false,
			text: ""
		}, options);
		var paper = this.option("paper");

		this.left_vline = paper.path("M0,0");
		this.right_vline = paper.path("M0,0");
		this.hline = paper.path("M0,0");
		this.text_background = paper.rect(0,0,0,0);
		this.text_foreground = paper.text(0, 0, this.option("text"));

		this.left_vline.attr({
			stroke: this.option("line_color")
		});
		this.right_vline.attr({
			stroke: this.option("line_color")
		});
		this.hline.attr({
			stroke: this.option("line_color")
		});
		this.text_background.attr({
			stroke: "none",
			fill: this.option("background"),
			"fill-opacity": 0.5
		});
		this.text_foreground.attr({
			fill: this.option("color"),
			"font-family": this.option("font_family"),
			"font-size": this.option("font_size")
		});
		this.update();
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_optionable(proto);

		proto.update = function() {
			var from_x = this.option("from_x"),
				to_x = this.option("to_x"),
				text = this.option("text"),
				y = this.option("y"),
				height = this.option("height");
			this.left_vline.attr({
				path: "M"+from_x+","+y+"V"+(y+height)
			});
			this.right_vline.attr({
				path: "M"+to_x+","+y+"V"+(y+height)
			});
			this.hline.attr({
				path: "M"+from_x+","+(y+height/2)+"H"+to_x
			});
			this.text_foreground.attr({
				x: (from_x + to_x)/2,
				y: y+height/2
			});
			var bbox = this.text_foreground.getBBox();
			this.text_background.attr({
				x: bbox.x,
				y: bbox.y,
				height: bbox.height,
				width: bbox.width
			});
		};

		proto._on_options_set = function () {
			this.update();
		};
	}(red.HorizontalRangeDisplay));
	
}(red, jQuery));
