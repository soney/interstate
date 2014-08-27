/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.TouchGestureAttachment = ist.register_attachment("touch_gesture", {
			ready: function(contextual_object) {
				this.touchGesture = new ist.TouchGesture({ });
				this.touchGesture
					.on(ist.TouchGesture.GESTURE_STATUS.PENDING, function() {
						ist.emit("gesture_requested", this.contextual_object);
					}, this)
					.on(ist.TouchGesture.GESTURE_STATUS.BLOCKED, function() {
						ist.emit("gesture_blocked", this.contextual_object);
					}, this)
					.on(ist.TouchGesture.GESTURE_STATUS.CONFIRMED, function() {
						ist.emit("gesture_confirmed", this.contextual_object);
					}, this)
					.on(ist.TouchGesture.GESTURE_STATUS.CANCELLED, function(event) {
						ist.emit("gesture_cancelled", this.contextual_object, event);
					}, this);
			},
			destroy: function(silent) {
				this.touchGesture.destroy(silent);
			},
			parameters: {
				options: function(contextual_object) {
					var priority = contextual_object.prop_val("priority"),
						activationDelay = contextual_object.prop_val("activationDelay");

					this.touchGesture.setOption({
						priority: priority,
						activationDelay: activationDelay
					});
				}
			},
			proto_props: {
			}
		});
}(interstate, jQuery));
