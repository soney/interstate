/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,window,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var EventQueue = function () {
		able.make_this_listenable(this);

		this.end_queue_round = false;
		this.queue = [];
		this.running_event_queue = false;

		var semaphore = 0;
		this.wait = function () {
			semaphore--;
		};
		this.signal = function () {
			semaphore++;
			if (semaphore >= 0) {
				this.run_event_queue();
			}
		};
		this.is_ready = function () {
			return semaphore >= 0;
		};
		this.num_post_event_queue_rounds = 7;
		this.destroyed = false;
	};
	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);

		proto.is_running = function () {
			return this.running_event_queue === false;
		};
		proto.clear = function() {
			this.queue.splice(0, this.queue.length);
		};

		proto.run_event_queue = function () {
			var i;
			if (this.running_event_queue === false) {
				this.running_event_queue = true;
				this._emit("begin_event_queue", {
					type: "begin_event_queue",
					target: this
				});
				this.do_run_event_queue();
				for (i = 0; i <= this.num_post_event_queue_rounds; i += 1) {
					this.end_queue_round = i;
					var event_type = "end_event_queue_round_" + i;
					this._emit(event_type, {
						type: event_type,
						target: this,
						round: i
					});
				}
				this.end_queue_round = false;
				this.running_event_queue = false;

				if(this.deferred_req) {
					this.deferred_req = false;
					this.run_event_queue();
				}
			} else {
				this.deferred_req = true;
			}
		};

		proto.push = function (context, args) {
			this.queue.push({
				context: context,
				args: args
			});
		};

		proto.do_run_event_queue = function () {
			var fire = ist.Event.prototype._fire;
			while (this.queue.length > 0) {
				var event_info = this.queue.shift();
				fire.apply(event_info.context, event_info.args);
			}
		};
	}(EventQueue));

	ist.event_queue = new EventQueue();

	var id = 0;
	ist.Event = function () {
		able.make_this_listenable(this);
		//this._initialize();
		this.actual_firetime_listeners = [];
		this.requested_firetime_listeners = [];
		this._transition = undefined;
		this._enabled = false;
		this._id = id++;
		this.on_create.apply(this, arguments);
		this._initialized = false;
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);
		proto.id = function() {
			return this._id;
		};
		proto.initialize = function () {
			this._initialized = true;
			/*
			if(this.is_active()) {
				this.enable_outgoing_transitions();
			}
				/*

				if(from.is_active()) {
					transition.enable();
				} else {
					transition.disable();
				}
				*/
		};
		proto.id = function () { return this._id; };
		proto.sid = function() { return parseInt(uid.strip_prefix(this.id()), 10); };
		proto.on_create = function (options) {
			this._enabled = options && options.enabled;
		};
		proto.on_ready = function() {};
		proto.fire = function () {
			var args = _.toArray(arguments);

			ist.event_queue.push(this, args);
			_.forEach(this.requested_firetime_listeners, function (listener) {
				listener.callback.apply(listener.context || this, listener.args.concat(args));
			}, this);
			
			if (ist.event_queue.is_ready()) {
				ist.event_queue.run_event_queue();
			}
		};
		proto.on_fire_request = function(callback, context) {
			var args = _.rest(arguments, 2);
			this.requested_firetime_listeners.push({callback: callback, context: context, args: args});
		};
		proto.off_fire_request = function (callback, context) {
			for(var i = 0; i<this.requested_firetime_listeners.length; i++) {
				var listener = this.requested_firetime_listeners[i];
				if(listener.callback === callback && (!context || listener.context === context)) {
					this.requested_firetime_listeners.splice(i, 1);
					i--;
				}
			}
		};
		proto.on_fire = proto.add_listener = function (callback, context) {
			var args = _.rest(arguments, 2);
			this.actual_firetime_listeners.push({callback: callback, context: context, args: args});
		};
		proto.off_fire = proto.remove_listener = function (callback, context) {
			for(var i = 0; i<this.actual_firetime_listeners.length; i++) {
				var listener = this.actual_firetime_listeners[i];
				if(listener.callback === callback && (!context || listener.context === context)) {
					this.actual_firetime_listeners.splice(i, 1);
					i--;
				}
			}
		};
		proto.set_transition = function (transition) { this._transition = transition; };
		proto.get_transition = function () { return this._transition; };
		proto._fire = function () {
			var args = _.toArray(arguments);
			_.forEach(this.actual_firetime_listeners, function (listener) {
				listener.callback.apply(listener.context || this, listener.args.concat(args));
			}, this);
		};
		proto.guard = proto.when = function (func) {
			var new_event = new ist.Event();
			this.on_fire(function () {
				if (func.apply(this, arguments)) {
					new_event.fire.apply(new_event, arguments);
				}
			});
			return new_event;
		};
		proto.when_eq = function (prop, val) {
			return this.guard(function (event) {
				return event && event[prop] === val;
			});
		};
		proto.throttle = function(limit) {
			if(!_.isNumber(limit) || limit < 0) {
				limit = 50;
			}
			var timeout = false;
			var last_args;
			var new_event = new ist.Event();
			this.on_fire(function () {
				last_args = arguments;
				if(!timeout) {
					timeout = true;
					window.setTimeout(function() {
						timeout = false;
						new_event.fire.apply(new_event, _.toArray(last_args));
					}, limit);
				}
			});
			var old_enable = new_event.enable,
				old_disable = new_event.disable,
				old_destroy = new_event.destroy;

			new_event.enable = _.bind(function() {
				old_enable.apply(new_event, arguments);
				this.enable();
			}, this);
			new_event.disable = _.bind(function() {
				old_disable.apply(new_event, arguments);
				this.disable();
			}, this);
			new_event.destroy = _.bind(function() {
				old_destroy.apply(new_event, arguments);
				this.destroy();
				delete new_event.enable;
				delete new_event.disable;
				delete new_event.destroy;
			}, this);
			return new_event;
		};
		proto.preventDefault = function() {
			this.on_fire_request(function(event) {
				if(event.preventDefault) {
					event.preventDefault();
				}
			});
			return this;
		};
		proto.stopPropagation = function() {
			this.on_fire_request(function(event) {
				if(event.stopPropagation) {
					event.stopPropagation();
				}
			});
			return this;
		};
		proto.destroy = function () {
			this.destroyed = true;
			this._emit("destroy");
			delete this.actual_firetime_listeners;
			delete this.requested_firetime_listeners;
			delete this._transition;
			delete this._enabled;
			able.destroy_this_listenable(this);
		};
		proto.create_shadow = function () { return new ist.Event(); };
		proto.stringify = function () {
			return "";
		};
		proto.type = function () {
			return this._type;
		};
		proto.enable = function () {
			this._enabled = true;
		};
		proto.disable = function () {
			this._enabled = false;
		};
		proto.is_enabled = function () {
			return this._enabled;
		};
	}(ist.Event));
}(interstate));
