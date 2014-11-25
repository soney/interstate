/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.convertObjectToPath = function(obj) {
		var path = obj;
		if(obj instanceof ist.ContextualDict) {
			var shape_attachment = obj.get_attachment_instance("shape"),
				cx, cy;
			if(shape_attachment) {
				if(shape_attachment.shape_type === "path") {
					path = obj.prop_val("path");
				} else if(shape_attachment.shape_type === "circle") {
					cx = obj.prop_val("cx");
					cy = obj.prop_val("cy");
					var r = obj.prop_val("r");
					path = "M"+(cx-r)+','+cy+'a'+r+','+r+',0,1,1,0,0.0001Z';
				} else if(shape_attachment.shape_type === "ellipse") {
					cx = obj.prop_val("cx");
					cy = obj.prop_val("cy");
					var rx = obj.prop_val("rx"),
						ry = obj.prop_val("ry");

					path = "M"+(cx-rx)+','+cy+'a'+rx+','+ry+',0,1,1,0,0.0001Z';
				} else if(shape_attachment.shape_type === "rect") {
					var x = obj.prop_val("x"),
						y = obj.prop_val("y"),
						width = obj.prop_val("width"),
						height = obj.prop_val("height");

					path = "M"+x+','+y+'h'+width+'v'+height+'h'+(-width)+'Z';
				} else {
					path = false;
				}
			}
		} else if(obj instanceof ist.Path) {
			path = obj.toString();
		} else if(_.isString(obj)) {
			path = obj;
		}

		return path;
	};

	ist.TouchClusterAttachment = ist.register_attachment("touch_cluster", {
			ready: function() {
				this.touchCluster = new ist.TouchCluster({ });
				this.ist_runtime = $(".ist_runtime");
				this.touchscreen_layer = this.ist_runtime.is(".hasTouchscreenLayer");
			},
			destroy: function(silent) {
				this.touchCluster.destroy(silent);
			},
			parameters: {
				options: function(contextual_object) {
					var downInside = ist.convertObjectToPath(contextual_object.prop_val("downInside")),
						downOutside = ist.convertObjectToPath(contextual_object.prop_val("downOutside")),
						numFingers = contextual_object.prop_val("numFingers"),
						maxRadius = contextual_object.prop_val("maxRadius"),
						maxTouchInterval = contextual_object.prop_val("maxTouchInterval");

					this.touchCluster.setOption({
						downInside: downInside,
						downOutside: downOutside,
						numFingers: numFingers,
						maxRadius: maxRadius,
						maxTouchInterval: maxTouchInterval
					});
				},
				debugDraw: function(contextual_object) {
					var debugDraw = contextual_object.prop_val("debugDraw");
					if(debugDraw) {
						if(this.touchscreen_layer) {
							this.ist_runtime.touchscreen_layer("addTouchCluster", this.touchCluster);
						}
					} else {
						if(this.touchscreen_layer) {
							this.ist_runtime.touchscreen_layer("removeTouchCluster", this.touchCluster);
						}
					}
				},
				satisfied: function(contextual_object) {
				/*
					var satisfied = this.touchCluster.isSatisfied();
					if(satisfied) {
						var satisfied_event = contextual_object.prop_val("satisfied");
					} else {
						var dissatisfied_event = contextual_object.prop_val("dissatisfied");
					}
					*/
				}
			},
			proto_props: {
				tc_id: function() {
					return this.touchCluster.id();
				},
				claimsTouches: function() {
					return this.touchCluster.claimsTouches();
				}
			},
			outputs: {
				x: function() { return this.touchCluster.getXConstraint(); },
				y: function() { return this.touchCluster.getYConstraint(); },
				startX: function() { return this.touchCluster.getStartXConstraint(); },
				startY: function() { return this.touchCluster.getStartYConstraint(); },
				endX: function() { return this.touchCluster.getEndXConstraint(); },
				endY: function() { return this.touchCluster.getEndYConstraint(); },
				radius: function() { return this.touchCluster.getRadiusConstraint(); },
				startRadius: function() { return this.touchCluster.getStartRadiusConstraint(); },
				endRadius: function() { return this.touchCluster.getEndRadiusConstraint(); },
				rotation: function() { return this.touchCluster.getRadiusConstraint(); },
				endRotation: function() { return this.touchCluster.getEndRadiusConstraint(); },
				scale: function() { return this.touchCluster.getScaleConstraint(); },
				endScale: function() { return this.touchCluster.getEndScaleConstraint(); },
				claimTouches: function() {
					return _.bind(this.touchCluster.claimTouches, this.touchCluster);
				},
				disclaimTouches: function() {
					return _.bind(this.touchCluster.disclaimTouches, this.touchCluster);
				}
			}
		});
}(interstate, jQuery));
