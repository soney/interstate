/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.TimeEvent = function () {
		red.Event.apply(this, arguments);
		this._initialize();
		this._type = "time";
	};

	(function (My) {
		_.proto_extend(My, red.Event);
		var proto = My.prototype;
		proto.on_create = function (time) {
			this.time = time;
			var creation_time = (new Date()).getTime();
			var time_diff = this.time - creation_time;
			var self = this;
			window.setTimeout(function () {
				self.fire({
					type: "time",
					time: time,
					current_time: (new Date()).getTime(),
					created_at: creation_time
				});
			}, time_diff);
		};
		proto.destroy = function () {
			My.superclass.destroy.apply(this, arguments);
		};
	}(red.TimeEvent));

	red.TimeoutEvent = function () {
		red.Event.apply(this, arguments);
		this._initialize();
		this._type = "timeout";
		this.timeout = undefined;
	};

	(function (My) {
		_.proto_extend(My, red.Event);
		var proto = My.prototype;
		proto.on_create = function (delay) {
			this.delay = delay;
			this.created_at = (new Date()).getTime();
		};
		proto.set_transition = function (transition) {
			this._transition = transition;
			if (transition) {
				var from = transition.from();

				from.on("active", this.enter_listener, this);
				from.on("inactive", this.leave_listener, this);

				_.defer(function (self) {
					if (from.is_active()) {
						self.enter_listener();
					}
				}, this);
			}
		};
		proto.enter_listener = function() {
			if (this.timeout) {
				window.clearTimeout(this.timeout);
				this.timeout = undefined;
			}
			this.timeout = _.delay(function(self) { self.notify(); }, this.delay, this);
		};
		proto.leave_listener = function() {
			if (this.timeout) {
				window.clearTimeout(this.timeout);
				this.timeout = undefined;
			}
		};
		proto.notify = function () {
			red.event_queue.wait();
			this.fire({
				type: "timeout",
				delay: this.delay,
				current_time: (new Date()).getTime(),
				created_at: this.created_at
			});
			red.event_queue.signal();
		};
		proto.destroy = function () {
			if(this._transition) {
			/*
				var from = this._transition.from();
				from.off("active", this.enter_listener, this);
				from.off("inactive", this.leave_listener, this);
				*/
			}
			My.superclass.destroy.apply(this, arguments);
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
		};
	}(red.TimeoutEvent));
}(red));
