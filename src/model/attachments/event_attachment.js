/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var EVENT_STATUS = {
			BLOCKED: "BLOCKED",
			CONFIRMED: "CONFIRMED",
			CANCELLED: "CANCELLED",
			PENDING: "PENDING"
		},
		pendingQueue = {
			queue: [],
			priority: 0,
			contains: function(gesture) {
				var i = 0, queue = this.queue, len = queue.length, item;
				for(; i<len; i++) {
					item = queue[i];
					if(item.gesture === gesture) {
						return true;
					}
				}
				return false;
			},
			activate: function(gesture) {
				var priority = false;
				this.remove(gesture, function(item) {
					priority = item.priority;
					if(priority < this.priority) {
						item.callback.call(item.thisArg, EVENT_STATUS.BLOCKED);
					} else {
						item.callback.call(item.thisArg, EVENT_STATUS.CONFIRMED);
					}

					if(item.timeoutID) {
						window.clearTimeout(item.timeoutID);
						delete item.timeoutID;
					}
				}, this);

				if(priority) {
					this.removeBelowPriority(priority, function(item) {
						item.callback.call(item.thisArg, EVENT_STATUS.BLOCKED);
						if(item.timeoutID) {
							window.clearTimeout(item.timeoutID);
							delete item.timeoutID;
						}
					});
				}
			},

			removeAndClearTimeout: function(gesture) {
				this.remove(gesture, function(item) {
					window.clearTimeout(item.timeoutID);
				});
			},

			cancel: function(gesture) {
				this.remove(gesture, function(item) {
					item.callback.call(item.thisArg, EVENT_STATUS.CANCELLED);

					if(item.timeoutID) {
						window.clearTimeout(item.timeoutID);
						delete item.timeoutID;
					}
				});
			},

			add: function(gesture, callback, callbackThisArg) {
				if(!this.contains(gesture)) {
					var priority = gesture.getPriority(),
						activationDelay = gesture.getActivationDelay();

					callbackThisArg = callbackThisArg || window;

					var info = {
						gesture: gesture,
						priority: priority,
						activationDelay: activationDelay,
						callback: callback,
						thisArg: callbackThisArg
					};

					this.queue.push(info);
					if(_.isNumber(activationDelay)) {
						var timeoutID = setTimeout(_.bind(function() {
								this.activate(gesture);
							}, this), activationDelay);

						info.timeoutID = timeoutID;
					} else {
						this.activate(gesture);
						//callback.call(callbackThisArg, EVENT_STATUS.SUCCESS);
					}

					if(priority > this.priority) {
						this.priority = priority;
					}

					/*

					if(priority > this.priority) {
						this.clear(function(item) {
							window.clearTimeout(item.timeoutID);
							item.callback.call(item.thisArg, EVENT_STATUS.BLOCKED, [gesture]);
						});

						if(_.isNumber(activationDelay)) {
							this.priority = priority;
						} else {
							
						}
					}

					if(_.isNumber(activationDelay)) {
						var timeoutID = setTimeout(_.bind(function() {
								this.activate(gesture);
							}, this), activationDelay),
							info = {
								gesture: gesture,
								priority: priority,
								activationDelay: activationDelay,
								callback: callback,
								timeoutID: timeoutID,
								thisArg: callbackThisArg
							};

						this.queue.push(info);
					} else {
						callback.call(callbackThisArg, EVENT_STATUS.SUCCESS);
					}


					/*

					if(priority < this.priority) {
						callback.call(callbackThisArg, EVENT_STATUS.BLOCKED, this.queue);
						return false;
					} else {
						var activationDelay = gesture.getActivationDelay();

						if(priority > this.priority) {
							this.clear(function(item) {
								window.clearTimeout(item.timeoutID);
								item.callback.call(item.thisArg, EVENT_STATUS.BLOCKED, [gesture]);
							});

							if(_.isNumber(activationDelay)) {
								this.priority = priority;
							} else {
								
							}
						}

						if(_.isNumber(activationDelay)) {
							var timeoutID = setTimeout(_.bind(function() {
									this.activate(gesture);
								}, this), activationDelay),
								info = {
									gesture: gesture,
									priority: priority,
									activationDelay: activationDelay,
									callback: callback,
									timeoutID: timeoutID,
									thisArg: callbackThisArg
								};

							this.queue.push(info);
						} else {
							callback.call(callbackThisArg, EVENT_STATUS.SUCCESS);
						}
					}
					*/
				}
			},
			remove: function(gesture, fn, fnContext) {
				var i = 0, queue = this.queue, len = queue.length, item, maxPriority = 0;
				for(; i<len; i++) {
					item = queue[i];
					if(item.gesture === gesture) {
						queue.splice(i, 1);
						i--;
						len--;

						if(fn) { fn.call(fnContext, item); }
					} else if(item.priority > maxPriority) {
						maxPriority = item.priority;
					}
				}
				this.priority = maxPriority;
			},
			removeBelowPriority: function(priority, fn, fnContext) {
				var i = 0, queue = this.queue, len = queue.length, item, maxPriority = 0;
				for(; i<len; i++) {
					item = queue[i];
					if(item.priority<priority) {
						queue.splice(i, 1);
						i--;
						len--;

						if(fn) { fn.call(fnContext, item); }
					} else if(item.priority > maxPriority) {
						maxPriority = item.priority;
					}
				}
				this.priority = maxPriority;
			},
			clear: function(fn, fnContext) {
				if(fn) {
					var i = 0, queue = this.queue, len = queue.length, item;
					for(; i<len; i++) {
						item = queue[i];
						fn.call(fnContext, item);
						queue.splice(i, 1);
						i--;
						len--;
					}
				} else {
					this.queue.splice(0, this.queue.length);
				}
				this.priority = 0;
			}
		};

	var gesture_id = 0;

	ist.QueueableEvent = function (options) {
		this.options = _.extend({
			priority: false,
			activationDelay: 5
		}, options);

		this._touchClusters = [];
		this._state = EVENT_STATUS.PENDING;
		this._id = gesture_id++;

		this.cancelled = new ist.ManualEvent();
		this.confirmed = new ist.ManualEvent();
		this.blocked = new ist.ManualEvent();
		this.requested = new ist.ManualEvent();
		this.fired = new ist.ManualEvent();

		able.make_this_listenable(this);
	};

	(function(My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);

		My.EVENT_STATUS = EVENT_STATUS;

		proto.getState = function() {
			return this._state;
		};
		proto.setState = function(state_val) {
			this._state = state_val;
			return this;
		};

		proto.requestFire = function(event, callback) {
			var builtin_event = false;
			if(event && event instanceof ist.ContextualStatefulObj) {
				var fireable_attachment = event.get_attachment_instance("fireable_attachment");
				if(fireable_attachment) {
					builtin_event = true;
					var eventObject = fireable_attachment.getEvent(),
						newEvent = eventObject.when(function() { return false; });

					eventObject.on_fire_request(function() {
						this.requestFire(false, function(status) {
							if(status === EVENT_STATUS.CONFIRMED) {
								newEvent.fire();
							}
						});
					}, this);
					return newEvent;
				}
			}

			this.requested.fire();

			if(!builtin_event) {
				this._emit(EVENT_STATUS.PENDING, { });
				pendingQueue.add(this, function(status) {
					if(callback) {
						callback(status);	
					}
					if(status === EVENT_STATUS.BLOCKED) {
						this.blocked.fire();
						//this._emit(EVENT_STATUS.BLOCKED, { });
						this.setState(EVENT_STATUS.READY);
					} else if(status === EVENT_STATUS.CONFIRMED) {
						this.confirmed.fire();
						this.fired.fire();
						//this._emit(EVENT_STATUS.CONFIRMED, { });
						this.setState(EVENT_STATUS.READY);
					} else if(status === EVENT_STATUS.CANCELLED) {
						this.cancelled.fire();
						//this._emit(EVENT_STATUS.CANCELLED, { });
						this.setState(EVENT_STATUS.READY);
					} else {
						throw new Error("Unrecognized status");
					}
				}, this);
			}
		};

		proto.cancel = function() {
			pendingQueue.cancel(this);
		};
		/*

		proto.markPossible = function() {
			pendingQueue.removeAndClearTimeout(this);
			this._state.set(EVENT_STATUS.POSSIBLE);
			this._emit(EVENT_STATUS.POSSIBLE, { });
		};
		proto.markFailed = function() {
			pendingQueue.removeAndClearTimeout(this);
			this._state.set(EVENT_STATUS.FAILED);
			this._emit(EVENT_STATUS.FAILED, { });
		};
		proto.markBegan = function() {
			this._state.set(EVENT_STATUS.BEGAN);
			this.addToPendingQueue(function(status, info) {
				if(status === EVENT_STATUS.BLOCKED) {
					this.markBlocked(info);
				} else if(status === EVENT_STATUS.SUCCESS) {
					this._emit(EVENT_STATUS.BEGAN, { });
				} else {
					throw new Error("Unrecognized status");
				}
			}, this);
		};
		proto.markBlocked = function(blockedBy) {
			pendingQueue.removeAndClearTimeout(this);
			this._state.set(EVENT_STATUS.BLOCKED);
			this._emit(EVENT_STATUS.BLOCKED, {
				blockedBy: blockedBy
			});
		};
		proto.markRecognized = function() {
			this._state.set(EVENT_STATUS.RECOGNIZED);
			this.addToPendingQueue(function(status, info) {
				if(status === EVENT_STATUS.BLOCKED) {
					this.markBlocked(info);
				} else if(status === EVENT_STATUS.SUCCESS) {
					this._emit(EVENT_STATUS.RECOGNIZED, { });
				} else {
					throw new Error("Unrecognized status");
				}
			}, this);
		};

		proto.addToPendingQueue = function(callback, thisArg) {
			pendingQueue.add(this, callback, thisArg);
		};
		proto.isPendingApproval = function() {
			return pendingQueue.contains(this);
		};
		*/
			
		proto.getPriority = function() {
			return this.options.priority || 0;
		};
		/*
		proto.getName = function() {
			return this.options.name;
		};
		*/
		proto.getActivationDelay = function() {
			return this.options.activationDelay;
		};
		proto.id = function() {
			return this._id;
		};
		/*
		proto.getTouchClusters = function() {
			return this._touchClusters;
		};
		proto.isDiscrete = function() {
			return this.options.discrete;
		};
		*/

		proto.setOption = function(a, b) {
			if(arguments.length === 1) {
				_.extend(this.options, a);
			} else if(arguments.length > 1) {
				this.options[a] = b;
			}
		};

		proto.destroy = function(silent) {
			able.destroy_this_listenable(this);
		};
	}(ist.QueueableEvent));

	ist.EventAttachment = ist.register_attachment("event_attachment", {
			ready: function(contextual_object) {
				this.qEvent = new ist.QueueableEvent({ });
			},
			destroy: function(silent) {
				this.qEvent.destroy(silent);
			},
			parameters: {
				options: function(contextual_object) {
					var priority = contextual_object.prop_val("priority"),
						activationDelay = contextual_object.prop_val("activationDelay");

					this.qEvent.setOption({
						priority: priority,
						activationDelay: activationDelay
					});
				}
			},
			proto_props: {
				fire: function(e) {
					this.qEvent.requestFire(e);
					//ist.fire.call(this.contextual_object, e);
				},
				getEvent: function() {
					return this.qEvent.confirmed;
				}
			},
			outputs: {
				fire: function(contextual_object) {
					return function() { debugger; }
					return _.bind(this.qEvent.requestFire, this.qEvent);
					//return _.bind(ist.fire, contextual_object)
				},
				cancelled: function(contextual_object) {
					return this.qEvent.cancelled;
				},
				confirmed: function(contextual_object) {
					return this.qEvent.confirmed;
				},
				blocked: function(contextual_object) {
					return this.qEvent.blocked;
				},
				requested: function(contextual_object) {
					return this.qEvent.requested;
				},
			}
		});
}(interstate, jQuery));
