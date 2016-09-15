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
			defaultFill: ["#CCCCCC"],
			defaultStroke: ["#999999"],
			strokeWidth: "3px",
			clusterStrokeWidth: 6
		},
		_create: function () {
			this.touchColors = {};
			this._super();
			this._addToPaper();
			this.element.addClass("simpleScreenTouches");
		},
		_destroy: function () {
			this._super();
			this._removeFromPaper();
			this.element.removeClass("simpleScreenTouches");
		},
		_addToPaper: function() {
			var paper = this.option("paper"),
				touchDisplays = this.touchDisplays = {},
				ctx = this.option("ctx"),
				radius = this.option("radius"),
				defaultFill = this.option("defaultFill"),
				defaultStroke = this.option("defaultStroke");

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
							fill = defaultFill,
							stroke = defaultStroke;

						touchDisplays[id] = {
							circle: paper.circle(x, y, 5*this.option("radius")/4).attr({
									opacity: 0.2,
									fill: fill,
									stroke: stroke,
									"stroke-width": this.option("strokeWidth")
								}).animate({
									r: this.option("radius"),
									opacity: 1
								},
								this.option("touchStartAnimationDuration"),
								mina.easeinout),
							clusterStrokes: [],
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
						this._updateColor(id);
					}, this);
				}, this)).on('touchmove.simple_touch_view', _.bind(function(jq_event) {
					var event = jq_event.originalEvent;
					_.each(event.changedTouches, function(touch) {
						var id = touch.identifier,
							x = touch.pageX,
							y = touch.pageY,
							touchDisplay = touchDisplays[id],
							pathDisplay = touchDisplay.path,
							clusterStrokes = touchDisplay.clusterStrokes;

						touchDisplay.circle.attr({
							cx: x,
							cy: y
						});
						pathDisplay.attr({
							path: pathDisplay.attr("path") + "L" + x + "," + y
						});

						_.each(clusterStrokes, function(clusterStroke) {
							clusterStroke.attr({
								cx: x,
								cy: y
							});
						});
					}, this);
				}, this)).on('touchend.simple_touch_view touchcancel.simple_touch_view', _.bind(function(jq_event) {
					var event = jq_event.originalEvent;
					_.each(event.changedTouches, function(touch) {
						var id = touch.identifier,
							x = touch.pageX,
							y = touch.pageY,
							touchDisplay = touchDisplays[id],
							circle = touchDisplay.circle,
							pathDisplay = touchDisplay.path,
							animPath = touchDisplay.animPath,
							length = pathDisplay.getTotalLength(),
							startCircle = touchDisplay.startCircle,
							clusterStrokes = touchDisplay.clusterStrokes,
							r = circle.attr("r");

						touchDisplay.animatingRemoval = true;

						pathDisplay.attr("path", pathDisplay.attr("path") + "L"+x+","+y);
						if(!touchDisplay.pathKnown) {
							animPath.attr("path", pathDisplay.attr("path"));
						}

						var animation_duration = Math.min(Math.max(200, length/3), 900),
							startTime = (new Date()).getTime(),
							endTime = startTime + animation_duration,
							easingFormula = mina.easeinout,
							nearStart = pathDisplay.getPointAtLength(Math.min(5, 0.01*length)),
							nearEnd = pathDisplay.getPointAtLength(Math.max(length-5, 0.99*length)),
							pct;

						animPath.attr({
							"stroke-width": pathDisplay.attr("stroke-width"),
							opacity: 1.0
						}).animate({
							opacity: 0.2
						});

						circle.attr({
								cx: x,
								cy: y
							})
							.animate({
								r: 2*r/3,
								cx: nearEnd.x,
								cy: nearEnd.y,
								opacity: 0
							}, animation_duration, mina.easeinout, function() {
								circle.remove();
							});

						_.each(clusterStrokes, function(clusterStroke) {
							clusterStroke.attr({
								cx: x,
								cy: y
							}).animate({
								r: 2*clusterStroke.attr("r")/3,
								cx: nearEnd.x,
								cy: nearEnd.y,
								opacity: 0
							}, animation_duration, mina.easeinout, function() {
								clusterStroke.remove();
							});
						});

						startCircle.animate({
							r: 1.1*startCircle.attr("r"),
							opacity: 0,
							cx: nearStart.x,
							cy: nearStart.y,
						}, animation_duration, mina.easeinout, function() {
							startCircle.remove();
						});

						pathDisplay.attr({
								opacity: 0.5
							})
							.animate({
								opacity: 0
							}, animation_duration, mina.easeinout, function() {
								pathDisplay.remove();
							});

						var updateStartCirclePosition = function() {
							var currTime = (new Date()).getTime();

							if(currTime <= endTime) {
								var pct = ((currTime - startTime) / animation_duration),
									pos = pathDisplay.getPointAtLength(pct*length);
								animPath.attr("path", pathDisplay.getSubpath(length*pct, length));
								requestAnimationFrame(updateStartCirclePosition);
							} else {
								animPath.remove();
							}
						};
						requestAnimationFrame(updateStartCirclePosition);
						updateStartCirclePosition();
						delete touchDisplays[id];
					}, this);
				}, this));
		},

		_removeFromPaper: function() {
			$(window).off('.simple_touch_view');
		},
		_updateColor: function(id) {
			var colors = this.touchColors[id],
				display = this.touchDisplays[id];

			if(display && !display.animatingRemoval) {
				var circle = display.circle,
					path = display.path,
					animPath = display.animPath,
					startCircle = display.startCircle,
					clusterStrokes = display.clusterStrokes,
					paper = this.option("paper"),
					pathStrokeColors = _.map(clusterStrokes, function(cs) {
						return cs.attr("stroke");
					}),
					strokes = _.pluck(colors, "stroke");

				if (colors && colors.length > 0) {
					var claimedIndex = find(colors, function(color) {
						return color.claimed;
					});
					if(claimedIndex >= 0) {
						var fillColor = colors[claimedIndex].fill,
							strokeColor = colors[claimedIndex].stroke;

						circle.attr({
							fill: fillColor,
							stroke: strokeColor
						});
						path.attr({
							stroke: fillColor
						});
						animPath.attr({
							stroke: fillColor
						});
						startCircle.attr({
							stroke: fillColor,
							fill: fillColor
						});

						_.each(clusterStrokes, function(clusterStroke, index) {
							clusterStroke.remove();
						});
						clusterStrokes.splice(0, clusterStrokes.length);
					} else {
						var clusterStrokeWidth = this.option("clusterStrokeWidth"),
							was_found_indicator = {};

						_.each(colors, function(info, index) {
							var radius = parseInt(circle.attr("r")) + clusterStrokeWidth*(index+0);

							if(info.circle) {
								info.circle.animate({
										r: radius
									},
									this.option("touchStartAnimationDuration"),
									mina.easeinout);
							} else {
								var clusterStroke = info.circle = paper.circle(circle.attr("cx"), circle.attr("cy"), 5*radius/4).attr({
									fill: "none",
									stroke: info.fill,
									"stroke-width": clusterStrokeWidth,
									opacity: 0.2
								}).animate({
									r: radius,
									opacity: 1
								},
								this.option("touchStartAnimationDuration"),
								mina.easeinout);
								clusterStrokes.push(clusterStroke);
							}
							info.circle.was_found = was_found_indicator;
						}, this);

						var to_remove = [];
						_.each(clusterStrokes, function(clusterStroke, index) {
							if(clusterStroke.was_found === was_found_indicator) {
								delete clusterStroke.was_found;
							} else {
								clusterStroke.remove();
								to_remove.unshift(index);
							}
						});

						_.each(to_remove, function(i) {
							clusterStrokes.splice(i, 1);
						}, this);
					}
				} else {
					var defaultFill = this.option("defaultFill"),
						defaultStroke = this.option("defaultStroke");

					circle.attr({
						fill: defaultFill,
						stroke: defaultStroke
					});
					path.attr({
						stroke: defaultFill
					});
					animPath.attr({
						stroke: defaultFill
					});
					startCircle.attr({
						stroke: defaultFill,
						fill: defaultFill
					});
				}
			}
		},
		setTouchColor: function(id, cluster, fillColor, strokeColor, claimed) {
			var colors = this.touchColors[id],
				info;

			_.each(colors, function(i) {
				if(i.cluster === cluster) {
					info = i;
				}
			}, this);

			if(info) {
				_.extend(info, {
					fill: fillColor,
					stroke: strokeColor,
					claimed: claimed
				});
			} else {
				info = {
					cluster: cluster,
					fill: fillColor,
					stroke: strokeColor,
					claimed: claimed,
					circle: false
				};

				if(colors) {
					colors.push(info);
				} else {
					colors = this.touchColors[id] = [info];
				}
			}

			_.defer(_.bind(this._updateColor, this, id));
		},
		unsetTouchColor: function(id, cluster, claims) {
			var colors = this.touchColors[id],
				toRemoveIndicies = [];
			_.each(colors, function(info, index) {
				if(info.cluster === cluster) {
					if(info.circle) {
						info.circle.remove();
						delete info.circle;
					}
					toRemoveIndicies.unshift(index);
				}
			}, this);
			_.each(toRemoveIndicies, function(index) {
				colors.splice(index, 1);
			}, this);

			_.defer(_.bind(this._updateColor, this, id));
		}
	});

	function find(collection, filter) {
		for (var i = 0; i < collection.length; i++) {
			if(filter(collection[i], i, collection)) return i;
		}
		return -1;
	}
}(interstate, jQuery));
