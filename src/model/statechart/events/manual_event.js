/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.ManualEvent = function () {
		red.ManualEvent.apply(this, arguments);
		this._initialize();
		this._type = "manual_event";
	};

	(function (My) {
		_.proto_extend(My, red.Event);
		var proto = My.prototype;
		proto.create_shadow = function (parent_statechart, context) {
			var shadow = new My();
			this.on_fire(function () {
				red.event_queue.wait();
				shadow.fire();
				red.event_queue.signal();
			});
			return shadow;
		};
		proto.destroy = function () {
			My.superclass.destroy.apply(this, arguments);
		};
	}(red.ManualEvent));
}(red));
