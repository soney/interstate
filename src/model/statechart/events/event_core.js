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
			semaphore -= 1;
		};
		this.signal = function () {
			semaphore += 1;
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
			} else {
				if (this.deferred_req !== true) {
					this.deferred_req = true;
					var self = this;
					_.defer(function () {
						self.deferred_req = false;
						self.run_event_queue();
					});
				}
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

var id;
	ist.Event = function () {
		able.make_this_listenable(this);
		this._initialize();
		this._transition = undefined;
		this._enabled = false;
		this._id = id++;
		this.on_create.apply(this, arguments);
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);
		proto.id = function() {
			return this._id;
		};
		proto._initialize = function () {
			this.listeners = [];
		};
		proto.fire_and_signal = function () {
			this.fire.apply(this, arguments);
			ist.event_queue.signal();
		};
		proto.on_create = function () {};
		proto.on_ready = function() {};
		proto.fire = function () {
			if (ist.event_queue.is_ready()) {
				this._fire.apply(this, arguments);
			} else {
				ist.event_queue.push(this, arguments);
			}
		};
		proto.on_fire = proto.add_listener = function (callback, context) {
			var args = _.rest(arguments, 2);
			this.listeners.push({callback: callback, context: context, args: args});
		};
		proto.off_fire = proto.remove_listener = function (callback, context) {
			for(var i = 0; i<this.listeners.length; i++) {
				var listener = this.listeners[i];
				if(listener.callback === callback && (!context || listener.context === context)) {
					this.listeners.splice(i, 1);
					i--;
				}
			}
		};
		proto.set_transition = function (transition) { this._transition = transition; };
		proto.get_transition = function () { return this._transition; };
		proto._fire = function () {
			var args = _.toArray(arguments);
			_.forEach(this.listeners, function (listener) {
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
		proto.destroy = function () {
			this.destroyed = true;
			this._emit("destroy");
			delete this.listeners;
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
