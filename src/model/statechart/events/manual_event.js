/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ManualEvent = function () {
		ist.ManualEvent.apply(this, arguments);
		this._initialize();
		this._type = "manual_event";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.create_shadow = function (parent_statechart, context) {
			var shadow = new My();
			this.on_fire(function () {
				ist.event_queue.wait();
				shadow.fire();
				ist.event_queue.signal();
			});
			return shadow;
		};
		proto.destroy = function () {
			My.superclass.destroy.apply(this, arguments);
		};
	}(ist.ManualEvent));
}(interstate));
