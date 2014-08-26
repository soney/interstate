/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var GESTURE_STATES = {
			POSSIBLE: "POSSIBLE",
			FAILED: "FAILED",
			BEGAN: "BEGAN",
			BLOCKED: "BLOCKED",
			RECOGNIZED: "RECOGNIZED"
		},
		GESTURE_STATUS = {
			BLOCKED: "BLK",
			SUCCESS: "SCSS"
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
			this.remove(gesture, function(item) {
				item.callback.call(item.thisArg, GESTURE_STATUS.SUCCESS);
				window.clearTimeout(item.timeoutID);
			});
		},
		removeAndClearTimeout: function(gesture) {
			this.remove(gesture, function(item) {
				window.clearTimeout(item.timeoutID);
			});
		},
		add: function(gesture, callback, callbackThisArg) {
			if(!this.contains(gesture)) {
				var priority = gesture.getPriority();

				callbackThisArg = callbackThisArg || window;

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
			}
		},
		remove: function(gesture, fn) {
			var i = 0, queue = this.queue, len = queue.length, item, maxPriority = 0;
			for(; i<len; i++) {
				item = queue[i];
				if(item.gesture === gesture) {
					queue.splice(i, 1);
					i--;
					len--;

					if(fn) { fn(item); }
				} else if(item.priority > maxPriority) {
					maxPriority = item.priority;
				}
			}
			this.priority = maxPriority;
		},
		clear: function(fn) {
			if(fn) {
				var i = 0, queue = this.queue, len = queue.length, item;
				for(; i<len; i++) {
					item = queue[i];
					fn(item)
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
			discrete: false,
			name: "Gesture",
			priority: 0,
			activationDelay: 5
		}, options);

		this._touchClusters = [];
		this._state = cjs(GESTURE_STATES.POSSIBLE);
		this._id = gesture_id++;
		able.make_this_listenable(this);
	};

	(function(My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);

		My.GESTURE_STATES  = GESTURE_STATES;

		proto.getState = function() {
			return this._state.get();
		};

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
			
		proto.getPriority = function() {
			return this.options.priority;
		};
		proto.getName = function() {
			return this.options.name;
		};
		proto.getActivationDelay = function() {
			return this.options.activationDelay;
		};
		proto.id = function() {
			return this._id;
		};
		proto.getTouchClusters = function() {
			return this._touchClusters;
		};
		proto.isDiscrete = function() {
			return this.options.discrete;
		};

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
}(interstate));
