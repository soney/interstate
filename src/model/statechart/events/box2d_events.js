/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;


	ist.CollisionEvent = function (targa, targb) {
		ist.Event.apply(this, arguments);
		this._initialize();
		this._type = "collision";
		var clisteners = ist.contact_listeners.get(targa);
		if(clisteners) {
			clisteners.push({target: targb, callback: _.bind(this.notify, this)})
		} else {
			ist.contact_listeners.put(targa, [{target: targb, callback: _.bind(this.notify, this)}]);
		}
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (specified_targets) {
		};
		proto.set_transition = function (transition) {
			this._transition = transition;
			if (transition) {
				var from = transition.from();

				from.on("active", this.enter_listener, this);
				from.on("inactive", this.leave_listener, this);
			}
		};
		proto.enter_listener = function() {
		};
		proto.leave_listener = function() {
		};
		proto.notify = function (contact) {
			ist.event_queue.wait();
			this.fire({
				type: "collision"
			});
			ist.event_queue.signal();
		};
		proto.destroy = function () {
			if(this._transition) {
			}
			My.superclass.destroy.apply(this, arguments);
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
		};
	}(ist.CollisionEvent));
}(interstate));
