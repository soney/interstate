/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.TouchClusterAttachment = ist.register_attachment("touch_cluster", {
			ready: function() {
				this.touchCluster = new ist.TouchCluster({ });
			},
			destroy: function(silent) {
				this.touchCluster.destroy(silent);
			},
			parameters: {
				options: function(contextual_object) {
					var downInside = contextual_object.prop_val("downInside"),
						downOutside = contextual_object.prop_val("downOutside"),
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
			}
		});
}(interstate, jQuery));
