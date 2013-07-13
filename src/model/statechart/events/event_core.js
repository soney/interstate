/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

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
	};
	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);

		proto.is_running = function () {
			return this.running_event_queue === false;
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
				for (i = 0; i < this.num_post_event_queue_rounds; i += 1) {
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
			var fire = red.Event.prototype._fire;
			while (this.queue.length > 0) {
				var event_info = this.queue.shift();
				fire.apply(event_info.context, event_info.args);
			}
		};
	}(EventQueue));

	red.event_queue = new EventQueue();

	red.Event = function () {
		able.make_this_listenable(this);
		this._initialize();
		this._transition = undefined;
		this._enabled = false;
		this.on_create.apply(this, arguments);
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);
		proto._initialize = function () {
			this.listeners = [];
			this.$fire_and_signal = _.bind(this.fire_and_signal, this);
		};
		proto.fire_and_signal = function () {
			this.fire.apply(this, arguments);
			red.event_queue.signal();
		};
		proto.on_create = function () {};
		proto.fire = function () {
			if (red.event_queue.is_ready()) {
				this._fire.apply(this, arguments);
			} else {
				red.event_queue.push(this, arguments);
			}
		};
		proto.on_fire = proto.add_listener = function (listener) { this.listeners.push(listener); };
		proto.off_fire = proto.remove_listener = function (listener) { this.listeners = _.without(listener); };
		proto.set_transition = function (transition) { this._transition = transition; };
		proto.get_transition = function () { return this._transition; };
		proto._fire = function () {
			var args = arguments;
			_.forEach(this.listeners, function (listener) {
				listener.apply(this, args);
			}, this);
		};
		proto.guard = proto.when = function (func) {
			var new_event = new red.Event();
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
		proto.destroy = function () {
			able.destroy_this_listenable(this);
			delete this.listeners;
			delete this._transition;
			delete this._enabled;
			delete this.$fire_and_signal;
		};
		proto.create_shadow = function () { return new red.Event(); };
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
	}(red.Event));

	var event_types = {};


	function construct(constructor, args) {
		function F() {
			return constructor.apply(this, args);
		}
		F.prototype = constructor.prototype;
		return new F();
	}
	red.create_event = function (event_type) {
		var Constructor = event_types[event_type];

		var rv = construct(Constructor, _.rest(arguments));
		rv._type = event_type;
		return rv;
	};
	red._create_event_type = function (name) {
		var Constructor = function () {
			red.Event.apply(this, arguments);
			this._initialize();
		};
		_.proto_extend(Constructor, red.Event);
		event_types[name] = Constructor;
		return Constructor;
	};
}(red));
