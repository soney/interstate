(function(red) {
var cjs = red.cjs, _ = red._;

red.StatechartEvent = red._create_event_type("statechart");

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
	red.register_serializable_type("statechart_event",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											targets: red.serialize.apply(red, ([this.targets]).concat(arguments)),
											spec: this.spec
										};
									},
									function(obj) {
										return new my(red.deserialize(obj.targets), obj.spec);
									});
}(red.StatechartEvent));

}(red));
