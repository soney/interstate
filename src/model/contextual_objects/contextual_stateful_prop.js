/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var NO_VAL = {};

	red.ContextualStatefulProp = function (options) {
		red.ContextualStatefulProp.superclass.constructor.apply(this, arguments);
		this.transition_times_run = {};
		this._last_value = NO_VAL;

	/*
		var values = this.get_values();
		var len = values.length;
		var info;
		this._last_value = undefined;
		this._from_state = undefined;

		var using_val, using_state;
		for (var i = 0; i<len; i += 1){
			info = values[i];
			var state = info.state,
				val = info.value;
			if (state instanceof red.StatechartTransition) {
				this.set_transition_times_run(state, state.get_times_run());
			}
		}
		*/

		this.$active_value = new cjs.Constraint(this.active_value_getter, { context: this });

		this.$value.onChange(this.$value.update, this.$value);
		/*
		_.bind(function () {
			//if (red.event_queue.end_queue_round === 3 || red.event_queue.end_queue_round === 4) {
				this.$value.update();
			//}
		}, this));
		*/
		//_.defer(_.bind(this.$value.update, this.$value));
		//this.$value.update();
		_.defer(_.bind(function() {
			if(this.$value) {
				this.$value.update();
			}
		}, this));

		this._type = "stateful_prop";
	};

	(function (My) {
		_.proto_extend(My, red.ContextualObject);
		var proto = My.prototype;

		proto.get_parent = function () {
			var context = this.get_pointer();
			var popped_item, last;

			while (!context.is_empty()) {
				last = context.points_at();
				if (last instanceof red.StatefulObj) {
					var contextual_object = red.find_or_put_contextual_obj(last, context);
					return contextual_object;
				}
				popped_item = last;
				context = context.pop();
			}
			return undefined;
		};

		proto.get_states = function () {
			var parent = this.get_parent();
			var stateful_prop = this.get_object();
			var statecharts;
			if (stateful_prop.get_can_inherit()) {
				statecharts = parent.get_statecharts();
			} else {
				var sc_parent = stateful_prop.get_statechart_parent();
				if (sc_parent === "parent") {
					sc_parent = parent.get_object();
				}
				statecharts = [parent.get_statechart_for_proto(sc_parent)];
			}
			var substates = _.chain(statecharts)
				.map(function (sc) {
					var flat_substates = sc.flatten_substates(true);
					var substates = flat_substates.splice(0, flat_substates.length-1);
					return substates;
				})
				.flatten(true)
				.map(function (state) {
					var incoming_transitions = state.get_incoming_transitions();
					incoming_transitions = _.filter(incoming_transitions, function(trans) {
						return trans.from() instanceof red.Statechart;
					});
					return ([state]).concat(incoming_transitions);
				})
				.flatten(true)
				.value();

			return substates; // includes transitions
		};

		proto.get_values = function () {
			var parent = this.get_parent();
			var stateful_prop = this.get_object();
			var statecharts, entries, name, i, values;

			if (stateful_prop.get_can_inherit()) {
				var pointer = this.get_pointer();

				var stateful_obj = parent.get_object();
				var stateful_obj_context = pointer.slice(0, pointer.lastIndexOf(stateful_obj) + 1);

				var my_names = [];
				i = pointer.lastIndexOf(stateful_obj);
				var len = pointer.length();
				var item_im1 = pointer.points_at(i),
					item_i;

				i += 1;
				while (i < len) {
					item_i = pointer.points_at(i);
					name = red.Dict.get_prop_name(item_im1, item_i, pointer.slice(0, i));
					my_names.push(name);
					item_im1 = item_i;
					i += 1;
				}

				var stateful_obj_context_len = stateful_obj_context.length();
				var my_names_len = my_names.length;
				var protos_and_me = ([stateful_obj]).concat(red.Dict.get_proto_vals(stateful_obj, stateful_obj_context));

				var inherits_from = _	.chain(protos_and_me)
										.map(function (x) {
											var i;
											var obj;
											var cdict = red.find_or_put_contextual_obj(x, pointer.slice(0, stateful_obj_context_len));
											for (i = 0; i < my_names_len; i += 1) {
												name = my_names[i];
												if(!name) {
													return false; // bandaid for removed properties
												}
												if (cdict.has(name)) {
													var info = cdict.prop_info(name);
													obj = info.value;
													if (i < my_names_len - 1) {
														if (!(obj instanceof red.Dict)) {
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

				entries = [];
				var ifrom;
				var inherits_from_len = inherits_from.length;
				var dv_entries_map_fn = function (x) {
					return {
						key: x.key,
						value: x.value,
						inherited: i > 0
					};
				};
				for (i = 0; i < inherits_from_len; i += 1) {
					ifrom = inherits_from[i];
					if (ifrom instanceof red.StatefulProp) {
						var dvs = ifrom.get_direct_values();
						var dv_entries = dvs.entries();
						dv_entries = _.map(dv_entries, dv_entries_map_fn);
						entries.push.apply(entries, dv_entries);
					} else if (ifrom instanceof red.Cell) {
						entries.push({
							key: undefined,
							value: ifrom,
							inherited: true
						});
					}
				}

				statecharts = parent.get_statecharts();
			} else {
				values = stateful_prop.get_direct_values();
				entries = values.entries();

				var sc_parent = stateful_prop.get_statechart_parent();
				if (sc_parent === "parent") {
					sc_parent = parent.get_object();
				}
				statecharts = [parent.get_statechart_for_proto(sc_parent)];
			}

			var statecharts_len = statecharts.length;
			var rv = _.map(entries, function (entry) {
				var key = entry.key;
				var state, i;
				if (key) {
					for (i = 0; i < statecharts_len; i += 1) {
						var statechart = statecharts[i];
						if (key.root() === statechart.basis()) {
							if (key instanceof red.State) {
								try {
									state = red.find_equivalent_state(key, statechart);
								} catch(e) {
									continue;
								}
							} else if (key instanceof red.StatechartTransition) {
								try {
									state = red.find_equivalent_transition(key, statechart);
								} catch(e) {
									continue;
								}
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

		proto.get_transition_times_run = function (transition) {
			var transition_id = transition.id();
			return this.transition_times_run[transition_id] || 0;
		};
		proto.set_transition_times_run = function (transition, tr) {
			var transition_id = transition.id();
			this.transition_times_run[transition_id] = tr;
		};

		
		proto.active_value_getter = function () {
			var stateful_prop = this.get_object();
			var values = this.get_values();
			var len = values.length;
			var info, i, tr, state, val;

			var using_val = NO_VAL, using_state, fallback_value = NO_VAL, fallback_state;
			/*
			var invalidate_value = _.bind(function () {
				this.$value.invalidate();
			}, this);
			*/
			var needs_invalidation = false;
			for (i = 0; i < len; i += 1) {
				info = values[i];
				state = info.state;
				val = info.value;
				if(state instanceof red.StartState) {
					if (using_val === NO_VAL && state.is_active()) {
						using_val = val;
						using_state = state;
					} else {
						var transition = state.get_outgoing_transition();
						tr = transition.get_times_run();

						if (tr > this.get_transition_times_run(transition)) {
							this.set_transition_times_run(transition, tr);

							if (using_val === NO_VAL) {
								using_val = val;
								using_state = state;
								needs_invalidation = true;
							}
						}
					}
				} else if (state instanceof red.State) {
					if (state.is_active() && (using_val === NO_VAL || using_state.order(state) < 0)) {
						using_val = val;
						using_state = state;
					}
				} else if (state instanceof red.StatechartTransition) {
					tr = state.get_times_run();

					if (tr > this.get_transition_times_run(state)) {
						this.set_transition_times_run(state, tr);

						if (!(using_state instanceof red.StatechartTransition)) {
							using_val = val;
							using_state = state;
						}
					}
				}
			}
			if (using_val === NO_VAL) {
				if (this._last_value === NO_VAL) {
					if (fallback_value === NO_VAL) {
						using_val = undefined;
						using_state = undefined;
					} else {
						using_val = this._last_value = fallback_value;
						using_state = this._from_state = fallback_state;
					}
				} else {
					//using_val = this._last_value;
					using_state = this._from_state;
					using_val = undefined;
					for(i = 0; i<len; i++) {
						info = values[i];
						state = info.state;
						val = info.value;
						if(state === using_state) {
							using_val = val;
							break;
						}
					}
				}
			} else {
				this._last_value = using_val;
				this._from_state = using_state;
			}
			/*
			if(needs_invalidation) {
				_.defer(invalidate_value);
			}
			*/

			return {
				value: using_val,
				state: using_state
			};
		};

		proto.active_value = function() {
			return this.$active_value.get();
		};

		proto._getter = function () {
			var active_value_info = this.active_value();
			var using_val = active_value_info.value;
			var using_state = active_value_info.state;
			var rv;


			var stateful_prop = this.get_object();

			if (using_state instanceof red.StatechartTransition) {
				if(red.event_queue.end_queue_round === false) {
					return this._last_rv;
				}
			}

			//if (using_val instanceof red.Cell) {
			if(using_val) {
				var pointer = this.get_pointer();
				var event = using_state._last_run_event.get();

				var eventized_pointer = pointer.push(using_val, new red.EventContext(event));
		
			//	try {
					rv = using_val.get_value(eventized_pointer);
			//	} catch (e1) {
			//		console.error(e1);
			//	}

				this._last_rv = rv;
				return rv;
			} else {
				return undefined;
			}
				/*
			} else {
				try {
					rv = using_val instanceof red.ContextualObject ? using_val.val() : using_val;
				} catch (e2) {
					console.error(e2);
				}
				this._last_rv = rv;
				return rv;
			}
			*/
		};

		proto.destroy = function () {
			if(this.constructor === My) { this.emit_begin_destroy(); }
			this.$value.offChange(this.$value.update, this.$value);
			this.$active_value.destroy(true);
			delete this.$active_value;
			My.superclass.destroy.apply(this, arguments);
		};
	}(red.ContextualStatefulProp));
}(red));
