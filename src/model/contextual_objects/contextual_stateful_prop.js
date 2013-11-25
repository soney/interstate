/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var NO_VAL = {};

	ist.ContextualStatefulProp = function (options) {
		ist.ContextualStatefulProp.superclass.constructor.apply(this, arguments);
		this._type = "stateful_prop";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;

		proto.initialize = function() {
			My.superclass.initialize.apply(this, arguments);
			this.transition_times_run = {};
			this._last_value = NO_VAL;

			this.$active_value = new cjs.Constraint(this.active_value_getter, { context: this });

			this._has_runtime_errors = false;
			this.$runtime_errors = new cjs.Constraint([]);

			this.$value.onChange(this.$value.get, this.$value);
		};

		proto.get_parent = function () {
			var context = this.get_pointer();
			var popped_item, last;

			while (!context.is_empty()) {
				last = context.points_at();
				if (last instanceof ist.StatefulObj) {
					var contextual_object = ist.find_or_put_contextual_obj(last, context);
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
						return trans.from() instanceof ist.Statechart;
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
					name = ist.Dict.get_prop_name(item_im1, item_i, pointer.slice(0, i));
					my_names.push(name);
					item_im1 = item_i;
					i += 1;
				}

				var stateful_obj_context_len = stateful_obj_context.length();
				var my_names_len = my_names.length;
				var protos_and_me = ([stateful_obj]).concat(ist.Dict.get_proto_vals(stateful_obj, stateful_obj_context));

				var inherits_from = _	.chain(protos_and_me)
										.map(function (x) {
											var i;
											var obj;
											var cdict = ist.find_or_put_contextual_obj(x, pointer.slice(0, stateful_obj_context_len));
											for (i = 0; i < my_names_len; i += 1) {
												name = my_names[i];
												if(!name) {
													return false; // bandaid for removed properties
												}
												if (cdict.has(name)) {
													var info = cdict.prop_info(name);
													obj = info.value;
													if (i < my_names_len - 1) {
														if (!(obj instanceof ist.Dict)) {
															return false;
														} else {
															cdict = ist.find_or_put_contextual_obj(obj, pointer.slice(0, stateful_obj_context_len + i + 1));
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
					if (ifrom instanceof ist.StatefulProp) {
						var dvs = ifrom.get_direct_values();
						var dv_entries = dvs.entries();
						dv_entries = _.map(dv_entries, dv_entries_map_fn);
						entries.push.apply(entries, dv_entries);
					} else if (ifrom instanceof ist.Cell) {
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
							if (key instanceof ist.State) {
								try {
									state = ist.find_equivalent_state(key, statechart);
								} catch(e) {
									continue;
								}
							} else if (key instanceof ist.StatechartTransition) {
								try {
									state = ist.find_equivalent_transition(key, statechart);
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
					value: entry.value,
					root_sv_index: i
				};
			});
			rv = _.compact(rv);

			var root_indicies = {};

			rv = rv.sort(function(a, b) {
				return a.root_sv_index - b.root_sv_index;
			});
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
		var USING_AS_TRANSITION = 'transition';//{};
		var USING_AS_STATE = 'state';// {};

		
		proto.active_value_getter = function () {
			var stateful_prop = this.get_object();
			var values = this.get_values();
			var len = values.length;
			var info, i, tr, state, val, is_start_state;
			var is_fallback = false;

			var using_val = NO_VAL, using_state, fallback_value = NO_VAL, fallback_state;
			var using_as;
			for (i = 0; i < len; i += 1) {
				info = values[i];
				state = info.state;
				val = info.value;

				if(state instanceof ist.StartState) { // Should actually use the transition and not the state
					
					if (state.is_active() && (using_val === NO_VAL || using_state.order(state) < 0)) {
						using_val = val;
						using_state = state;
						using_as = USING_AS_STATE;
					} else {
						var ot = state.get_outgoing_transition();
						if(ot) { // sometimes called before initialization
							tr = ot.get_times_run();

							if (tr > this.get_transition_times_run(ot)) {
								this.set_transition_times_run(ot, tr);

								using_val = val;
								using_state = state;
								using_as = USING_AS_TRANSITION;
							}
						}
					}
				} else if (state instanceof ist.State) {
					if (state.is_active() && (using_val === NO_VAL || using_state.order(state) < 0)) {
						using_val = val;
						using_state = state;
						using_as = USING_AS_STATE;
					}
				} else if (state instanceof ist.StatechartTransition) {
					tr = state.get_times_run();

					if (tr > this.get_transition_times_run(state)) {
						this.set_transition_times_run(state, tr);

						if (!(using_state instanceof ist.StatechartTransition)) {
							using_val = val;
							using_state = state;
							using_as = USING_AS_TRANSITION;
						}
					}
				}
			}
			if (using_val === NO_VAL) {
				if (this._last_value === NO_VAL) {
					using_val = using_state = using_as = undefined;
				} else {
					is_fallback = true;
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
					if(using_state instanceof ist.State) {
						using_as = USING_AS_STATE;
					} else if(using_state instanceof ist.StatechartTransition) {
						using_as = USING_AS_TRANSITION;
					}
				}
			} else {
				this._last_value = using_val;
				this._from_state = using_state;
				this._using_as = using_as;
			}

			return {
				value: using_val,
				state: using_state,
				using_as: using_as,
				is_fallback: is_fallback
			};
		};

		proto.active_value = function() {
			return this.$active_value.get();
		};

		proto._getter = function () {
			var last_last_value = this._last_value;

			var active_value_info = this.active_value();
			var using_val = active_value_info.value,
				using_state = active_value_info.state,
				using_as = active_value_info.using_as,
				is_fallback = active_value_info.is_fallback;
			var rv;
			if(using_as === USING_AS_TRANSITION) {
				if(is_fallback) {
					return this._last_rv;
				} else {
					active_value_info.is_fallback = true; // If the value isn't nullified, we just return the same object so mark it as being a fallback
					var invalidate_value = _.bind(function () {
						if(this.$value) {
							this.$value.invalidate();
						}
					}, this);
					var invalidate_active_value = _.bind(function () {
						if(this.$active_value) {
							this.$active_value.invalidate();
						}
					}, this);
					if(ist.event_queue.end_queue_round === 2) {
						ist.event_queue.once("end_event_queue_round_3", invalidate_value);
					} else if(ist.event_queue.end_queue_round === 6) {
						ist.event_queue.once("end_event_queue_round_7", invalidate_value);
					} else {
						_.defer(invalidate_active_value);
					}
					invalidate_value = invalidate_active_value = null;
				}
			}

			var stateful_prop = this.get_object();

			if(using_val) {
				var pointer = this.get_pointer();
				var event = cjs.get(using_state._last_run_event);

				var eventized_pointer = pointer.push(using_val, new ist.EventContext(event));
		
				if(ist.__debug) {
					rv = using_val.get_value(eventized_pointer);
				} else {
					try {
						rv = using_val.get_value(eventized_pointer);
						if(rv instanceof ist.Error) {
							rv = undefined;
						}
						if(this._has_runtime_errors) {
							this._has_runtime_errors = false;
							this.$runtime_errors.set([]);
						}
					} catch (e1) {
						rv = undefined;
						this.$runtime_errors.set([e1.message]);
						this._has_runtime_errors = true;
					}
				}

				this._last_rv = rv;
				return rv;
			} else {
				return undefined;
			}
		};

		proto.destroy = function () {
			if(this.constructor === My) { this.emit_begin_destroy(); }
			this.$value.offChange(this.$value.get, this.$value);
			this.$active_value.destroy(true);
			delete this.$active_value;
			My.superclass.destroy.apply(this, arguments);
		};
		proto.get_runtime_errors = function () {
			return this.$runtime_errors.get();
		};
	}(ist.ContextualStatefulProp));
}(interstate));
