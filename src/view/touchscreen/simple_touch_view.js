/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,easea */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	$.widget("interstate.screen_touches", {
		options: {
			ctx: false,
			paper: false,
			radius: 20,
			touchStartAnimationDuration: 100,
			touchEndAnimationDuration: 200,
			fills: ["EF3B35", "F26B36", "7FC246", "149DD8", "6D287C"],
			strokes: ["87211E", "9C4523", "466B27", "0D688F", "36143D"],
			strokeWidth: "3px"
		},
		_create: function () {
			this._super();
			this._addToPaper();
		},
		_destroy: function () {
			this._super();
			this._removeFromPaper();
		},
		_addToPaper: function() {
			var paper = this.option("paper"),
				touchDisplays = {},
				touchShadows = {},
				ctx = this.option("ctx"),
				radius = this.option("radius"),
				fills = this.option("fills"),
				strokes = this.option("strokes");

			$(window).on('touchstart.simple_touch_view', _.bind(function(jq_event) {
					var event = jq_event.originalEvent,
						touchPathStr = false;

					if(event.touchPath) {
						touchPathStr = _.map(event.touchPath, function(info) {
							var type = info.type,
								touch = info.touch,
								x = touch.pageX,
								y = touch.pageY;

							return (type === "touchstart" ? 'M' : 'L') + x +',' + y;
						}).join("");
					}

					_.each(event.changedTouches, function(touch) {
						var id = touch.identifier,
							x = touch.pageX,
							y = touch.pageY,
							fill = "#" + fills[id%fills.length],
							stroke = "#" + strokes[id%strokes.length];

						var touchDisplay = touchDisplays[id] = paper.circle(x, y, 5).attr({
							opacity: 0.2,
							fill: fill,
							stroke: stroke,
							"stroke-width": this.option("strokeWidth")
						});
						touchDisplay.animate({
								r: this.option("radius"),
								opacity: 1
							},
							this.option("touchStartAnimationDuration"),
							mina.easeinout);
						touchShadows[id] = {
							pathKnown: !!touchPathStr,
							path: paper.path("M"+x+","+y).attr({
								"stroke-width": 8,
								stroke: fill,
								"stroke-linejoin": "round",
								"stroke-linecap": "round",
								fill: "none"
							}),
							animPath: paper.path(touchPathStr || "M0,0").attr({
								opacity: 0.2,
								stroke: fill,
								"stroke-width": 2,
								"stroke-linejoin": "round",
								"stroke-linecap": "round",
								fill: "none"
							}),
							startCircle: paper.circle(x, y, 0).attr({
									fill: fill,
									stroke: fill,
									"fill-opacity": 0.1,
									"stroke-width": this.option("strokeWidth"),
									opacity: 0
								}).animate({
									r: this.option("radius"),
									opacity: 1
								}, this.option("touchStartAnimationDuration"),
								mina.easeinout)
						};
						//touchDisplay.toFront();
					}, this);
				}, this)).on('touchmove.simple_touch_view', _.bind(function(jq_event) {
					var event = jq_event.originalEvent;
					_.each(event.changedTouches, function(touch) {
						var id = touch.identifier,
							x = touch.pageX,
							y = touch.pageY,
							touchDisplay = touchDisplays[id];

						touchDisplay.attr({
							cx: x,
							cy: y
						});

						var touchShadow = touchShadows[id],
							pathDisplay = touchShadow.path;

						pathDisplay.attr("path", pathDisplay.attr("path") + "L"+x+","+y);
					}, this);
				}, this)).on('touchend.simple_touch_view touchcancel.simple_touch_view', _.bind(function(jq_event) {
					var event = jq_event.originalEvent;
					_.each(event.changedTouches, function(touch) {
						var id = touch.identifier,
							x = touch.pageX,
							y = touch.pageY,
							touchDisplay = touchDisplays[id],
							r = touchDisplay.attr("r"),
							touchShadow = touchShadows[id],
							pathDisplay = touchShadow.path,
							animPath = touchShadow.animPath,
							length = pathDisplay.getTotalLength(),
							startCircle = touchShadow.startCircle;

						pathDisplay.attr("path", pathDisplay.attr("path") + "L"+x+","+y);
						if(!touchShadow.pathKnown) {
							animPath.attr("path", pathDisplay.attr("path"));
						}

						var animation_duration = Math.min(Math.max(200, length/3), 900),
							startTime = (new Date()).getTime(),
							endTime = startTime + animation_duration,
							easingFormula = mina.easeinout,
							pct;

						animPath.attr({
							"stroke-width": pathDisplay.attr("stroke-width"),
							opacity: 1.0
						}).animate({
							opacity: 0.2
						});

						touchDisplay.attr({
								cx: x,
								cy: y
							})
							.animate({
								r: 2*touchDisplay.attr("r")/3,
								opacity: 0
							}, animation_duration, mina.easeinout, function() {
								touchDisplay.remove();
							});

						startCircle.animate({
							r: 1.1*startCircle.attr("r"),
							opacity: 0
						}, animation_duration, mina.easeinout, function() {
							startCircle.remove();
						});

						pathDisplay.attr({
								opacity: 0.5
							})
							.animate({
								opacity: 0
							}, animation_duration, mina.easeinout, function() {
								animPath.remove();
								pathDisplay.remove();
							});

						var updateStartCirclePosition = function() {
							var currTime = (new Date()).getTime();

							if(currTime <= endTime) {
								var pct = ((currTime - startTime) / animation_duration),
									pos = pathDisplay.getPointAtLength(pct*length);
								animPath.attr("path", pathDisplay.getSubpath(length*pct, length));
								requestAnimationFrame(updateStartCirclePosition);
							}
						};
						requestAnimationFrame(updateStartCirclePosition);
						updateStartCirclePosition();
						delete touchShadows[id];
						delete touchDisplays[id];
					}, this);
				}, this));
		},

		_removeFromPaper: function() {
			$(window).off('.simple_touch_view');
		}
	});
}(interstate, jQuery));
