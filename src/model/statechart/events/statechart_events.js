/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.TransitionEvent = function () {
		ist.Event.apply(this, arguments);
		//this._initialize();
		this._type = "statechart_event";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (targets, spec) {
			this.targets = targets;
			this.spec = spec;
			this.get_activation_listener = cjs.memoize(function (specified_target) {
				var listener = function (event) {
					//ist.event_queue.wait();
					this.fire(event);
					//ist.event_queue.signal();
				};
				return listener;
			});
			this.get_deactivation_listener = cjs.memoize(function (specified_target) {
				var listener = function (event) { };
				return listener;
			});

			this.live_fn = cjs.liven(function () {
				this.remove_listeners();
				var old_spec;
				this.spec = cjs.get(this.spec);
				if(old_spec && old_spec.destroy) {
					old_spec.destroy();
				}
				var targs = cjs.get(this.targets);
				if (!_.isArray(targs)) {
					targs = [targs];
				}

				if(_.isString(this.spec)) {
					this.processed_targets = _.chain(targs)
						.map(function (target_pointer) {
							var statecharts;
							if (target_pointer instanceof ist.ContextualStatefulObj) {
								if (target_pointer.is_template()) {
									var instances = target_pointer.instances();
									statecharts = _.map(instances, function (instance) {
										var scs = instance.get_statecharts();
										return scs;
									});
									return _.flatten(statecharts, true);
								} else {
									statecharts = target_pointer.get_statecharts();
									return statecharts;
								}
							}
							return false;
						})
						.flatten(true)
						.compact()
						.value();
				} else {
					this.processed_targets = [];
				}
				if (this.is_enabled()) {
					this.add_listeners();
				}
			}, {
				context: this
			});
		};
		proto.destroy = function () {
			this.live_fn.destroy(true);
			delete this.live_fn;
			this.remove_listeners();
			if(this.spec && this.spec.destroy) {
				this.spec.destroy(true);
			}
			delete this.spec;
			if(this.targets && this.targets.destroy) {
				this.targets.destroy(true);
			}
			delete this.target;
			this.get_activation_listener.destroy(true);
			this.get_deactivation_listener.destroy(true);
			delete this.get_activation_listener;
			delete this.get_deactivation_listener;
			My.superclass.destroy.apply(this, arguments);
		};
		proto.add_listeners = function () {
			_.each(this.processed_targets, function (target) {
				target.on_transition(this.spec, this.get_activation_listener(target), this.get_deactivation_listener(target), this);
			}, this);
		};
		proto.remove_listeners = function () {
			_.each(this.processed_targets, function (target) {
				if(!target.destroyed) {
					target.off_transition(this.spec, this.get_activation_listener(target), this.get_deactivation_listener(target), this);
				}
			}, this);
		};
		proto.stringify = function () { return this.statecharts[0].id() + ":" + this._spec; };
		ist.register_serializable_type("transition_event",
			function (x) {
				return x instanceof My;
			},
			function () {
				var args = _.toArray(arguments);
				return {
					targets: ist.serialize.apply(ist, ([this.targets]).concat(args)),
					spec: this.spec
				};
			},
			function (obj) {
				var rest_args = _.rest(arguments);
				return new My(ist.deserialize.apply(ist, ([obj.targets]).concat(rest_args)), obj.spec);
			});
		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			this.add_listeners();
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
			this.remove_listeners();
		};
	}(ist.TransitionEvent));

	ist.StatechartEvent = function () {
		ist.Event.apply(this, arguments);
		//this._initialize();
		this._type = "statechart_event";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (options) {
			this._id = uid();
			ist.register_uid(this._id, this);

			this.options = options;

			this.specified_target = options.target;
			this.spec = options.spec;
			if (!_.isString(this.specified_target)) {
				this.set_target(this.specified_target);
			}
			// will figure out when our transition is set
		};
		proto.on_spec = function() {
			//ist.event_queue.wait();
			this.fire.apply(this, arguments);
			//ist.event_queue.signal();
		};

		proto.set_transition = function (transition) {
			var from;
			My.superclass.set_transition.apply(this, arguments);
			if (_.isString(this.specified_target)) {
				if (this.specified_target === "parent") {
					transition = this.get_transition();
					if (transition) {
						from = transition.from();
						this.set_target(from.parent());
					}
				} else if (this.specified_target === "me") {
					transition = this.get_transition();
					if (transition) {
						from = transition.from();
						this.set_target(from);
					}
				} else {
					console.error("Unknown target " + this.specified_target);
				}
			}
		};
		proto.id = function () { return this._id; };
		proto.set_target = function (target) {
			if (this.target) {
				this.target.off(this.spec, this.on_spec, this);
			}
			this.target = target;
			if (this.options.inert !== true && this.is_enabled()) {
				this.target.on(this.spec, this.on_spec, this);
			}
		};
		proto.destroy = function () {
			My.superclass.destroy.apply(this, arguments);
			ist.unregister_uid(this.id());
			if (this.target) {
				this.target.off(this.spec, this.on_spec, this);
				delete this.target;
			}
		};
		proto.create_shadow = function (parent_statechart, context) {
			return new My({
				target: this.specified_target,
				spec: this.spec,
				inert: this.options.inert_shadows,
				inert_shadows: this.options.inert_shadows
			});
		};

		proto.enable = function () {
			if(!this.is_enabled()) {
				My.superclass.enable.apply(this, arguments);
				if (this.options.inert !== true) {
					if (this.target) {
						this.target.on(this.spec, this.on_spec, this);
					}
				}
			}
		};

		proto.disable = function () {
			if(this.is_enabled()) {
				My.superclass.disable.apply(this, arguments);
				if (this.target) {
					this.target.off(this.spec, this.on_spec, this);
				}
			}
		};

		proto.stringify = function () { return /*this.target.id() +*/ ":"/* + this.spec*/; };

		ist.register_serializable_type("statechart_event",
			function (x) {
				return x instanceof My;
			},
			function () {
				var target_summarized;
				if (_.isString(this.specified_target)) {
					target_summarized = this.specified_target;
				} else {
					target_summarized = this.specified_target.summarize();
				}

				return {
					specified_target: target_summarized,
					spec: this.spec
				};
			},
			function (obj) {
				var target;
				if (_.isString(obj.specified_target)) {
					target = obj.specified_target;
				} else {
					target = ist.State.desummarize(obj.specified_target);
				}
				var spec = obj.spec;
				return new My({
					target: target,
					spec: spec
				});
			});
	}(ist.StatechartEvent));
}(interstate));
