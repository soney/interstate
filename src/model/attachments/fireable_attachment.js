/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.FireableAttachment = ist.register_attachment("fireable_attachment", {
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
					var event = new ist.IstObjEvent("fireable", this.contextual_object);
					return event;
				}
			}
		});

	ist.fire = function(event) {
		var cobj = this;
		ist.emit("fireable", cobj, event);
	};
}(interstate, jQuery));
