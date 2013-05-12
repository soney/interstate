/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,jQuery,window */

(function (red, $) {
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
			font_size: "12px",
			padding_top: 0
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

			this.label = new red.EditableText(paper, {x: center.x, y: center.y, text: this.get_name(), fill: this.option("text_background"), color: this.option("text_foreground")});
			this.label.option({
				"font-size": this.option("font_size"),
				"font-family": this.option("font_family")
			});
			this.label.on("change", this.forward);
		};

		proto.get_name = function() {
			var state = this.option("state");
			return state.get_name("parent");
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

		proto.begin_editing = function() {
			var paper = this.option("paper");
			var parentElement = paper.canvas.parentNode;
			this.add_substate = $("<div />").addClass("menu_item")
											.text("Add substate")
											.pressable()
											.on("pressed", $.proxy(function() {
												this._emit("add_substate");
											}, this));
			this.add_transition = $("<div />")	.addClass("menu_item")
												.text("Add transition")
												.pressable()
												.on("pressed", $.proxy(function() {
													console.log("add transition");
												}, this));
			this.edit_actions = $("<div />").addClass("menu_item")
											.text("Actions...")
											.pressable()
											.on("pressed", $.proxy(function() {
												console.log("edit actions");
											}, this));
			this.rename = $("<div />")	.addClass("menu_item")
										.text("Rename")
										.pressable()
										.on("pressed", $.proxy(function() {
											this.begin_rename();
										}, this));
			this.remove = $("<div />")	.addClass("menu_item")
										.text("Remove")
										.pressable()
										.on("pressed", $.proxy(function() {
											this._emit("remove");
										}, this));
			this.make_concurrent = $("<div />")	.addClass("menu_item")
												.text("Concurrent")
												.pressable()
												.on("pressed", $.proxy(function() {
													this._emit("make_concurrent");
												}, this));
			var lwe = this.option("lwe"),
				rws = this.option("rws");
			var PADDING = 1;
			var HEIGHT = 10;
			var width = rws.x-lwe.x - 2*PADDING;
			var x = lwe.x + PADDING;
			var y = lwe.y - HEIGHT/2;

			this.edit_dropdown = $("<div />")	.dropdown({
													text: this.get_name(),
													items: [this.add_substate, this.add_transition, this.edit_actions, this.rename, this.remove, this.make_concurrent]
												})
												.appendTo(parentElement)
												.css({
													position: "absolute",
													left: x + "px",
													top: y + "px",
													width: width + "px"
												});
			this.label.hide();
		};
		proto.done_editing = function() {
			this.edit_dropdown.dropdown("destroy").remove();
			this.label.show();
		};

		proto.begin_rename = function() {
			this.label.show().focus().select();
			this.edit_dropdown.hide();
		};

		proto.end_rename = function() {
			this.edit_dropdown.show();
			this.label.hide();
		};

		proto.get_path_str = function () {
			var pts = [this.option("lws"), this.option("lwe"), this.option("rws"), this.option("rwe")];
			var padding_top = this.option("padding_top");
			var x0 = pts[0].x;
			var y0 = pts[0].y;
			var path_str = "M" + x0 + "," + padding_top + "L" + _.map(pts, function (pt) {
				return pt.x + "," + pt.y;
			}).join("L") + "V"+padding_top+"Z";
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
}(red, jQuery));
