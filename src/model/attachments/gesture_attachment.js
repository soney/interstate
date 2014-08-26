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
					.on(ist.TouchGesture.GESTURE_STATES.BEGAN, function() {
						ist.emit("gesture_began", this.contextual_object);
					}, this)
					.on(ist.TouchGesture.GESTURE_STATES.POSSIBLE, function() {
						ist.emit("gesture_possible", this.contextual_object);
					}, this)
					.on(ist.TouchGesture.GESTURE_STATES.BLOCKED, function(event) {
						ist.emit("gesture_blocked", this.contextual_object, event);
					}, this)
					.on(ist.TouchGesture.GESTURE_STATES.FAILED, function(event) {
						ist.emit("gesture_failed", this.contextual_object, event);
					}, this)
					.on(ist.TouchGesture.GESTURE_STATES.BEGAN, function(event) {
						ist.emit("gesture_began", this.contextual_object, event);
					}, this);
			},
			destroy: function(silent) {
				this.touchGesture.destroy(silent);
			},
			parameters: {
				options: function(contextual_object) {
					var name = contextual_object.get_name(),
						discrete = contextual_object.prop_val("discrete"),
						priority = contextual_object.prop_val("priority"),
						activationDelay = contextual_object.prop_val("activationDelay");

					this.touchGesture.setOption({
						name: name,
						discrete: discrete,
						priority: priority,
						activationDelay: activationDelay
					});
				}
			},
			proto_props: {
			}
		});
}(interstate, jQuery));
