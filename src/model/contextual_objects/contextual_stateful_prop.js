(function (red) {
var cjs = red.cjs, _ = red._;

red.ContextualStatefulProp = function(options) {
	red.ContextualStatefulProp.superclass.constructor.apply(this, arguments);
	this.transition_times_run = {};
	this.used_start_transition = false;

/*
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
			this.set_transition_times_run(state, state.get_times_run());
		}
	}
	*/

	this.$value.onChange(_.bind(function() {
		if(red.event_queue.end_queue_round === 3 || red.event_queue_round === 4) {
			this.$value.update();
		}
	}, this));

	this._type = "stateful_prop";
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

	proto.get_states = function() {
		var parent = this.get_parent();
		var stateful_prop = this.get_object();
		var statecharts;
		if(stateful_prop.get_can_inherit()) {
			statecharts = parent.get_statecharts();
		} else {
			var sc_parent = stateful_prop.get_statechart_parent();
			if(sc_parent === "parent") {
				sc_parent = parent.get_object();
			}
			statecharts = [parent.get_statechart_for_proto(sc_parent)];
		}
		var substates = _	.chain(statecharts)
							.map(function(sc) {
								return _.rest(sc.flatten_substates());
							})
							.flatten(true)
							.map(function(state) {
								return ([state]).concat(state.get_incoming_transitions());
							})
							.flatten(true)
							.value();

		return substates; // includes transitions
	};

	proto.get_values = function() {
		var parent = this.get_parent();
		var stateful_prop = this.get_object();
		var statecharts;
		var entries;


		if(stateful_prop.get_can_inherit()) {
			var pointer = this.get_pointer();

			var stateful_obj = parent.get_object();
			var stateful_obj_context = pointer.slice(0, pointer.lastIndexOf(stateful_obj) + 1);

			var my_names = [];
			var i = pointer.lastIndexOf(stateful_obj);
			var len = pointer.length();
			var item_im1 = pointer.points_at(i),
				item_i;

			i++;
			while(i<len) {
				item_i = pointer.points_at(i);
				var name = red.Dict.get_prop_name(item_im1, item_i, pointer.slice(0, i));
				my_names.push(name);
				item_im1 = item_i;
				i++;
			}

			var stateful_obj_context_len = stateful_obj_context.length();
			var my_names_len = my_names.length;
			var protos_and_me = ([stateful_obj]).concat(red.Dict.get_proto_vals(stateful_obj, stateful_obj_context))

			var name;
			var inherits_from = _	.chain(protos_and_me)
									.map(function(x) {
										var obj;
										var cdict = red.find_or_put_contextual_obj(x, pointer.slice(0, stateful_obj_context_len));
										for(var i = 0; i<my_names_len; i++) {
											name = my_names[i];
											if(cdict.has(name)) {
												var info = cdict.prop_info(name);
												obj = info.value;
												if(i < my_names_len - 1) {
													if(!(obj instanceof red.Dict)) {
														return false;
													} else {
														cdict = red.find_or_put_contextual_obj(obj, pointer.slice(0, stateful_obj_context_len + i + 1));
													}
												}
											} else {
												return false;
											}
										}
										return obj;
									})
									.compact()
									.uniq()
									.value();

			var values;
			var entries = [];
			var ifrom;
			var inherits_from_len = inherits_from.length;
			for(var i = 0; i<inherits_from_len; i++) {
				ifrom = inherits_from[i];
				if(ifrom instanceof red.StatefulProp) {
					var dvs = ifrom.get_direct_values();
					var dv_entries = dvs.entries();
					dv_entries = _.map(dv_entries, function(x) {
						return {
							key: x.key,
							value: x.value,
							inherited: i>0
						};
					});
					entries.push.apply(entries, dv_entries);
				} else if(ifrom instanceof red.Cell) {
					entries.push({
						key: undefined,
						value: ifrom,
						inherited: true
					});
				}
			}

			statecharts = parent.get_statecharts();
		} else {
			var values = stateful_prop.get_direct_values();
			entries = values.entries();

			var sc_parent = stateful_prop.get_statechart_parent();
			if(sc_parent === "parent") {
				sc_parent = parent.get_object();
			}
			statecharts = [parent.get_statechart_for_proto(sc_parent)];
		}

		var statecharts_len = statecharts.length;
		var rv = _.map(entries, function(entry) {
			var key = entry.key;
			var state;
			if(key) {
				for(var i = 0; i<statecharts_len; i++) {
					var statechart = statecharts[i];
					if(key.root() === statechart.basis()) {
						if(key instanceof red.State) {
						/*
							try {
							*/
								state = red.find_equivalent_state(key, statechart);
								/*
							} catch(e) {
								continue;
							}
							*/
						} else if(key instanceof red.StatechartTransition) {
							//try {
								state = red.find_equivalent_transition(key, statechart);
								/*
							} catch(e) {
								continue;
							}
							*/
						}
						break;
					}
				}
			} else {
				state = undefined;
			}
			return {
				state: state,
				value: entry.value
			};
		});
		rv = _.compact(rv);
		return rv;
	};

	proto.get_transition_times_run = function(transition) {
		var transition_id = transition.id();
		return this.transition_times_run[transition_id] || 0;
	};
	proto.set_transition_times_run = function(transition, tr) {
		var transition_id = transition.id();
		this.transition_times_run[transition_id] = tr;
	};

	var NO_VAL = {};

	proto._getter = function() {
		var values = this.get_values();
		var len = values.length;
		var info;

		var using_val = NO_VAL, using_state;
		for(var i = 0; i<len; i++){
			info = values[i];
			var state = info.state,
				val = info.value;
			if(state instanceof red.State) {
				if(using_val === NO_VAL && state.is_active()) {
					using_val = val;
					using_state = state;
				}
			} else if(state instanceof red.StatechartTransition) {
				var tr = state.get_times_run();
				if(!this._used_start_transition && state.from() instanceof red.StartState) {
					using_val = val;
					using_state = state;
					console.log(val);
					_.defer(_.bind(function() {
						this.$value.invalidate();
					}, this));
				}

				if(tr > this.get_transition_times_run(state)) {
					this.set_transition_times_run(state, tr);

					if(using_val === NO_VAL) {
						var pointer = this.get_pointer();
						var event = state._last_run_event;
						var eventized_pointer = pointer.push(using_val, new red.EventContext(event));
						using_val = val;
						using_state = state;
					}
					//break;
					/*
				} else if(!this._used_start_transition && state.from() instanceof red.StartState) {
					using_val = val;
					using_state = state;
					/*
					_.defer(_.bind(function() {
						this.$value.invalidate();
					}, this));
					*/
				}
			}
		}

		this._used_start_transition = true;
		if(using_val === NO_VAL) {
			using_val = this._last_value;
			using_state = this._from_state;
		} else {
			this._last_value = using_val;
			this._from_state = using_state;
		}

		

		if(using_val instanceof red.Cell) {
			var pointer = this.get_pointer();
			var event = using_state._last_run_event.get();

			var eventized_pointer = pointer.push(using_val, new red.EventContext(event));

			var rv;

			try {
				rv = using_val.get_value(eventized_pointer);
			} catch(e) {
				console.error(e);
			}

			this._last_rv = rv;
			return rv;
		} else {
			var rv;
			try {
				rv = using_val instanceof red.ContextualObject ? using_val.val() : using_val;
			} catch(e) {
				console.error(e);
			}
			this._last_rv = rv;
			return rv;
		}
	};

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.ContextualStatefulProp));

}(red));
