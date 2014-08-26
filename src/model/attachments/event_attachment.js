/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.EventAttachment = ist.register_attachment("event_attachment", {
			ready: function(contextual_object) {
			},
			destroy: function(silent) {
			},
			parameters: {
				options: function(contextual_object) {
				}
			},
			proto_props: {
				getEvent: function() {
					var event = new ist.IstObjEvent("event", this.contextual_object);
					return event;
				}
			}
		});

	ist.fire = function(event) {
		var cobj = this;
		ist.emit("event", cobj, event);
	};
}(interstate, jQuery));
