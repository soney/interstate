/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	$.widget("interstate.touch_cluster", {
		options: {
			cluster: false,
			ctx: false,
			paper: false,
			fingerRadius: 50,
			fingerStartRadius: 3,
			startCenterRadius: 5,
			centerRadius: 10
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
				cluster = this.option("cluster"),
				startCenterRadius = this.option("startCenterRadius"),
				centerRadius = this.option("centerRadius"),
				startCenterCircle = paper.circle(-3*startCenterRadius, -3*startCenterRadius, startCenterRadius),
				centerCircle = paper.circle(-3*centerRadius, -3*centerRadius, centerRadius),
				rotationPath = paper.path("M0,0"),
				fingerRadius = this.option("fingerRadius"),
				fingerStartRadius = this.option("fingerStartRadius");

			var paper_path = paper.path(""),
				info = paper.text("", 0, 0),
				touchStartDisplays = {},
				touchDisplays = {};

			this.draw_fn = cjs.liven(function() {
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
							touchDisplay = touchDisplays[id] = paper.circle(touch.x, touch.y, fingerRadius);
						}

						if(!touchStartDisplay) {
							touchStartDisplay = touchStartDisplays[id] = paper.circle(touch.startX, touch.startY, fingerStartRadius);
						}
					});
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
		},

		_removeFromPaper: function() {
			if(this.draw_fn) {
				this.draw_fn.destroy();
			}
		}
	});
}(interstate, jQuery));
