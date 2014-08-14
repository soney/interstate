/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	
	function convertObjectToPath(obj) {
		var path = obj;
		if(obj instanceof ist.ContextualDict) {
			var shape_attachment = obj.get_attachment_instance("shape");
			if(shape_attachment) {
				if(shape_attachment.shape_type === "path") {
					path = obj.prop_val("path");
				} else if(shape_attachment.shape_type === "circle") {
					var cx = obj.prop_val("cx"),
						cy = obj.prop_val("cy"),
						r = obj.prop_val("r");
					path = "M"+(cx-r)+','+cy+'a'+r+','+r+',0,1,1,0,0.0001Z';
				} else if(shape_attachment.shape_type === "ellipse") {
					var cx = obj.prop_val("cx"),
						cy = obj.prop_val("cy"),
						rx = obj.prop_val("rx"),
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
		}
		return path;
	}

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
					var downInside = convertObjectToPath(contextual_object.prop_val("downInside")),
						downOutside = convertObjectToPath(contextual_object.prop_val("downOutside")),
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
				}
			}
		});
}(interstate, jQuery));
