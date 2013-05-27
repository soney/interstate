/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,jQuery,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	red.StartStateView = function (options) {
		able.make_this_optionable(this, {
			state: null,
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
		this.$on_context_menu = $.proxy(this.on_context_menu, this);
		$(this.circle[0]).on("contextmenu", this.$on_context_menu);
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
			this.circle.remove();
		};
		proto.destroy = function() {
			$(this.circle[0]).off("contextmenu", this.$on_context_menu);
			able.destroy_this_optionable(this);
		};
	}(red.StartStateView));
}(red, jQuery));
