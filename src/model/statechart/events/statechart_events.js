(function(red) {
var cjs = red.cjs, _ = red._;

red.TransitionEvent = red._create_event_type("transition");

(function(my) {
	var proto = my.prototype;
	proto.on_create = function(targets, spec) {
		this.targets = targets;
		this.spec = spec;
		this.get_activation_listener = cjs.memoize(function(specified_target) {
			var listener = function(event) {
				red.event_queue.wait();
				this.fire(event);
				red.event_queue.signal();
			};
			return listener;
		});
		this.get_deactivation_listener = cjs.memoize(function(specified_target) {
			var listener = function(event) { };
			return listener;
		});

		this.live_fn = cjs.liven(function() {
			this.remove_listeners();
			this.spec = cjs.get(this.spec);
			var targs = cjs.get(this.targets);
			if(!_.isArray(targs)) {
				targs = [targs];
			}
			this.processed_targets = _	.chain(targs)
										.map(function(target_pointer) {
											if(target_pointer instanceof red.ContextualStatefulObj) {
												var statecharts = target_pointer.get_statecharts();
												return statecharts;
												/*
												var ptr = target_pointer.get_pointer();
												var dict = ptr.points_at();
												if(dict instanceof red.StatefulObj) {
													var manifestation_pointers = dict.get_manifestation_pointers(ptr);

													if(_.isArray(manifestation_pointers)) {
														var statecharts = _.map(manifestation_pointers, function(manifestation_pointer) {
															return dict.get_statechart_for_context(manifestation_pointer);
														});
														return statecharts;
													} else {
														return dict.get_statechart_for_context(ptr);
													}
												}
												*/
											}
											return false;
										})
										.flatten(true)
										.compact()
										.value();
			this.add_listeners();
		}, {
			context: this
		});
	};
	proto.destroy = function() {
		this.live_fn.destroy();
		this.remove_listeners();
		_.each(this.statecharts, function(statechart) {
			if(statechart) {
				statechart.off(this._spec, this.$on_change);
			}
		}, this);
	};
	proto.add_listeners = function() {
		_.each(this.processed_targets, function(target) {
			target.on_transition(this.spec, this.get_activation_listener(target), this.get_deactivation_listener(target), this);
		}, this);
	};
	proto.remove_listeners = function() {
		_.each(this.processed_targets, function(target) {
			target.off_transition(this.spec, this.get_activation_listener(target), this.get_deactivation_listener(target), this);
		}, this);
	};
	proto.stringify = function() { return "" + this.statecharts[0].id() + ":" + this._spec + ""; };
	red.register_serializable_type("transition_event",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var args = _.toArray(arguments);
										return {
											targets: red.serialize.apply(red, ([this.targets]).concat(args)),
											spec: this.spec
										};
									},
									function(obj) {
										var rest_args = _.rest(arguments);
										return new my(red.deserialize.apply(red, ([obj.targets]).concat(rest_args)), obj.spec);
									});
}(red.TransitionEvent));

red.StatechartEvent = red._create_event_type("statechart");

(function(my) {
	var proto = my.prototype;
	proto.on_create = function(options) {
		this.options = options;
		this.$on_spec = _.bind(function() {
			red.event_queue.wait();
			this.fire.apply(this, arguments);
			red.event_queue.signal();
		}, this);

		this.specified_target = options.target;
		this.spec = options.spec;
		if(_.isString(this.specified_target)) {
			// will figure out when our transition is set
		} else {
			this.set_target(this.specified_target);
		}
	};
	proto.set_transition = function(transition) {
		my.superclass.set_transition.apply(this, arguments);
		if(_.isString(this.specified_target)) {
			if(this.specified_target === "parent") {
				var transition = this.get_transition();
				if(transition) {
					var from = transition.from();
					this.set_target(from.parent());
				}
			} else if(this.specified_target === "me") {
				var transition = this.get_transition();
				if(transition) {
					var from = transition.from();
					this.set_target(from);
				}
			} else {
				console.error("Unknown target " + this.specified_target);
			}
		}
	};
	proto.set_target = function(target) {
		this.target = target;
		if(this.options.inert !== true) {
			this.target.on(this.spec, this.$on_spec);
		}
	};
	proto.destroy = function() {
		target.off(spec, this.$on_spec);
	};
	proto.create_shadow = function(parent_statechart, context) {
		return red.create_event("statechart", {
				target: parent_statechart,
				spec: this.spec,
				inert: this.options.inert_shadows,
				inert_shadows: this.options.inert_shadows
			});
	};
	proto.stringify = function() { return "" + this.target.id() + ":" + this.spec + ""; };

	red.register_serializable_type("statechart_event",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var target_summarized;
										if(_.isString(this.specified_target)) {
											target_summarized = this.specified_target;
										} else {
											target_summarized = this.specified_target.summarize();
										}

										return {
											specified_target: target_summarized,
											spec: this.spec
										};
									},
									function(obj) {
										var target;
										if(_.isString(obj.specified_target)) {
											target = obj.specified_target;
										} else {
											target = red.State.desummarize(obj.specified_target);
										}
										var spec = obj.spec;
										return new my({
											target: target,
											spec: spec
										});
									});
}(red.StatechartEvent));

}(red));
