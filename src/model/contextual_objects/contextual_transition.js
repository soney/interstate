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
		this._manual_event = new ist.Event();
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

			if(from.isActive() && from.isRunning()) { this.enable(); }

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
		proto.statefulObj = function() {
			return this.from().statefulObj();
		};
		proto._add_live_event_updater = function() {
			var transition = this.get_object(),
				pointer = this.get_pointer(),
				root = this.root(),
				csobj = root.get_pointer().pop().getContextualObject(),
				old_event = false,
				old_event_cobj = false,
				//old_event_bobj = false,
				//can_destroy_old_event = false,
				//can_destroy_event,
				actions, ptr, event_attachment;

			//var constraint = false;
			this.event_constraint = cjs(function() {
				return transition.constraint_in_context(pointer);
			/*
				if(constraint && constraint.destroy) {
					constraint.destroy(true);
				}
				constraint = transition.constraint_in_context(pointer);
				return constraint;
				*/
			});
			/*
			var old_destroy = this.event_constraint.destroy;
			this.event_constraint.destroy = function() {
				if(constraint && constraint.destroy) {
					constraint.destroy(true);
					constraint = false;
				}
				old_destroy.apply(this, arguments);
			};
			*/

			this.event = this.event_cobj = false;

			this._live_event_updater = cjs.liven(function() {
				old_event = this.event;
				old_event_cobj = this.event_cobj;

				try {
					this.event = this.event_constraint.get();
					/*

					if((old_event !== this.event) && old_event && old_event.destroy) {
						old_event.destroy(true);
						old_event = false;
					}
					*/

					if(this.event instanceof ist.MultiExpression) {
						actions = _.map(this.event.rest(), function(node) {
							return _.bind(function() {
								ist.get_parsed_$(node, {
									get_constraint: false,
									context: this._statefulObj.get_pointer()
								});
							}, this);
						}, this);
						this.event = cjs.get(this.event.first());
					} else {
						actions = [];
						this.event = cjs.get(this.event);
					}
				} catch(e) {
					this.event = new ist.Error({
						message: e.message,
						type: "runtime"
					});
					if(ist.__log_errors) {
						console.error(e);
					}
				}



				if(this.event instanceof ist.Error) {
					this._runtime_errors.set([this.event.message()]);
					this.event_cobj = false;
				} else {
					if(this.event instanceof ist.ContextualObject) {
					/*
						var obj = this.event.get_object();
						if(!(old_event_cobj && old_event_cobj.get_object() === obj)) {
							this.event_bobj = false;
							ptr = pointer.push(obj);
							this.event_cobj = ptr.getContextualObject();
						}
						*/
						this.event_cobj = this.event;
							 
						event_attachment = this.event_cobj.get_attachment_instance("event_attachment");
						if(event_attachment) {
							this.event = event_attachment.getEvent();
						} else {
							this.event = false;
						}
					} else if(this.event instanceof ist.Event) {
						//console.log(this.getStr(), this.event._id, this.sid());
						this.event_cobj = false;
					} else { // boolean event type
						this.event_cobj = false;
						if(this.event && !old_event) {
							this.runActions(actions);
							this._manual_event.fire(this.event);
						}
					}

					this._runtime_errors.set(false);
				}

				if(this.event !== old_event) {
					if(this.event instanceof ist.Event) {
						this.event.on_fire(this.fire, this, actions, csobj, pointer);
						if(this.isEnabled()) {
							this.event.enable();
							if(this.event && this.event.enable) {
								this.event.enable();
							}
							if(this.event_cobj) {
								//var ptr = this.get_pointer().push(this.event_object),
									//event_cobj = ptr.getContextualObject();
								this.event_cobj.onTransitionEnabled();
							}
						}
					}

					//if(old_event_cobj) {
						//if(old_event_cobj.createdInline) {
							//var object = old_event_cobj.get_object();
							//object.destroy();
							//old_event = false;
						//}
					//}

					if (old_event && old_event.off_fire && !old_event.destroyed) {
						old_event.off_fire(this.fire, this);

						//if(!old_event_cobj) { // if we created the old basic object, we can go ahead and destroy this event.
							//old_event.destroy(true); //destroy silently (without nullifying)
						//}
						//old_event.destroy();
					}

					//if (old_event_cobj && old_event_cobj !== this.event_cobj) {
						//old_event_cobj.destroy();
					//}

					//console.log(old_event_bobj);
				}

				//old_event = event;
				//old_event_object = event_object;
				//can_destroy_old_event = can_destroy_event;
				//this.can_destroy_event = can_destroy_event;
			}, {
				context: this,
				run_on_create: false,
				pause_while_running: true,
				on_destroy: function() {
					old_event = this.event;
					if (old_event && old_event.off_fire && !old_event.destroyed) {
						old_event.off_fire(this.fire, this);
					}
					//event_constraint.destroy(true);
					/*
					if(old_event && old_event.off_fire) {
						old_event.off_fire(this.fire, this);
					}
					*/

					//on the begin destroy call, we don't want to actually destroy the event object once we stop running.
					
					//if(can_destroy_old_event) {
						//old_event.destroy();
					//}
				}
			});
		};
		proto._remove_live_event_updater = function() {
			if(this._live_event_updater) {
				this._live_event_updater.destroy();
			}
		};
		proto.begin_destroy = function() {
			var eventType = this.eventType();

			this._remove_live_event_updater();

			if(eventType === "parsed") {
				if(this.event instanceof ist.IstObjEvent && !this.event_cobj) { // created from an 'on' call
					this.event.destroy();
					this.event = false;
				}
				//console.log(this.event);
				//if(this.can_destroy_event) {
				//if(this.event instanceof ist.Event && !this.event_cobj) { // destroy any event objects early
					//this.event.destroy();
					//this.event = false;
				//}
				//}
			}

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
				this.event_constraint.destroy(true);
					//event_constraint.destroy(true);
				//if(this.can_destroy_event) {
				this.event_cobj = this.event = false;
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
		proto.event = function () { return this.event; };
		proto.involves = function (state) { return this.from() === state || this.to() === state; };
		proto.fire = function (actions, cobj, pointer, event) {
			this.runActions(actions);
			if (this.from()._onOutgoingTransitionFire(this, cobj)) {
				//if(this.sid() === 352) {
					//console.log("FIRE", event);
				//}
				this._emit("fire", {type: "fire", target: this});
				if(this.event_cobj) {
					this.event_cobj.onTransitionFired(event);
				}
			} else {
				if(this.event_cobj) {
					this.event_cobj.onTransitionNotFired(event);
				}
			}
		};
		proto.runActions = function(actions) {
			_.each(actions, function(action) {
				action();
			}, this);
		};
		proto.stringify = function () {
			var stringified_event = this.getStr();

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
					if(this.event && this.event.enable) {
						this.event.enable();
					}
					if(this.event_cobj) {
						//console.log("ENABLED");
						//var ptr = this.get_pointer().push(this.event_object),
							//event_cobj = ptr.getContextualObject();
						this.event_cobj.onTransitionEnabled();
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
					if(this.event && this.event.disable) {
						this.event.disable();
					}

					//if(this.event_object instanceof ist.BasicObject) {
					if(this.event_cobj) {
						//var ptr = this.get_pointer().push(this.event_object),
							//event_cobj = ptr.getContextualObject();
						this.event_cobj.onTransitionDisabled();
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
		/*
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
		*/
		var targets;
		if (arguments.length <= 1) { // Ex: on('mouseup') <-> on('mouseup', window)
			targets = window;
		} else {
   			targets = _.rest(arguments);
		}
		
		return new ist.IstObjEvent(event_type, targets);
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
