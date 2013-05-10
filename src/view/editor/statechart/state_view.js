/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

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
			default_stroke: "black",
			default_fill: "white",
			active_fill: "red",
			active_stroke: "red",
			text_foreground: "black",
			text_background: "white",
			font_family: "Source Sans Pro",
			font_size: "12px"
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
			var center = this.option("c");

			var name = state.get_name("parent");
			this.label = new red.EditableText(paper, {x: center.x, y: center.y, text: name, fill: this.option("text_background"), color: this.option("text_foreground")});
			this.label.option({
				"font-size": this.option("font_size"),
				"font-family": this.option("font_family")
			});
			this.label.on("change", this.forward);
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
		};
		proto.destroy = function() {
			this.active_fn.destroy();
		};
	}(red.StateView));
}(red));
