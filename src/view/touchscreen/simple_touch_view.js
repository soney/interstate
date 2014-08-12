/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

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
					var event = jq_event.originalEvent;
					_.each(event.changedTouches, function(touch) {
						var id = touch.identifier,
							x = touch.pageX,
							y = touch.pageY,
							fill = "#" + fills[id%fills.length],
							stroke = "#" + strokes[id%strokes.length];

						var touchDisplay = touchDisplays[id] = paper.circle(x, y, 0).attr({
							opacity: 0.2,
							fill: fill,
							stroke: stroke,
							"stroke-width": this.option("strokeWidth"),
							"stroke-linejoin": "round"
						});
						touchDisplay.animate({
								r: this.option("radius"),
								opacity: 1
							},
							this.option("touchStartAnimationDuration"),
							"easeInOut");
						touchShadows[id] = {
							path: paper.path("M"+x+","+y).attr({
								"stroke-width": 8,
								stroke: fill
							}),
							startCircle: paper.circle(x, y, 0).attr({
									fill: fill,
									stroke: stroke,
									"stroke-width": this.option("strokeWidth"),
									opacity: 0
								}).animate({
									r: this.option("radius"),
									opacity: 1
								}, this.option("touchStartAnimationDuration"),
								"easeInOut")
						};
							/*

						ctx.save();
						ctx.beginPath();
						ctx.fillStyle = touchDisplay.attr("fill");
						ctx.strokeStyle = touchDisplay.attr("stroke");
						ctx.lineWidth = 3;
						ctx.arc(x,y,radius,0,2*Math.PI);
						ctx.closePath();
						ctx.fill();
						ctx.stroke();
						ctx.restore();
						*/
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

						var pathDisplay = touchShadows[id].path;
						pathDisplay.attr("path", pathDisplay.attr("path") + "L"+x+","+y);
						/*

						ctx.save();
						ctx.beginPath();
						ctx.moveTo(oldX, oldY);
						ctx.lineTo(x, y);
						ctx.globalAlpha = 0.3;
						ctx.lineWidth = 8;
						ctx.strokeStyle = touchDisplay.attr("fill");
						ctx.stroke();
						ctx.restore();
						*/
					}, this);
				}, this)).on('touchend.simple_touch_view touchcancel.simple_touch_view', _.bind(function(jq_event) {
					var event = jq_event.originalEvent;
					_.each(event.changedTouches, function(touch) {
						var id = touch.identifier,
							x = touch.pageX,
							y = touch.pageY,
							touchDisplay = touchDisplays[id],
							r = touchDisplay.attr("r");

						touchDisplay.attr({
							cx: x,
							cy: y
						});
						touchDisplay.animate({
								r: 0,
								opacity: 0
							},
							this.option("touchEndAnimationDuration"), 
							"easeInOut", function() {
								touchDisplay.remove();
							});
						var shadows = touchShadows[id];
						var path = shadows.path,
							animPath = paper.path(path.attr("path")).attr({
								"stroke-width": path.attr("stroke-width"),
								stroke: path.attr("stroke")
							}),
							length = path.getTotalLength(),
							node = path[0],
							counter = 0,
							animation,
							startCircle = shadows.startCircle;

						var animation_duration = length/3,
							startTime = (new Date()).getTime(),
							endTime = startTime + animation_duration,
							easingFormula = Raphael.easing_formulas.easeInOut;

						var endCircle = shadows.endCircle = paper.circle(x, y, r).attr({
									fill: touchDisplay.attr("stroke"),
									stroke: "none"
								}).animate({
									r: r/3,
								}, animation_duration,
								"easeInOut");

						var pct;

						var updateStartCirclePosition = function() {
							var currTime = (new Date()).getTime();

							if(currTime <= endTime) {
								var pct = ((currTime - startTime) / animation_duration),
									pos = path.getPointAtLength(pct*length);
								animPath.attr("path", path.getSubpath(length*pct, length));
								startCircle.attr({
									cx: pos.x,
									cy: pos.y
								});
								requestAnimationFrame(updateStartCirclePosition);
							}
						}

						startCircle.animate({
							fill: endCircle.attr("fill"),
							stroke: endCircle.attr("stroke"),
							r: r/2,
						}, animation_duration, "easeInOut")
						.attr({
							"stroke-width": 0
						});
						path.animate({
							opacity: 0
						}, animation_duration, "easeInOut", function() {
							animPath.remove();
							path.remove();
							endCircle.remove();
							startCircle.animate({
								r: 0
							}, 500, "bounce", function() {
								startCircle.remove();
							});
						});
						requestAnimationFrame(updateStartCirclePosition);
						//animation = setInterval(updateStartCirclePosition, );
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
