/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.StartState = function (options) {
		options = options || {};

		ist.StartState.superclass.constructor.apply(this, arguments);

		if(options.avoid_constructor) { return; }

		this.outgoingTransition = options.outgoing_transition;

		this._constructed = true;

		//this.outgoingTransition = false;
		//if(ist.__debug_statecharts) {
			//this.$running = cjs(this._running);
		//}

		//var basis = this.basis();
		//this._transition_to_self = cjs(this.outgoingTransition && (this.outgoingTransition.to() === this));

		//if(options.outgoing_transition) {
		//}
		//var to;

		//if(!basis && !this.is_puppet()) {
		/*
			// If we have a basis, then whatever function shadowed us will create our outgoing transition too
			if (options.to) {
				to = options.to;
				this._transition_to_self.set(false);
			} else {
				to = this;
				this._transition_to_self.set(true);
			}

			debugger;
			*/
			//this.outgoingTransition = options.outgoing_transition;
			/*
			|| new ist.StatechartTransition({
				from: this,
				to: to,
				event: new ist.StatechartEvent({
					target: "me",
					spec: "run"
				})
			});

			to._add_direct_incoming_transition(this.outgoingTransition);
			*/
		//} else if(this.is_puppet()) {
			//this.outgoingTransition = options.outgoing_transition;
			//this._transition_to_self.set(this.outgoingTransition.to() === this);
		//}
	};
	(function (My) {
		_.proto_extend(My, ist.State);
		var proto = My.prototype;
		proto.initialize = function () {
			if(!this.outgoingTransition) {
				this.outgoingTransition = new ist.StatechartTransition({
					from: this,
					to: this,
					event: new ist.StatechartEvent({
						target: "me",
						spec: "run"
					})
				});
				//throw new Error("Outgoing transition not set");
			}

			My.superclass.initialize.apply(this, arguments);
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

			if(this.outgoingTransition && (this.outgoingTransition.to() === this)) {
				return [this.outgoingTransition];
			} else {
				return [];
			}
			/*
			if (this._transition_to_self.get() && this.outgoingTransition) {
				return [this.outgoingTransition];
			} else {
				return [];
			}
			*/
		};
		proto._add_direct_incoming_transition = function (transition) {
			if (transition !== this.outgoingTransition) {
				throw new Error("Should never have a transition other than outgoing transition");
			}
			//this._transition_to_self.set(true);
		};
		proto._remove_direct_incoming_transition = function (transition) {
			if (transition !== this.outgoingTransition) {
				throw new Error("Should never have a transition other than outgoing transition");
			}
			//this._transition_to_self.set(false);
		};
		proto._add_direct_outgoing_transition = function (transition) {
			if (this.outgoingTransition) { // I already have an outgoing transition
				throw new Error("Should never have a transition other than outgoing transition");
			}
			//this._transition_to_self.set(transition.to() === this);
			this.outgoingTransition = transition;
		};
		proto._remove_direct_outgoing_transition = function (transition) {
			throw new Error("Should never remove outgoing transition from start state");
		};
		proto.is_running = function () {
			return this._running;
		};
		/*
		proto.run = function () {
			if(this.is_puppet()) {
				this._running = true;
				this._emit("run", {
					target: this,
					type: "run"
				});
				if(ist.__debug_statecharts) {
					this.$running.set(true);
				}
			} else if (!this.is_running()) {
				this._running = true;
				this.enable_outgoing_transitions();
				this._emit("run", {
					target: this,
					type: "run"
				});
				if(ist.__debug_statecharts) {
					this.$running.set(true);
				}
			}
			return this;
		};
		proto.stop = function () {
			if(this.is_puppet()) {
				this._running = false;
				this._emit("stop", {
					type: "stop",
					target: this
				});
				if(ist.__debug_statecharts) {
					return this.$running.set(false);
				}
			} else if(this.is_running()) {
				this._running = false;
				this.disable_outgoing_transitions();
				this._emit("stop", {
					type: "stop",
					target: this
				});
				if(ist.__debug_statecharts) {
					return this.$running.set(false);
				}
			}
			return this;
		};
		*/
		proto.destroy = function (silent) {
			this._emit("destroy", {
				type: "destroy",
				target: this
			});

			cjs.wait();
			if(this.outgoingTransition) {
				this.outgoingTransition.destroy(silent);
				delete this.outgoingTransition;
			}
			//this._transition_to_self.destroy(silent);
			//delete this._transition_to_self;
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
		proto.set_outgoing_transition = function (transition) {
			this.outgoingTransition = transition;
		};

		proto.create_shadow = function (options, defer_initialization) {
			var rv = new ist.StartState(_.extend({
				basis: this
			}, options), defer_initialization);

			return rv;
		};

		ist.register_serializable_type("start_state",
			function (x) {
				return x instanceof My;
			},
			function (include_id) {
				var args = _.toArray(arguments);
				var rv = {
					outgoing_transition: ist.serialize.apply(ist, ([this.get_outgoing_transition()]).concat(args)),
					parent: ist.serialize.apply(ist, ([this.parent()]).concat(args))
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
					rv = ist.find_uid(obj.id);
					if (rv) {
						return rv;
					}
				}
				rv = new My({
					avoid_constructor: true
				});
				rv.initialize = function () {
					delete this.initialize;
				/*
					var options = {
					};
					this.do_initialize(options);
					*/
					My.call(this, {
						id: obj.id,
						outgoing_transition: ist.deserialize.apply(ist, ([obj.outgoing_transition]).concat(rest_args)),
						parent: ist.deserialize.apply(ist, ([obj.parent]).concat(rest_args))
					});
				};

				return rv;
			});
	}(ist.StartState));
}(interstate));
