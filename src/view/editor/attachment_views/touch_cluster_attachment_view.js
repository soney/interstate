/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var name = ist.attachmentViews.touch_cluster = "touch_cluster_attachment_view";
	$.widget("interstate." + name, {
		options: {
			client: false,
			circleRadius: 10,
			circlePadding: 2
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
			var client = this.option("client");

			this.$numFingers = client.get_$("prop_val", "numFingers");
			this.$satisfied = client.get_$("_attachment_call", "touch_cluster", "isSatisfied");
			this.$tc_id = client.get_$("_attachment_call", "touch_cluster", "tc_id");
			this.$claims_touches = client.get_$("_attachment_call", "touch_cluster", "claimsTouches");

			var paper = new Snap(0,0);

			this.element.append(paper.node);
			var circles = [];

			this.live_fn = cjs.liven(function() {
				var numFingers = this.$numFingers.get(),
					satisfied = this.$satisfied.get(),
					claimsTouches = this.$claims_touches.get(),
					circleRadius = this.option("circleRadius"),
					circlePadding = this.option("circlePadding"),
					tc_id = this.$tc_id.get(),
					fill = ist.touchClusterColors.fills[tc_id%ist.touchClusterColors.fills.length],
					stroke = ist.touchClusterColors.fills[tc_id%ist.touchClusterColors.strokes.length];

				if(_.isNumber(numFingers) && numFingers !== circles.length) {

					if(circles.length > numFingers) {
						var to_remove = _.last(circles, circles.length - numFingers);
						_.eatch(circles.splice(numFingers, circles.length - numFingers), function(circ) {
							circ.remove();
						});
					}

					while(circles.length < numFingers) {
						var circle = paper.circle(2*(circleRadius+circlePadding)*(circles.length+0.5), circlePadding + circleRadius, circleRadius).attr({
							"stroke-width": 2
						});
						circles.push(circle);
					}
					paper.attr({
						width: 2*numFingers * (circleRadius + circlePadding) - circlePadding/2,
						height: 2 * (circleRadius + circlePadding)
					});
				}

				if(satisfied) {
					var attrs = {
						fill: claimsTouches ? fill : "none",
						stroke: stroke
					};
					_.each(circles, function(circle) {
						circle.attr(attrs);
					});
				} else {
					_.each(circles, function(circle) {
						circle.attr({
							fill: 'none',
							stroke: "#CCC"
						});
					});
				}
			}, {
				context: this
			});
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
