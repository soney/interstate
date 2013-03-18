(function(red) {
var cjs = red.cjs, _ = red._;

red.ContextualStatefulProp = function(options) {
	red.ContextualStatefulProp.superclass.constructor.apply(this, arguments);
	this.transition_times_run = {};
	this.used_start_transition = false;

	var values = this.get_values();
	var len = values.length;
	var info;
	this._last_value = undefined;
	this._from_state = undefined;

	var using_val, using_state;
	for(var i = 0; i<len; i++){
		info = values[i];
		var state = info.state,
			val = info.value;
		if(state instanceof red.StatechartTransition) {
			this.set_transition_times_run(state.get_times_run());
		}
	}

	this.$value.onChange(_.bind(function() {
		if(red.event_queue.end_queue_round === 3 || red.event_queue_round === 4) {
			this.$value.update();
		}
	}, this));

	_.defer(_.bind(function() {
		this.$value.update();
	}, this));
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;

	proto.get_parent = function() {
		var context = this.get_pointer();
		var popped_item, last;

		while(!context.is_empty()) {
			last = context.points_at();
			if(last instanceof red.StatefulObj) {
				var contextual_object = red.find_or_put_contextual_obj(last, context);
				return contextual_object;
			}
			popped_item = last;
			context = context.pop();
		}
		return undefined;
	};

	proto.get_all_protos = function() {
		var parent = this.get_parent();
		var parent_protos = parent.get_all_protos();
		return [];
	};

	proto._get_direct_values = function() {
		var parent = this.get_parent();
		var statechart = parent.get_own_statechart();
		var stateful_prop = this.get_object();
		var direct_values = stateful_prop.get_direct_values();

		var entries = direct_values.entries();
		var rv = _.map(entries, function(entry) {
			var state = red.find_equivalent_state(entry.key, statechart);
			return {
				state: state,
				value: entry.value
			};
		});
		return rv;
	};

	proto.get_values = function() {
		var direct_values = this._get_direct_values();
		var rv = direct_values;

		return rv;
	};

	proto.get_transition_times_run = function(transition) {
		var transition_id = transition.id();
		return this.transition_times_run[transition_id];
	};
	proto.set_transition_times_run = function(transition, tr) {
		var transition_id = transition.id();
		this.transition_times_run[transition_id] = tr;
	};

	proto._getter = function() {
		var values = this.get_values();
		var len = values.length;
		var info;

		var using_val, using_state;
		for(var i = 0; i<len; i++){
			info = values[i];
			var state = info.state,
				val = info.value;
			if(state instanceof red.State) {
				if(!using_val && state.is_active()) {
					using_val = val;
					using_state = state;
				}
			} else if(state instanceof red.StatechartTransition) {
				var tr = state.get_times_run() || 0;
				if(tr > this.get_transition_times_run(state)) {
					var pointer = this.get_pointer();
					this.set_transition_times_run(tr);
					var event = state._last_run_event
					var eventized_pointer = pointer.push(using_val, new red.EventContext(event));

					var rv = using_val.get_constraint_for_context(eventized_pointer);
					_.defer(_.bind(function() {
						this.$value.invalidate();
					}, this));
					this._last_value = rv;
					this._from_state = state;
					return this._last_value.get();
				}
			}
		}

		if(using_val) {
			if(using_val instanceof red.Cell) {
				var pointer = this.get_pointer();
				var event = state._last_run_event

				var eventized_pointer = pointer.push(using_val, new red.EventContext(event));

				var rv = using_val.get_constraint_for_context(eventized_pointer);
				this._last_value = rv;
				this._from_state = using_state;
				return this._last_value.get();
			} else {
				return using_val;
			}
		}
		return this._last_value.get();
	};

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.ContextualStatefulProp));

red.ContextualCell = function(options) {
	red.ContextualCell.superclass.constructor.apply(this, arguments);
	this.value_constraint = this.object.get_constraint_for_context(this.get_pointer());
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
		this.value_constraint.destroy();
	};
	proto._getter = function() {
		return this.value_constraint.get();
	};
}(red.ContextualCell));

}(red));
