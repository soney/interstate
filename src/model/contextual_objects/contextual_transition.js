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
			if(this.eventType() === "start") {
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

			var eventType = this.eventType(),
				transition = this.get_object(),
				from = this.from();

			if(from.isActive() && from.isRunning()) {
				this.enable();
			}

			if(eventType === "start") {
				transition.on("setTo", this.onTransitionToChanged, this);
			} else if(eventType === "event") {
				var event = transition.getEvent();
				event.on_fire(this.fire, this);
			} else if(eventType === "parsed") {
				this._add_live_event_updater();
			}

			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto._add_live_event_updater = function() {
			var transition = this.get_object(),
				pointer = this.get_pointer(),
				event_constraint = ist.get_indirect_parsed_$(transition._tree, {
					context: pointer
				}),
				root = this.root(),
				csobj = root.get_pointer().pop().getContextualObject(),
				old_event = false,
				old_event_object = false,
				can_destroy_old_event = false,
				event_object, event, can_destroy_event, actions;

			this._live_event_updater = cjs.liven(function() {
				event = event_constraint.get();

				if(event instanceof ist.BasicObject) {
					event_object = event;
					var ptr = pointer.push(event_object);
					event = ptr.getContextualObject();
				} else {
					event_object = false;
				}

				if(event instanceof ist.Event) {
					can_destroy_event = true;
				} else if(event instanceof ist.ContextualObject) {
					var cobj = event,
						fireable_attachment = cobj.get_attachment_instance("fireable_attachment"); 

					if(fireable_attachment) {
						event = fireable_attachment.getEvent();
					}

					if(event_object) { can_destroy_event = true; }
					else { can_destroy_event = false; }
				} else {
					if(cjs.isConstraint(event_constraint)) {
						cjs.removeDependency(event_constraint, this._live_event_updater._constraint);
					}
					event = new ist.ConstraintEvent(event_constraint, event);
					can_destroy_old_event = true;
				}

				if(event instanceof ist.MultiExpression) {
					actions = event.rest();
					event = event.first();
				} else {
					actions = [];
				}

				this._event = event;

				event.on_fire(this.fire, this, actions, csobj, pointer);

				if(this.isEnabled()) {
					event.enable();
				}

				if (old_event && old_event !== event) {
					old_event.off_fire(this.child_fired, this);

					if(can_destroy_old_event) {
						old_event.destroy(true); //destroy silently (without nullifying)
					}
				}
				if (old_event_object && old_event_object !== event_object) {
					old_event_object.destroy(true);
				}
				old_event = event;
				old_event_object = event_object;
				can_destroy_old_event = can_destroy_event;
			}, {
				context: this,
				on_destroy: function() {
					event_constraint.destroy(true);
					if(old_event) {
						old_event.off_fire(this.child_fired, this);
						if(can_destroy_old_event) {
							old_event.destroy(true);
						}
					}
				}
			});
		};
		proto._remove_live_event_updater = function() {
			if(this._live_event_updater) {
				this._live_event_updater.destroy();
			}
		};
		proto.begin_destroy = function() {
			this._remove_live_event_updater();

			My.superclass.begin_destroy.apply(this, arguments);
		};
		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }
			var eventType = this.eventType(),
				transition = this.get_object();
			if(eventType === "start") {
				transition.off("setTo", this.onTransitionToChanged, this);
			} else if(eventType === "event") {
				var event = transition.getEvent();
				event.off_fire(this.fire, this);
			} else if(eventType === "parsed") {
			}
			My.superclass.destroy.apply(this, arguments);
		};
		proto.eventType = function() {
			var transition = this.get_object();
			return transition.eventType();
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

				var eventType = this.eventType();
				if(eventType === "start") {
					this.onTransitionToChanged();
				} else if(eventType === "parsed") {
					if(this._event) {
						this._event.enable();
					}
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

				var eventType = this.eventType();
				if(eventType === "parsed") {
					if(this._event) {
						this._event.disable();
					}
				}
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
