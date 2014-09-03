/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualTransition = function (options) {
		ist.ContextualTransition.superclass.constructor.apply(this, arguments);

		if(options.avoid_constructor) { return; }

		this.$event = cjs(false);
		this.$enabled = cjs(false);
		this.$times_run = cjs(0);
		this.$from = new cjs.Constraint(options.from);
		this.$to = new cjs.Constraint(options.to);


		this.is_start_transition = options.from instanceof ist.StartState;
		this._times_run = options.times_run || (this.is_start_transition ? 1 : 0);
		this.$times_run = cjs(this._times_run);
		this._from_state = new cjs.Constraint(options.from);
		this._to_state = new cjs.Constraint(options.to);
		this.set_event(options.event);

		this._type = "transition";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function(options) {
			if(this.constructor === My) { this.flag_as_initialized();  }
			My.superclass.initialize.apply(this, arguments);
			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }
			My.superclass.destroy.apply(this, arguments);
		};

		proto.initialize = function (options) {
			if (this._event) {
				this._event.initialize();
			}
			this._initialized.set(true);
			this._emit("initialized");
		};
		proto.updateTo = function(event) {
			var state = event.state;
			var old_to = this.to();
			var new_to = ist.find_equivalent_state(state, old_to);
			this.setTo(new_to);
		};
		proto.updateFrom = function(event) {
			var state = event.state;
			var old_from = this.from();
			var new_from = ist.find_equivalent_state(state, old_from);
			this.setFrom(new_from);
		};
		proto.is_puppet = function () {
			return this._puppet;
		};
		proto.is_initialized = function () {
			return this._initialized.get();
		};
		proto.increment_times_run = function () {
			this.$times_run.set(++this._times_run);
		};
		proto.get_times_run = function () {
			return this.$times_run.get();
		};
		proto.context = function () {
			return this._context;
		};
		proto.original_context = function() {
			return this._original_context;
		};
		proto.set_context = function (context) {
			this._context = context.push_special_context(new ist.StateContext(this));
			this._original_context = context;
			return this;
		};
		proto.basis = function () { return this._basis; };
		proto.set_basis = function (basis) {
			if (this._basis) {
				this._basis.off("setTo", this.updateTo, this);
				this._basis.off("setFrom", this.updateFrom, this);
				this._basis.off("remove", this.remove, this);
				this._basis.off("destroy", this.destroy, this);
			}
			this._basis = basis;
			if (this._basis) {
				this._basis.on("setTo", this.updateTo, this);
				this._basis.on("setFrom", this.updateFrom, this);
				this._basis.on("remove", this.remove, this);
				this._basis.on("destroy", this.destroy, this);
			}
			return this;
		};
		proto.id =  function () { return this._id; };
		proto.sid = function() { return parseInt(uid.strip_prefix(this.id()), 10); };
		proto.hash = function () { return this._hash; };
		proto.from = function () { return this._from_state.get(); };
		proto.to = function () { return this._to_state.get(); };
		proto.setFrom = function (state) {
			var from = this.from();
			if (from) {
				from._remove_direct_outgoing_transition(this);
			}
			this._from_state.set(state);
			var do_set_from = function() {
				state._add_direct_outgoing_transition(this);
				if(state.is_active()) {
					this.enable();
				} else {
					this.disable();
				}
			};
			if(state.is_initialized()) {
				do_set_from.call(this);
			} else {
				state.once("initialized", do_set_from, this);
			}
			this._emit("setFrom", {type: "setFrom", target: this, state: state});
			return this;
		};
		proto.setTo = function (state) {
			var to = this.to();
			if (to) {
				to._remove_direct_incoming_transition(this);
			}
			this._to_state.set(state);
			var do_set_to = function() {
				state._add_direct_incoming_transition(this);
				if(this.is_start_transition) {
					var from = this.from();
					if(from.is_active() && from.is_running()) {
						ist.event_queue.wait();
						this.fire({});
						ist.event_queue.signal();
					}
				}
			};
			if(state.is_initialized()) {
				do_set_to.call(this);
			} else {
				state.once("initialized", do_set_to, this);
			}
			this._emit("setTo", {type: "setTo", target: this, state: state});
			return this;
		};
		proto.set_event = function (event) {
			if (this._event) {
				this._event.off_fire(this.fire, this);
				this._event.destroy();
			}
			this._event = event;
			if (this._event) {
				this._event.set_transition(this);
				this._event.on_fire(this.fire, this);
			}
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
		proto.destroy = function (silent) {
			this.destroyed = true;
			this._emit("destroy", {type: "destroy", target: this});
			cjs.wait();
			this._from_state.destroy(silent);
			delete this._from_state;

			this._to_state.destroy(silent);
			delete this._to_state;

			this.set_basis(undefined);
			
			this._event.off_fire(this.fire, this);
			this._event.destroy(silent);
			delete this._event;

			this._initialized.destroy(silent);
			delete this._initialized;

			this._last_run_event.destroy(silent);
			delete this._last_run_event;

			this.$times_run.destroy(silent);
			delete this.$times_run;

			delete this._context;

			if(ist.__debug_statecharts) {
				this.$enabled.destroy(silent);
				delete this.$enabled;
			}

			cjs.signal();
			able.destroy_this_listenable(this);
			ist.unregister_uid(this.id());
		};

		proto.fire = function (event) {
			if (this.is_puppet()) {
				this._emit("fire", {type: "fire", target: this});
			} else if (this.from().on_outgoing_transition_fire(this, event)) {
				this._emit("fire", {type: "fire", target: this});
			}
		};
		proto.create_shadow = function (from_state, to_state, parent_statechart, context, defer_initialization) {
			var my_event = this.event(),
				shadow_event = my_event.create_shadow(parent_statechart, context, from_state.is_running());
			var shadow_transition = new ist.StatechartTransition({
					from: from_state,
					to: to_state,
					event: shadow_event,
					basis: this,
					context: context
				}, defer_initialization);
			return shadow_transition;
		};
		proto.stringify = function () {
			var event = this.event();
			var stringified_event = event ? event.stringify() : "";
			return stringified_event.toString();
		};
		proto.remove = function () {
			var from = this.from();
			var to = this.to();
			this.disable();
			cjs.wait();
			from._remove_direct_outgoing_transition(this);
			to._remove_direct_incoming_transition(this);
			cjs.signal();
			this._emit("remove", {type: "remove", transition: this});
			return this;
		};
		proto.root = function () {
			return this.from().root();
		};

		proto.enable = function () {
			if(!this._enabled) {
				this._enabled = true;
				var event = this.event();
				event.enable();
				if(ist.__debug_statecharts) {
					this.$enabled.set(true);
				}
			}
		};

		proto.disable = function () {
			if(this._enabled) {
				this._enabled = false;
				var event = this.event();
				event.disable();
				if(ist.__debug_statecharts) {
					this.$enabled.set(false);
				}
			}
		};

		proto.is_enabled = function() {
			return this.$enabled.get();
		};
	}(ist.ContextualTransition));
}(interstate));
