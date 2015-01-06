/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.touchClusterColors = {
		fills: ["#EF3B35", "#F26B36", "#7FC246", "#149DD8", "#6D287C"],
		strokes: ["#87211E", "#9C4523", "#466B27", "#0D688F", "#36143D"]
	};

	$.widget("interstate.touch_cluster", {
		options: {
			paper: false,
			fingerRadius: 50,
			fingerStartRadius: 3,
			startCenterRadius: 5,
			centerRadius: 10,

			defaultClusterAttributes: {
				fill: "#F00",
				stroke: "#00F"
			},
			fills: ist.touchClusterColors.fills,
			strokes: ist.touchClusterColors.strokes,
		},
		_create: function () {
			this._super();
			this.clusters = [];
		},
		_destroy: function () {
			this._super();
			this.clear();
		},
		_getSatisfiedListener: function(cluster) {
			var was_using_ids = [],
				fills = this.option("fills"),
				strokes = this.option("strokes"),
				fillIndex = cluster.id()%fills.length,
				fill = fills[fillIndex],
				stroke = strokes[fillIndex],
				satisfied_fn = cjs.liven(function() {
					var simpleTouchLayer = this.element.data("interstate.screen_touches");
					if(this.element.is(".simpleScreenTouches")) {
						var satisfied = cluster.isSatisfied(),
							claimsTouches = cluster.claimsTouches();
						if(satisfied) {
							var fingers = cluster.getUsingFingers();
							_.each(was_using_ids, function(id) {
								if(_.indexOf(fingers, id) < 0) {
									this.element.screen_touches("unsetTouchColor", cluster, id, claimsTouches);
								}
							});
							_.each(fingers, function(fingerID) {
								this.element.screen_touches("setTouchColor", fingerID, cluster, fill, stroke, claimsTouches);
							}, this);
							was_using_ids = fingers;
						} else {
							_.each(was_using_ids, function(fingerID) {
								this.element.screen_touches("unsetTouchColor", fingerID, cluster, claimsTouches);
							}, this);
							was_using_ids = false;
						}
					}
				}, {
					context: this,
					on_destroy: function() {
					}
				});

			return satisfied_fn;
		},
		_getDrawListener: function(cluster, clusterAttributes) {
			var attributes = _.extend({}, this.option("defaultClusterAttributes"), clusterAttributes),
				fills = this.option("fills"),
				strokes = this.option("strokes"),
				fillIndex = cluster.id()%fills.length,
				fill = fills[fillIndex],
				stroke = strokes[fillIndex],
				paper = this.option("paper"),
				startCenterRadius = this.option("startCenterRadius"),
				centerRadius = this.option("centerRadius"),
				fingerRadius = this.option("fingerRadius"),
				fingerStartRadius = this.option("fingerStartRadius"),
				startCenterCircle = paper.circle(-3*startCenterRadius, -3*startCenterRadius, startCenterRadius).attr({
					fill: "none",
					stroke: stroke,
					"stroke-width": 2
				}),
				centerCircle = paper.circle(-3*centerRadius, -3*centerRadius, centerRadius).attr({
					fill: "none",
					stroke: stroke,
					"stroke-width": 2
				}),
				rotationPath = paper.path("M0,0").attr({
					fill: "none",
					stroke: stroke,
					"stroke-width": 2
				}),
				paper_path = paper.path(""),
				touchStartDisplays = {},
				touchDisplays = {},
				draw_fn = cjs.liven(function() {
					if(cluster.isSatisfied()) {
						var touches = cluster.getTouches();
						if(touches.length > 1) {
							var startCenter = { x: cluster.getStartX(), y: cluster.getStartY() },
								center = { x: cluster.getX(), y: cluster.getY() },
								scale = cluster.getScale(),
								rotation = cluster.getRotation();

							startCenterCircle.attr({
								cx: startCenter.x,
								cy: startCenter.y
							});
							centerCircle.attr({
								cx: center.x,
								cy: center.y
							});

							if(scale) {
								centerCircle.attr("r", scale*startCenterCircle.attr("r"));
							}

							if(rotation) {
								var ccr = centerCircle.attr("r"),
									ccdx = ccr*Math.cos(rotation),
									ccdy = -ccr*Math.sin(rotation);
								
								rotationPath.attr("path", "M"+center.x+","+center.y+"l"+ccdx+","+ccdy);
							}
						}
						/*
						_.each(touches, function(touch) {
							var id = touch.id,
								touchDisplay = touchDisplays[id],
								touchStartDisplay = touchStartDisplays[id];

							if(touchDisplay) {
								touchDisplay.attr({
									cx: touch.x,
									cy: touch.y
								});
							} else {
								touchDisplay = touchDisplays[id] = paper.circle(touch.x, touch.y, fingerRadius).attr({
									fill: "none",
									stroke: "black"
								});
							}

							if(!touchStartDisplay) {
								touchStartDisplay = touchStartDisplays[id] = paper.circle(touch.startX, touch.startY, fingerStartRadius);
							}
						});
						*/
					} else {
						paper_path.attr("path", "M0,0");
						rotationPath.attr("path", "M0,0");

						startCenterCircle.attr({
							cx: -3*startCenterCircle.attr("r"),
							cy: -3*startCenterCircle.attr("r")
						});
						centerCircle.attr({
							cx: -3*centerCircle.attr("r"),
							cy: -3*centerCircle.attr("r")
						});

						for(var touchId in touchStartDisplays) {
							if(touchStartDisplays.hasOwnProperty(touchId)) {
								var touchStartDisplay = touchStartDisplays[touchId],
									touchDisplay = touchDisplays[touchId];

								touchStartDisplay.remove();
								touchDisplay.remove();

								delete touchStartDisplays[touchId];
								delete touchDisplays[touchId];
							}
						}
					}

				}, {
					context: this,
					on_destroy: function() {
						startCenterCircle.remove();
						centerCircle.remove();
						rotationPath.remove();
					}
				});
			return draw_fn;
		},

		addClusterToPaper: function(cluster, clusterAttributes) {
			var i = 0, len = this.clusters.length, cinfo;
			for(; i<len; i++) {
				cinfo = this.clusters[i];
				if(cinfo.cluster === cluster) { // we already have this cluster
					return;
				}
			}

			this.clusters.push({
				cluster: cluster,
				draw_fn: this._getDrawListener(cluster, clusterAttributes),
				satisfied_fn: this._getSatisfiedListener(cluster)
			});
		},

		removeClusterFromPaper: function(cluster) {
			var i = 0, len = this.clusters.length, cinfo;
			for(; i<len; i++) {
				cinfo = this.clusters[i];
				if(cinfo.cluster === cluster) { // we already have this cluster
					cinfo.draw_fn.destroy();
					cinfo.satisfied_fn.destroy();
					this.clusters.splice(i, 1);
					return;
				}
			}
		},
		clear: function() {
			var i = this.clusters.length-1, cinfo;
			for(; i>=0; i--) {
				cinfo = this.clusters[i];
				cinfo.draw_fn.destroy();
				cinfo.satisfied_fn.destroy();
			}

			this.clusters.splice(0, this.clusters.length);
		}
	});
}(interstate, jQuery));
