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
			fill_color: "black",
			padding_top: 0
		}, options);

		var paper = this.option("paper");
		var center = this.option("c");
		this.circle = paper.circle(center.x, center.y + this.option("padding_top"), this.option("radius"));
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
				cy: center.y + this.option("padding_top"),
				r: this.option("radius")
			});
		};

		proto.begin_editing = function() {
		};
		proto.done_editing = function() {
		};
		proto.remove = function () {
			this.circle.remove();
		};
		proto.destroy = function() {
			able.destroy_this_optionable(this);
		};
	}(red.StartStateView));
}(red));
