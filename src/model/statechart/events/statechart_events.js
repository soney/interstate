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
											if(target_pointer instanceof red.Pointer) {
												var dict = target_pointer.points_at();
												if(dict instanceof red.StatefulObj) {
													var manifestation_pointers = dict.get_manifestation_pointers(target_pointer);

													if(_.isArray(manifestation_pointers)) {
														var statecharts = _.map(manifestation_pointers, function(manifestation_pointer) {
															return dict.get_statechart_for_context(manifestation_pointer);
														});
														return statecharts;
													} else {
														return dict.get_statechart_for_context(target_pointer);
													}
												}
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
										return new my(red.deserialize(obj.targets), obj.spec);
									});
}(red.TransitionEvent));

red.StatechartEvent = red._create_event_type("statechart");

(function(my) {
	var proto = my.prototype;
	proto.on_create = function(options) {
		this.target = options.target;
		this.spec = options.spec;
		this.$on_spec = _.bind(function() {
			red.event_queue.wait();
			this.fire.apply(this, arguments);
			red.event_queue.signal();
		}, this);
		this.target.on(this.spec, this.$on_spec);
	};
	proto.destroy = function() {
		target.off(spec, this.$on_spec);
	};
	proto.create_shadow = function(parent_statechart, context) {
		return red.create_event("statechart", {
				target: parent_statechart,
				spec: this.spec
			});
	};
	proto.stringify = function() { return "" + this.target.id() + ":" + this.spec + ""; };

	red.register_serializable_type("statechart_event",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											target: this.target.summarize(),
											spec: this.spec
										};
									},
									function(obj) {
										var target = red.State.desummarize(obj.target);
										var spec = obj.spec;
										return new my({
											target: target,
											spec: spec
										});
									});
}(red.StatechartEvent));

}(red));
