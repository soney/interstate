/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	return;
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.CombinationEvent = function () {
		ist.Event.apply(this, arguments);
		//this._initialize();
		this._type = "combination_event";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (events) {
			this.events = events;
			_.each(this.events, function (event) {
				event.parent = this;
				event.on_fire_request(_.bind(function () {
					this.fire.apply(this, arguments);
				}, this));
			}, this);
			My.superclass.on_create.apply(this, arguments);
		};

		proto.destroy = function () {
			var args = arguments;
			_.each(this.events, function (event) {
				event.destroy.apply(event, args);
			});
			delete this.events;
			My.superclass.destroy.apply(this, arguments);
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
	}(ist.CombinationEvent));
}(interstate));
