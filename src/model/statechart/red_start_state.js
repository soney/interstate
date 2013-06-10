/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.StartState = function (options) {
		options = options || {};
		this.outgoingTransition = false;
		this._transition_to_self = cjs.$(undefined);
		red.StartState.superclass.constructor.apply(this, arguments);
		this._running = options.running === true;
	};
	(function (My) {
		_.proto_extend(My, red.State);
		var proto = My.prototype;
		proto.do_initialize = function (options) {
			My.superclass.do_initialize.apply(this, arguments);
			var basis = this.basis();
			var to;
			if(!basis && !this.is_puppet()) {
				// If we have a basis, then whatever function shadowed us will create our outgoing transition too
				if (options.to) {
					to = options.to;
					this._transition_to_self.set(false);
				} else {
					to = this;
					this._transition_to_self.set(true);
				}

				this.outgoingTransition = options.outgoing_transition || new red.StatechartTransition({
					from: this,
					to: to,
					event: red.create_event("statechart", {
						target: "me",
						spec: "run"
					})
				});

				to._add_direct_incoming_transition(this.outgoingTransition);
			} else if(this.is_puppet()) {
				this.outgoingTransition = options.outgoing_transition;
				this._transition_to_self.set(this.outgoingTransition.to() === this);
			}

			red.register_uid(this._id, this);
			this._initialized.set(true);
			this._emit("initialized");
		};
		proto.setTo = function (toNode) {
			var transition = this.outgoingTransition;
			var parent = this.parent();
			if (toNode.is_child_of(parent)) {
				transition.setTo(toNode);
			}
		};
		proto.set_parent = function (parent) {
			//this.outgoingTransition.event().set_statecharts(parent);
			return My.superclass.set_parent.apply(this, arguments);
		};
		proto.getTo = function () {
			var transition = this.outgoingTransition;
			return transition.to();
		};
		proto.get_substates = function () { return []; };
		proto.get_active_states = function () { return []; };
		proto.get_outgoing_transitions = function () {
			if (this.outgoingTransition) {
				return [this.outgoingTransition];
			} else {
				return [];
			}
		};
		proto.get_incoming_transitions = function () {
			if (this._transition_to_self.get() && this.outgoingTransition) {
				return [this.outgoingTransition];
			} else {
				return [];
			}
		};
		proto._add_direct_incoming_transition = function (transition) {
			if (transition !== this.outgoingTransition) {
				throw new Error("Should never have a transition other than outgoing transition");
			}
			this._transition_to_self.set(true);
		};
		proto._remove_direct_incoming_transition = function (transition) {
			if (transition !== this.outgoingTransition) {
				throw new Error("Should never have a transition other than outgoing transition");
			}
			this._transition_to_self.set(false);
		};
		proto._add_direct_outgoing_transition = function (transition) {
			if (this.outgoingTransition) { // I already have an outgoing transition
				throw new Error("Should never have a transition other than outgoing transition");
			}
			this._transition_to_self.set(transition.to() === this);
			this.outgoingTransition = transition;
		};
		proto._remove_direct_outgoing_transition = function (transition) {
			throw new Error("Should never remove outgoing transition from start state");
		};
		proto.is_running = function () {
			return this._running;
		};
		proto.run = function () {
			if (!this.is_running()) {
				this._running = true;
				this.enable_outgoing_transitions();
				this._emit("run", {
					target: this,
					type: "run"
				});
			}
			return this;
		};
		proto.stop = function () {
			if(this.is_running()) {
				this._running = false;
				this._emit("stop", {
					type: "stop",
					target: this
				});
			}
			return this;
		};
		proto.destroy = function () {
			this._emit("destroy", {
				type: "destroy",
				target: this
			});

			cjs.wait();
			if(this.outgoingTransition) {
				this.outgoingTransition.destroy();
			}
			this._transition_to_self.destroy();
			My.superclass.destroy.apply(this, arguments);
			cjs.signal();
		};

		proto.get_transitions_to = function (to) {
			if (this.getTo() === to) {
				return this.get_outgoing_transitions();
			} else {
				return [];
			}
		};
		proto.get_transitions_from = function (from) {
			if (from === this && this.getTo() === this) {
				return this.get_outgoing_transitions();
			} else {
				return [];
			}
		};
		proto.get_outgoing_transition = function () {
			return this.outgoingTransition;
		};

		proto.create_shadow = function (options, defer_initialization) {
			var rv = new red.StartState(_.extend({
				basis: this
			}, options), defer_initialization);

			return rv;
		};

		red.register_serializable_type("start_state",
			function (x) {
				return x instanceof My;
			},
			function (include_id) {
				var args = _.toArray(arguments);
				var rv = {
					outgoing_transition: red.serialize.apply(red, ([this.get_outgoing_transition()]).concat(args)),
					parent: red.serialize.apply(red, ([this.parent()]).concat(args))
				};
				if (include_id) {
					rv.id = this.id();
				}
				return rv;
			},
			function (obj) {
				var rest_args = _.rest(arguments);
				var rv;
				if (obj.id) {
					rv = red.find_uid(obj.id);
					if (rv) {
						return rv;
					}
				}
				rv = new My({id: obj.id}, true);
				rv.initialize = function () {
					var options = {
						outgoing_transition: red.deserialize.apply(red, ([obj.outgoing_transition]).concat(rest_args)),
						parent: red.deserialize.apply(red, ([obj.parent]).concat(rest_args))
					};
					this.do_initialize(options);
				};

				return rv;
			});
	}(red.StartState));
}(red));
