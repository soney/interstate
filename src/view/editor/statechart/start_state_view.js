/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	red.StartStateView = function (options) {
		able.make_this_optionable(this, {
			transition: null,
			paper: null,
			c: {x: 0, y: 0},
			radius: 6,
			fill_color: "black"
		}, options);

		var paper = this.option("paper");
		var center = this.option("c");
		this.circle = paper.circle(center.x, center.y, this.option("radius"));
		this.circle.attr({
			fill: this.option("fill_color"),
			stroke: "none"
		});
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_optionable(proto);

		proto._on_options_set = function (values) {
			var paper = this.option("paper");
			var center = this.option("c");
			this.circle.attr({
				cx: center.x,
				cy: center.y,
				r: this.option("radius")
			});
		};
		proto.remove = function () {
			this.circle.remove();
		};
		proto.destroy = function() {
		};
	}(red.StartStateView));
}(red));
