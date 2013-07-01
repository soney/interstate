/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,jQuery,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var highlight_running = red.__debug_statecharts;

	red.StartStateView = function (options) {
		able.make_this_optionable(this, {
			state: null,
			paper: null,
			c: {x: 0, y: 0},
			radius: 6,
			fill_color: "black",
			padding_top: 0,
			paper_height: 9999,
			vline_color: "#CCC",
			vline_dasharray: ". ",
			active_fill: red.__debug_statecharts ? "red" : "black",
			running_stroke: "#99E",
			stroke: "none",
			running_stroke_width: 3,
			stroke_width: 0
		}, options);

		var state = this.option("state");
		if (state.is_initialized()) {
			this.initialize();
		} else {
			state.once("initialized", _.bind(this.initialize, this));
		}
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_optionable(proto);

		proto.initialize = function() {
			var paper = this.option("paper");
			var center = this.option("c");
			var state = this.option("state");
			this.active_fn = cjs.liven(function () {
				if (state.is_initialized() && state.is_active()) {
					if (this.circle) {
						this.circle.attr({
							fill: this.option("active_fill")
						});
					}
				} else {
					if (this.circle) {
						this.circle.attr({
							fill: this.option("fill_color")
						});
					}
				}
			}, {
				context: this
			});
			if(highlight_running) {
				this.running_fn = cjs.liven(function () {
					var state = this.option("state");
					if (state.is_initialized() && state.get_$running()) {
						if (this.circle) {
							this.circle.attr({
								"stroke": this.option("running_stroke"),
								"stroke-width": this.option("running_stroke_width")
							});
						}
					} else {
						if (this.circle) {
							this.circle.attr({
								"stroke": this.option("stroke"),
								"stroke-width": this.option("stroke_width")
							});
						}
					}
				}, {
					context: this
				});
			}

			this.$on_context_menu = $.proxy(this.on_context_menu, this);
			this.vline = paper	.path("M" + center.x + "," + center.y + "V" + this.option("paper_height"))
								.attr({
									stroke: this.option("vline_color"),
									"stroke-dasharray": this.option("vline_dasharray")
								});
			this.circle = paper.circle(center.x, center.y + this.option("padding_top"), this.option("radius"));
			this.circle.attr({
				fill: state.is_active() ? this.option("active_fill") : this.option("fill_color"),
				stroke: "none"
			});
			$(this.circle[0]).on("contextmenu", this.$on_context_menu);
		};

		proto.toFront = function() {
			if(this.vline) {
				this.vline.toFront();
			}
			if(this.circle) {
				this.circle.toFront();
			}
		};

		proto._on_options_set = function (values) {
			var paper = this.option("paper");
			var center = this.option("c");
			var paper_height = this.option("paper_height");
			if(this.circle) {
				this.circle.attr({
					cx: center.x,
					cy: center.y + this.option("padding_top"),
					r: this.option("radius")
				});
			}
			if(this.vline) {
				this.vline	.attr({
								path: "M" + center.x + "," + center.y + "V" + paper_height
							})
							.toBack();
			}
		};

		proto.on_context_menu = function(event) {
			event.preventDefault();
			event.stopPropagation();
			var parent = this.option("parent");
			var outgoing_transition = this.option("state").get_outgoing_transition();
			var view = parent.get_view(outgoing_transition);
			if(view) {
				view.show_menu();
			}
		};

		proto.begin_editing = function() {
		};
		proto.done_editing = function() {
		};
		proto.remove = function () {
			if(this.circle) {
				this.circle.remove();
			}
			if(this.vline) {
				this.vline.remove();
			}
		};
		proto.destroy = function() {
			if(this.circle) {
				$(this.circle[0]).off("contextmenu", this.$on_context_menu);
			}
			able.destroy_this_optionable(this);
			this.active_fn.destroy();
			if(this.running_fn) {
				this.running_fn.destroy();
			}
		};
	}(red.StartStateView));
}(red, jQuery));
