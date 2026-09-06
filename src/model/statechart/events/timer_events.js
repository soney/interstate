/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.TimeEvent = function () {
		ist.Event.apply(this, arguments);
		//this._initialize();
		this._type = "time";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (time) {
			this.time = time;
			this.created_at = (new Date()).getTime();
			this.fired = false;
		};
		proto.enable = function() {
			My.superclass.enable.apply(this, arguments);
			if(this.fired || this.timeout !== undefined) { return; }
			var self = this;
			this.timeout = window.setTimeout(function() {
				self.timeout = undefined;
				if(!self.is_enabled()) { return; }
				self.fired = true;
				self.fire({type: "time", time: self.time,
					current_time: (new Date()).getTime(), created_at: self.created_at});
			}, Math.max(0, this.time - (new Date()).getTime()));
		};
		proto.disable = function() {
			My.superclass.disable.apply(this, arguments);
			window.clearTimeout(this.timeout);
			this.timeout = undefined;
		};
		proto.destroy = function () {
			this.disable();
			My.superclass.destroy.apply(this, arguments);
		};
	}(ist.TimeEvent));

	ist.TimeoutEvent = function () {
		ist.Event.apply(this, arguments);
		//this._initialize();
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
			if (this._from) {
				this._from.off("active", this.enter_listener, this);
				this._from.off("inactive", this.leave_listener, this);
			}
			this.leave_listener();
			this._transition = transition;
			this._from = transition ? transition.from() : null;
			if (this._from) {
				this._from.on("active", this.enter_listener, this);
				this._from.on("inactive", this.leave_listener, this);
				this.enter_listener();
			}
		};
		proto.enter_listener = function() {
			if (!this.is_enabled() || (this._from && !this._from.is_active())) { return; }
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
			this.timeout = undefined;
			if (!this.is_enabled() || (this._from && !this._from.is_active())) { return; }
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
			this.disable();
			this.set_transition(null);
			My.superclass.destroy.apply(this, arguments);
		};
		proto.enable = function () {
			if(this.is_enabled()) { return; }
			My.superclass.enable.apply(this, arguments);
			this.enter_listener();
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
			this.leave_listener();
		};

	}(ist.TimeoutEvent));
}(interstate));
