/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualTransition = function (options) {
		ist.ContextualTransition.superclass.constructor.apply(this, arguments);

		if(options.avoid_constructor) { return; }

		this._runtime_errors = new cjs.Constraint(false);

		var transition = this.get_object(),
			from = transition.from(),
			lineage = from.getLineage(),
			ptr = this.get_pointer();

		_.each(lineage, function() {
			ptr = ptr.pop();
		});

		this._root = ptr.getContextualObject();
		ptr = ptr.pop();
		this._statefulObj = ptr.length() > 0 ? ptr.getContextualObject() : false;

		this.$active = cjs(false);
		this.$event = cjs(false);
		this.$enabled = cjs(false);

		this._times_run = 0;
		this.$times_run = cjs(this._times_run);
		this._manual_event = new ist.ManualEvent();
		this._manual_event.on_fire(this.fire, this);
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
		proto.get_runtime_errors = function() {
			this._live_event_updater.run();
			return this._runtime_errors.get();
		};
		proto.getStr = function() {
			var object = this.get_object();
			return object.getStr();
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

			if(this._live_event_updater) {
				if(this.isEnabled()) {
					this._live_event_updater.run(false);
				} else {
					this._live_event_updater.pause();
				}
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
				try {
					event = event_constraint.get();
				} catch(e) {
					event = new ist.Error({
						message: e.message,
						type: "runtime"
					});
					if(ist.__log_errors) {
						console.error(e);
					}
				}

				if(event instanceof ist.MultiExpression) {
					actions = event.rest();
					event = event.first();
				} else {
					actions = [];
				}

				if(event instanceof ist.Error) {
					this._runtime_errors.set([event.message()]);
					event_object = false;
				} else {
					if(event instanceof ist.BasicObject) {
						event_object = event;
						var ptr = pointer.push(event_object);
						event = ptr.getContextualObject();
					} else {
						event_object = false;
					}

					this._runtime_errors.set(false);
				}

				if(event instanceof ist.Event) {
					event.set_transition(this);
					can_destroy_event = true;
				} else if(event instanceof ist.ContextualObject) {
					var cobj = event,
						fireable_attachment = cobj.get_attachment_instance("fireable_attachment"); 

					if(fireable_attachment) {
						event = fireable_attachment.getEvent();
					}

					can_destroy_event = event_object ? true : false;
				} else if(!(event instanceof ist.Error)) {
					if(event && !old_event) {
						this._manual_event.fire(event);
					}
				}

				this._event = event;

				if(event instanceof ist.Event) {
					event.on_fire(this.fire, this, actions, csobj, pointer);
					if(this.isEnabled()) {
						event.enable();
					}
				}

				if (old_event && old_event !== event && old_event.off_fire) {
					old_event.off_fire(this.fire, this);

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
				run_on_create: false,
				on_destroy: function() {
					event_constraint.destroy(true);
					if(old_event && old_event.off_fire) {
						old_event.off_fire(this.fire, this);
					}
					if(can_destroy_old_event) {
						old_event.destroy();
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
			//debugger;
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
			this._manual_event.off_fire(this.fire, this);
			this._manual_event.destroy();
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
			var event = this.event(),
				stringified_event = event ? event.toString() : "";

			return stringified_event;
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
					if(this._event && this._event.enable) {
						this._event.enable();
					}
				}
				if(this._live_event_updater && this._live_event_updater.resume()) {
					this._live_event_updater.run();
				}
			}
		};

		proto.disable = function () {
			if(this.isEnabled()) {
				this._enabled = false;
				this.$enabled.set(false);

				var eventType = this.eventType();
				if(eventType === "parsed") {
					if(this._event && this._event.disable) {
						this._event.disable();
					}
				}
				if(this._live_event_updater) {
					this._live_event_updater.pause();
				}
				/*

				var event = this.event();
				event.disable();
				if(ist.__debug_statecharts) {
				}
				*/
			}
		};
		proto.usedByAnyProperties = function() {
			return this._statefulObj.usesState(this);
		};

		proto.summarizeTransition = function() {
			return {
				type: "transition",
				from: this.from(),
				to: this.to(),
				id: this.id(),
				usedByAnyProperties: this.usedByAnyProperties(),
				transition: this
			};
		};

		proto.isEnabled = function() {
			return this.$enabled.get();
		};
		proto.has = function(key) {
			return key === "event";
		};
	}(ist.ContextualTransition));

	ist.on_event = function (event_type, arg1, arg2, arg3, arg4) {
		if (event_type === "timeout") {
			var timeout_event = new ist.TimeoutEvent(arg1);
			return timeout_event;
		} else if(event_type === "time") {
			var time_event = new ist.TimeEvent(arg1);
			return time_event;
		} else if(event_type === "frame") {
			var frame_event = new ist.FrameEvent();
			return frame_event;
		} else if(event_type === "cross") {
			var touchCluster = arg1,
				target = arg2,
				min_velocity = arg3,
				max_velocity = arg4,
				cross_event = new ist.CrossEvent(touchCluster, target, min_velocity, max_velocity);

			return cross_event;
		} else if(event_type === "collision") {
			var	targs_a = arg1,
				targs_b = arg2,
				collision_event = new ist.CollisionEvent(targs_a, targs_b);

			return collision_event;
		} else {
			var targets = _.rest(arguments);
			var events = [];

			if (targets) {
				/*
				var statechart_spec = event_type;
				var statechart_event = new ist.TransitionEvent(targets, statechart_spec);
				events.push(statechart_event);
				*/
				if (arguments.length <= 1) { // Ex: on('mouseup') <-> on('mouseup', window)
					targets = window;
				}
				var ist_event_type = event_type;
				var ist_event = new ist.IstObjEvent(ist_event_type, targets);
				events.push(ist_event);
			}
			if (arguments.length <= 1) { // Ex: on('mouseup') <-> on('mouseup', window)
				targets = window;
			}
			var dom_event = new ist.DOMEvent(event_type, targets);
			events.push(dom_event);

			return new ist.CombinationEvent(events);
		}
	};

	ist.register_serializable_type("ist_on_event_func",
		function (x) {
			return x === ist.on_event;
		},
		function () {
			return {};
		},
		function (obj) {
			return ist.on_event;
		});

}(interstate));
