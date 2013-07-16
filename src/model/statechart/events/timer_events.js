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
				var timeout;
				var enter_listener = _.bind(function () {
					if (!_.isUndefined(timeout)) {
						window.clearTimeout(timeout);
						timeout = undefined;
					}
					timeout = window.setTimeout(_.bind(this.notify, this), this.delay);
				}, this);

				var leave_listener = _.bind(function () {
					if (!_.isUndefined(timeout)) {
						window.clearTimeout(timeout);
						timeout = undefined;
					}
				}, this);

				from.on("active", enter_listener);
				from.on("inactive", leave_listener);

				_.defer(function () {
					if (from.is_active()) {
						enter_listener();
					}
				});
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
