/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var GESTURE_STATES = {
			READY: "READY",
			PENDING: "PENDING"
		},
		GESTURE_STATUS = {
			BLOCKED: "BLOCKED",
			CONFIRMED: "CONFIRMED",
			CANCELLED: "CANCELLED",
			PENDING: "PENDING"
		};

	var pendingQueue = {
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
					item.callback.call(item.thisArg, GESTURE_STATUS.BLOCKED);
				} else {
					item.callback.call(item.thisArg, GESTURE_STATUS.CONFIRMED);
				}

				if(item.timeoutID) {
					window.clearTimeout(item.timeoutID);
					delete item.timeoutID;
				}
			}, this);

			if(priority) {
				this.removeBelowPriority(priority, function(item) {
					item.callback.call(item.thisArg, GESTURE_STATUS.BLOCKED);
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
				item.callback.call(item.thisArg, GESTURE_STATUS.CANCELLED);

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
					//callback.call(callbackThisArg, GESTURE_STATUS.SUCCESS);
				}

				if(priority > this.priority) {
					this.priority = priority;
				}

				/*

				if(priority > this.priority) {
					this.clear(function(item) {
						window.clearTimeout(item.timeoutID);
						item.callback.call(item.thisArg, GESTURE_STATUS.BLOCKED, [gesture]);
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
					callback.call(callbackThisArg, GESTURE_STATUS.SUCCESS);
				}


				/*

				if(priority < this.priority) {
					callback.call(callbackThisArg, GESTURE_STATUS.BLOCKED, this.queue);
					return false;
				} else {
					var activationDelay = gesture.getActivationDelay();

					if(priority > this.priority) {
						this.clear(function(item) {
							window.clearTimeout(item.timeoutID);
							item.callback.call(item.thisArg, GESTURE_STATUS.BLOCKED, [gesture]);
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
						callback.call(callbackThisArg, GESTURE_STATUS.SUCCESS);
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
					fn.call(fnContext, item)
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

	ist.TouchGesture = function (options) {
		this.options = _.extend({
			priority: 0,
			activationDelay: 5
		}, options);

		this._touchClusters = [];
		this._state = GESTURE_STATES.PENDING;
		this._id = gesture_id++;
		able.make_this_listenable(this);
	};

	(function(My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);

		My.GESTURE_STATES = GESTURE_STATES;
		My.GESTURE_STATUS = GESTURE_STATUS;

		proto.getState = function() {
			return this._state;
		};
		proto.setState = function(state_val) {
			return this._state = state_val;
		};

		proto.requestFire = function(event, callback) {
			var builtin_event = false;
			if(event && event instanceof ist.ContextualStatefulObj) {
				var event_attachment = event.get_attachment_instance("event_attachment");
				if(event_attachment) {
					builtin_event = true;
					var eventObject = event_attachment.getEvent(),
						newEvent = eventObject.when(function() { return false; });

					eventObject.on_fire_request(function() {
						this.requestFire(false, function(status) {
							if(status === GESTURE_STATUS.CONFIRMED) {
								newEvent.fire();
							}
						});
					}, this);
					return newEvent;
				}
			}

			if(!builtin_event) {
				this._emit(GESTURE_STATUS.PENDING, { });
				pendingQueue.add(this, function(status) {
					if(callback) {
						callback(status);	
					}
					if(status === GESTURE_STATUS.BLOCKED) {
						this._emit(GESTURE_STATUS.BLOCKED, { });
						this.setState(GESTURE_STATES.READY);
					} else if(status === GESTURE_STATUS.CONFIRMED) {
						this._emit(GESTURE_STATUS.CONFIRMED, { });
						this.setState(GESTURE_STATES.READY);
					} else if(status === GESTURE_STATUS.CANCELLED) {
						this._emit(GESTURE_STATUS.CANCELLED, { });
						this.setState(GESTURE_STATES.READY);
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
			this._state.set(GESTURE_STATES.POSSIBLE);
			this._emit(GESTURE_STATES.POSSIBLE, { });
		};
		proto.markFailed = function() {
			pendingQueue.removeAndClearTimeout(this);
			this._state.set(GESTURE_STATES.FAILED);
			this._emit(GESTURE_STATES.FAILED, { });
		};
		proto.markBegan = function() {
			this._state.set(GESTURE_STATES.BEGAN);
			this.addToPendingQueue(function(status, info) {
				if(status === GESTURE_STATUS.BLOCKED) {
					this.markBlocked(info);
				} else if(status === GESTURE_STATUS.SUCCESS) {
					this._emit(GESTURE_STATES.BEGAN, { });
				} else {
					throw new Error("Unrecognized status");
				}
			}, this);
		};
		proto.markBlocked = function(blockedBy) {
			pendingQueue.removeAndClearTimeout(this);
			this._state.set(GESTURE_STATES.BLOCKED);
			this._emit(GESTURE_STATES.BLOCKED, {
				blockedBy: blockedBy
			});
		};
		proto.markRecognized = function() {
			this._state.set(GESTURE_STATES.RECOGNIZED);
			this.addToPendingQueue(function(status, info) {
				if(status === GESTURE_STATUS.BLOCKED) {
					this.markBlocked(info);
				} else if(status === GESTURE_STATUS.SUCCESS) {
					this._emit(GESTURE_STATES.RECOGNIZED, { });
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
			return this.options.priority;
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
	}(ist.TouchGesture));
	/*
	var g1 = new ist.TouchGesture();
	g1 .on(ist.TouchGesture.GESTURE_STATUS.BLOCKED, function() {
			console.log("g1 blocked");
		}, this)
		.on(ist.TouchGesture.GESTURE_STATUS.CONFIRMED, function() {
			console.log("g1 confirmed");
		}, this)
		.on(ist.TouchGesture.GESTURE_STATUS.CANCELLED, function(event) {
			console.log("g1 cancelled");
		}, this);
	g1.requestFire();
	var g2 = new ist.TouchGesture({
		priority: -1
	});
	g2 .on(ist.TouchGesture.GESTURE_STATUS.BLOCKED, function() {
			console.log("g2 blocked");
		}, this)
		.on(ist.TouchGesture.GESTURE_STATUS.CONFIRMED, function() {
			console.log("g2 confirmed");
		}, this)
		.on(ist.TouchGesture.GESTURE_STATUS.CANCELLED, function(event) {
			console.log("g2 cancelled");
		}, this);
	g2.requestFire();
	g2.cancel();
	*/
}(interstate));
