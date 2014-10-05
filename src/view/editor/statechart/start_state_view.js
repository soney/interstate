/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery*/

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var highlight_running = ist.__debug_statecharts;

	ist.StartStateView = function (options) {
		able.make_this_optionable(this, {
			state: null,
			paper: null,
			layout: false,
			radius: 6,
			fill_color: "black",
			padding_top: 0,
			paper_height: 9999,
			vline_color: "#CCC",
			vline_dasharray: "1,2",
			active_fill: ist.__debug_statecharts ? "red" : "black",
			running_stroke: "#99E",
			stroke: "none",
			running_stroke_width: 3,
			stroke_width: 0
		}, options);

		this.initialize();
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_optionable(proto);

		proto.initialize = function() {
			var paper = this.option("paper");
			var layout = this.option("layout");
			var state = this.option("state");
			var active = state.get_$("isActive");
			this.active_fn = cjs.liven(function () {
				if (active.get()) {
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
				var running = state.get_$("isRunning");
				this.running_fn = cjs.liven(function () {
					//var state = this.option("state");
					if (running.get()) {
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

			this.vline = paper	.path("M" + layout.x + "," + layout.y + "V" + this.option("paper_height"))
								.attr({
									stroke: this.option("vline_color"),
									"stroke-dasharray": this.option("vline_dasharray")
								});
			this.vline.prependTo(paper);
			this.circle = paper.circle(layout.x, layout.y + this.option("padding_top"), this.option("radius"));
			this.circle.attr({
				fill: this.option("fill_color"),
				stroke: "none"
			});
			$(this.circle.node).on("contextmenu.cm", function() {
			});
		};

		proto.toFront = function() {
			var paper = this.option("paper");
			if(this.vline) {
				this.vline.appendTo(paper);
			}
			if(this.circle) {
				this.circle.appendTo(paper);
			}
		};

		proto._on_options_set = function (values) {
			var paper = this.option("paper");
			var layout = this.option("layout");
			var paper_height = this.option("paper_height");
			if(this.circle) {
				this.circle.attr({
					cx: layout.x,
					cy: layout.y + this.option("padding_top"),
					r: this.option("radius")
				});
			}
			if(this.vline) {
				this.vline	.attr({
								path: "M" + layout.x + "," + layout.y + "V" + paper_height
							});
				this.vline.appendTo(paper);
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
				$(this.circle.node).off("contextmenu.cm");
			}
			able.destroy_this_optionable(this);
			if(this.active_fn) {
				this.active_fn.destroy();
				delete this.active_fn;
			}
			if(this.running_fn) {
				this.running_fn.destroy();
				delete this.running_fn;
			}
		};
	}(ist.StartStateView));
}(interstate, jQuery));
