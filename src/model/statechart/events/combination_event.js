/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.CombinationEvent = function () {
		red.Event.apply(this, arguments);
		this._initialize();
		this._type = "combination_event";
	};

	(function (My) {
		_.proto_extend(My, red.Event);
		var proto = My.prototype;
		proto.on_create = function (events) {
			this.events = events;
			_.each(this.events, function (event) {
				event.on_fire(_.bind(function () {
					this.fire.apply(this, arguments);
				}, this));
			}, this);
			My.superclass.destroy.apply(this, arguments);
		};

		proto.destroy = function () {
			var args = arguments;
			_.each(this.events, function (event) {
				event.destroy.apply(event, args);
			});
			delete this.events;
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			_.each(this.events, function (event) {
				event.enable();
			});
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
			_.each(this.events, function (event) {
				event.disable();
			});
		};
	}(red.CombinationEvent));
}(red));
