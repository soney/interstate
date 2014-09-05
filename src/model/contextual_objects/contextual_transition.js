/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualTransition = function (options) {
		ist.ContextualTransition.superclass.constructor.apply(this, arguments);

		if(options.avoid_constructor) { return; }

		var transition = this.get_object();

		this.$active = cjs(false);
		this.$event = cjs(false);
		this.$enabled = cjs(false);

		this._times_run = 0;
		this.$times_run = cjs(this._times_run);
		this._type = "transition";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.activate = function() {
			this.$active.set(true);
		};
		proto.deactivate = function() {
			this.$active.set(false);
		};
		proto.onTransitionToChanged = function() {
			if(this.transitionType() === "start") {
				var to = this.to();
				if(!to.isStart()) {
					var from = this.from();
					if(from.isActive() && from.isRunning()) {
						ist.event_queue.wait();
						this.fire();
						ist.event_queue.signal();
					}
				}
			}
		};
		proto.initialize = function(options) {
			if(this.constructor === My) { this.flag_as_initialized();  }
			My.superclass.initialize.apply(this, arguments);

			var transitionType = this.transitionType(),
				transition = this.get_object();

			if(transitionType === "start") {
				this.onTransitionToChanged();
				transition.on("setTo", this.onTransitionToChanged, this);
			} else if(transitionType === "event") {
				var event = transition.getEvent();
				event.on_fire(function() {
					this.fire.apply(this, arguments);
				}, this);
			} else if(transitionType === "parsed") {
				var str = transition.getStr();
			}
			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }
			My.superclass.destroy.apply(this, arguments);
		};
		proto.transitionType = function() {
			var transition = this.get_object();
			return transition.type;
		};
		proto.incrementTimesRun = function () {
			this.$times_run.set(++this._times_run);
		};
		proto.timesRun = function () {
			return this.$times_run.get();
		};
		proto.from = function () {
			var object = this.get_object(),
				pointer = this.get_pointer(),
				from = object.from(),
				from_pointer = pointer.replace(from);
			return from_pointer.getContextualObject();
		};
		proto.to = function () {
			var object = this.get_object(),
				pointer = this.get_pointer(),
				to = object.to(),
				to_pointer = pointer.replace(to);
			return to_pointer.getContextualObject();
		};
		proto.order = function(order_to) {
			if(order_to instanceof ist.State) {
				return 1;
			} else {
				return 0;
			}
		};
		proto.event = function () { return this._event; };
		proto.involves = function (state) { return this.from() === state || this.to() === state; };
		proto.fire = function (event) {
			if (this.from()._onOutgoingTransitionFire(this, event)) {
				this._emit("fire", {type: "fire", target: this});
			}
		};
		proto.stringify = function () {
			var event = this.event();
			var stringified_event = event ? event.stringify() : "";
			return stringified_event.toString();
		};
		proto.root = function () {
			return this.from().root();
		};

		proto.enable = function () {
			if(!this.isEnabled()) {
				debugger;
				console.log(this.sid());
				this._enabled = true;
				this.$enabled.set(true);

				var type = this.type();
				if(type === "start") {
					this.onTransitionToChanged();
				}
				/*

				var event = this.event();
				event.enable();
				*/
			}
		};

		proto.disable = function () {
			if(this.isEnabled()) {
				this._enabled = false;
				this.$enabled.set(false);
				/*

				var event = this.event();
				event.disable();
				if(ist.__debug_statecharts) {
				}
				*/
			}
		};

		proto.isEnabled = function() {
			return this.$enabled.get();
		};
		proto.has = function(key) {
			return key === "event";
		};
	}(ist.ContextualTransition));
}(interstate));
