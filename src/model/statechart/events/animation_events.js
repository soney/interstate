/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,window,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var requestAnimFrame = (function(){
		return	window.requestAnimationFrame		||
				window.webkitRequestAnimationFrame	||
				window.mozRequestAnimationFrame		||
		function(callback) {
			window.setTimeout(callback, 1000/60);
		};
	})();
	red.FrameEvent = function () {
		red.Event.apply(this, arguments);
		this._initialize();
		this._type = "frame_event";
	};
	(function (My) {
		_.proto_extend(My, red.Event);
		var proto = My.prototype;
		proto.on_create = function () {
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
		proto.notify = function () {
			red.event_queue.wait();
			this.fire({
				type: "frame",
				current_time: (new Date()).getTime(),
				created_at: this.created_at
			});
			red.event_queue.signal();
		};

		proto.enter_listener = function() {
			if (this.req) {
				window.cancelAnimationFrame(this.req);
				this.req = undefined;
			}
			this.req = requestAnimFrame(_.bind(this.notify, this));
		};

		proto.leave_listener = function() {
			if (this.req) {
				window.cancelAnimationFrame(this.req);
				this.req = undefined;
			}
		};

		proto.destroy = function () {
			My.superclass.destroy.apply(this, arguments);
		};
		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			this.enter_listener();
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
			if (this.req) {
				window.cancelAnimationFrame(this.req);
				this.req = undefined;
			}
		};
	}(red.FrameEvent));
}(red));
