/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var name = ist.attachmentViews.event = "event_attachment_view";
	$.widget("interstate." + name, {
		options: {
			client: false,
			circleRadius: 10,
			circlePadding: 5,
			green_shade: "#2D8735",
			yellow_shade: "#E8942C",
			red_shade: "#CC3333",
			blocked_shade: "#13394D",
			stroke_width: 2
		},
		_create: function() {
			this._addContentBindings();
			this._addSnapBindings();
		},
		_destroy: function() {
			var client = this.option("client");

			this._removeContentBindings();
			this._removeSnapBindings();
			this._super();
		},
		_addSnapBindings: function() {
			var client = this.option("client"),
				radius = this.option("circleRadius"),
				padding = this.option("circlePadding"),
				paper = Snap(3*(2*radius + padding) + padding, 2*(radius + padding));

			this.element.append(paper.node);

			var red_light = paper.circle( padding + radius, padding + radius, radius).attr({
					fill: this.option("red_shade"),
					stroke: this.option("red_shade"),
					"stroke-width": this.option("stroke_width"),
					"fill-opacity": 0
				}),
				yellow_light = paper.circle( 2*padding + 3*radius, padding + radius, radius).attr({
					fill: this.option("yellow_shade"),
					stroke: this.option("yellow_shade"),
					"stroke-width": this.option("stroke_width"),
					"fill-opacity": 0
				}),
				green_light = paper.circle( 3*padding + 5*radius, padding + radius, radius).attr({
					fill: this.option("green_shade"),
					stroke: this.option("green_shade"),
					"stroke-width": this.option("stroke_width"),
					"fill-opacity": 0
				}),
				blocked_background = paper.rect(0,0,paper.attr("width"), paper.attr("height")).attr({
					fill: "white",
					"fill-opacity": 0
				}),
				blocked_text = paper.text(yellow_light.attr("cx"), radius + padding + 5, "blocked").attr({
					fill: this.option("blocked_shade"),
					"font-family": "Helvetica Neue",
					"text-anchor": "middle",
					"fill-opacity": 0
				});

			this.$status = client.get_$("prop_val", "status");
			this.$discrete = client.get_$("prop_val", "discrete");

			this.live_fn = cjs.liven(function() {
				var status = this.$status.get(),
					discrete = this.$discrete.get(),
					to_dim,
					to_brighten;
				if(status === "possible") {
					to_dim = [red_light, green_light, blocked_text, blocked_background];
					to_brighten = [yellow_light];
				} else if(status === "began") {
					to_dim = [yellow_light, green_light, blocked_text, blocked_background];
					to_brighten = [green_light];
				} else if(status === "failed") {
					to_dim = [yellow_light, green_light, blocked_text, blocked_background];
					to_brighten = [red_light];
				} else if(status === "blocked") {
					to_dim = [yellow_light, green_light, blocked_text];
					to_brighten = [red_light, blocked_text, blocked_background];
				} else {
					to_dim = [red_light, yellow_light, green_light, blocked_text];
					to_brighten = [];
				}

				_.each(to_dim, function(node) {
					node.animate({
						"fill-opacity": 0
					}, 200, mina.easeinout);
				});
				_.each(to_brighten, function(node) {
					node.animate({
						"fill-opacity": node === blocked_background ? 0.5 : 1
					}, 200, mina.easeinout);
				});
			}, {
				context: this
			})

		},
		_removeSnapBindings: function() {
		},
		_addContentBindings: function() {
		},
		_removeContentBindings: function() {
		},
		_addClassBindings: function() {
			this.element.addClass("raphael_attachment_view");
		},
		_removeClassBindings: function() {
			this.element.removeClass("raphael_attachment_view");
		},
	});
}(interstate, jQuery));
