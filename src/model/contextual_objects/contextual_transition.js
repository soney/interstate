/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualTransition = function (options) {
		ist.ContextualTransition.superclass.constructor.apply(this, arguments);

		if(options.avoid_constructor) { return; }

		var transition = this.get_object(),
			from = transition.from(),
			lineage = from.getLineage(),
			ptr = this.get_pointer();

		_.each(lineage, function() {
			ptr = ptr.pop();
		});

		this._root = ptr.getContextualObject();

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
				transition = this.get_object(),
				from = this.from();

			if(from.isActive() && from.isRunning()) {
				this.enable();
			}

			if(transitionType === "start") {
				transition.on("setTo", this.onTransitionToChanged, this);
			} else if(transitionType === "event") {
				var event = transition.getEvent();
				event.on_fire(this.fire, this);
			} else if(transitionType === "parsed") {
				var str = transition.getStr();
			}

			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }
			var transitionType = this.transitionType(),
				transition = this.get_object();
			if(transitionType === "start") {
				transition.off("setTo", this.onTransitionToChanged, this);
			} else if(transitionType === "event") {
				var event = transition.getEvent();
				event.off_fire(this.fire, this);
			} else if(transitionType === "parsed") {
			}
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
				from_pointer = pointer.pop();
			return from_pointer.getContextualObject();
		};
		proto.to = function () {
			var object = this.get_object(),
				to = object.to(),
				to_lineage = to.getLineage(),
				root = this.root(),
				root_pointer = root.get_pointer(),
				to_pointer = root_pointer;

			_.each(_.rest(to_lineage), function(state) {
				to_pointer = to_pointer.push(state);
			});

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
			return this._root;
		};

		proto.enable = function () {
			if(!this.isEnabled()) {
				this._enabled = true;
				this.$enabled.set(true);

				var transitionType = this.transitionType();
				if(transitionType === "start") {
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
