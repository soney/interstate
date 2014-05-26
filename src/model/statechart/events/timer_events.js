/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.TimeEvent = function () {
		ist.Event.apply(this, arguments);
		this._initialize();
		this._type = "time";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
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
	}(ist.TimeEvent));

	ist.TimeoutEvent = function () {
		ist.Event.apply(this, arguments);
		this._initialize();
		this._type = "timeout";
		this.timeout = undefined;
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
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
			//ist.event_queue.wait();
			this.fire({
				type: "timeout",
				delay: this.delay,
				current_time: (new Date()).getTime(),
				created_at: this.created_at
			});
			//ist.event_queue.signal();
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
	}(ist.TimeoutEvent));
}(interstate));
