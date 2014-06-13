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

			var active_value_info = this.active_value();
			this.$value.onChange(this.$value.get, this.$value);
			// If we went back to set my value to the start transition's value,
			// then invalidate the active value so that it gets recomputed before
			// any transitions run
			if(active_value_info.is_fallback) {
				this.$active_value.invalidate();
			}
			if(ist.__garbage_collect) {
				this._live_cobj_child_updater = cjs.liven(function() {
					this.update_cobj_children();
				}, {
					context: this,
					pause_while_running: true
				});
			}
			if(this.constructor === My) { this.flag_as_initialized(); }
		};

		proto.get_parent = function () {
			var context = this.get_pointer(),
				contextual_object,
				popped_item, last;

			while (!context.is_empty()) {
				last = context.points_at();
				if (last instanceof ist.StatefulObj) {
					contextual_object = ist.find_or_put_contextual_obj(last, context);
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

		proto.get_raw_values = function (avoid_inherited) {
			var parent = this.get_parent();
			var stateful_prop = this.get_object();
			var statecharts, entries, name, i, values;

			if (stateful_prop.get_can_inherit() && avoid_inherited !== true) {
				var pointer = this.get_pointer();


				var my_names = [];
				i = pointer.lastIndexOf(parent.get_object());
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

				var my_names_len = my_names.length;
				var protos_and_me = ([parent]).concat(parent.get_all_protos(true));

				var inherits_from = _	.chain(protos_and_me)
										.map(function (cdict, proto_num) {
											var i;
											for (i = 0; i < my_names_len; i += 1) {
												name = my_names[i];

												if (cdict instanceof ist.ContextualDict && cdict.has(name)) { // ignore inherited
													cdict = cdict.prop(name);
												} else {
													return false;
												}
											}
											return cdict;
										}, this)
										.compact()
										.value();

				inherits_from = _.uniq([this].concat(inherits_from)); // when setting an already-set property, odd situations can come up
												// where 'this' wasn't included


				entries = [];
				var cifrom, ifrom;
				var inherits_from_len = inherits_from.length;
				var dv_entries_map_fn = function (x) {
					return {
						key: x.key,
						value: x.value
					};
				};
				for (i = 0; i < inherits_from_len; i += 1) {
					cifrom = inherits_from[i];
					if(cifrom instanceof ist.ContextualObject) {
						ifrom = cifrom.get_object();
						if (cifrom instanceof ist.ContextualStatefulProp) {
							var values = cifrom.get_raw_values(cifrom === this ? true : false);
							//var values = cifrom.get_raw_values(true);

							_.each(values, function(entry) {
								entry.inherited_from = cifrom;
							});

							entries.push.apply(entries, values);
						} else if (cifrom instanceof ist.ContextualCell) {
							entries.push({
								key: undefined,
								value: ifrom,
								inherited_from: cifrom
							});
						}
					}
				}
			} else {
				values = stateful_prop.get_direct_values();
				entries = values.entries();

				_.each(entries, function(entry) {
					entry.inherited_from = cifrom;
				});

				var sc_parent = stateful_prop.get_statechart_parent();
				if (sc_parent === "parent") {
					sc_parent = parent;
				}
			}
			return entries;
		};

		proto.get_values = function() {
			var raw_values = this.get_raw_values(),
				parent = this.get_parent(),
				stateful_prop = this.get_object(),
				statecharts = stateful_prop.get_can_inherit() ? parent.get_statecharts() : [parent.get_statechart_for_proto(parent.get_object())],
				statecharts_len = statecharts.length;


			var rv = _.map(raw_values, function (entry) {
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
					inherited_from: entry.inherited_from,
					root_sv_index: i
				};
			}, this);
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

			var using_val = NO_VAL, using_state, using_info, fallback_value = NO_VAL, fallback_state;
			var using_as;
			for (i = 0; i < len; i += 1) {
				info = values[i];
				state = info.state;
				val = info.value;

				if(state instanceof ist.StartState) { // Should actually use the transition and not the state
					if (state.is_active() && (using_val === NO_VAL || using_state.order(state) < 0)) {
						using_info = info;
						using_val = val;
						using_state = state;
						using_as = USING_AS_STATE;
					} else {
						var ot = state.get_outgoing_transition();
						if(ot) { // sometimes called before initialization
							tr = ot.get_times_run();

							if (tr > this.get_transition_times_run(ot)) {
								this.set_transition_times_run(ot, tr);

								using_info = info;
								using_val = val;
								using_state = state;
								using_as = USING_AS_TRANSITION;
							}
						}
					}
				} else if (state instanceof ist.State) {
					if (state.is_active() && (using_val === NO_VAL || using_state.order(state) < 0)) {
						using_info = info;
						using_val = val;
						using_state = state;
						using_as = USING_AS_STATE;
					}
				} else if (state instanceof ist.StatechartTransition) {
					tr = state.get_times_run();

					if (tr > this.get_transition_times_run(state)) {
						this.set_transition_times_run(state, tr);

						if (!(using_state instanceof ist.StatechartTransition)) {
							using_info = info;
							using_val = val;
							using_state = state;
							using_as = USING_AS_TRANSITION;
						}
					}
				}
			}
			if (using_val === NO_VAL) {
				if (this._last_value === NO_VAL) {
					using_info = using_val = using_state = using_as = undefined;
				} else {
					is_fallback = true;
					using_state = this._from_state;
					using_val = undefined;
					using_info = undefined;
					for(i = 0; i<len; i++) {
						info = values[i];
						state = info.state;
						val = info.value;
						if(state === using_state) {
							using_val = val;
							using_info = info;
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
				this._last_info = using_info;
				this._last_value = using_val;
				this._from_state = using_state;
				this._using_as = using_as;
			}


			return {
				value: using_val,
				state: using_state,
				info: using_info,
				using_as: using_as,
				is_fallback: is_fallback
			};
		};

		proto.active_value = function() {
			return this.$active_value.get();
		};

		proto._get_valid_cobj_children = function() {
			var my_pointer = this.get_pointer(),
				rv = _.map(this.get_values(), function(val) {
					var value = val.value;
					return {obj: value, pointer: my_pointer.push(value)};
				});
			return rv;
		};

		proto._getter = function () {
			var last_last_value = this._last_value,
				active_value_info = this.active_value();

			if(!active_value_info) { return; }

			var	using_info = active_value_info.info,
				using_val = active_value_info.value,
				using_state = active_value_info.state,
				using_as = active_value_info.using_as,
				using_inherited_from = active_value_info.inherited_from,
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
						invalidate_active_value();
					}
					//invalidate_value = invalidate_active_value = null;
				}
			}

			var stateful_prop = this.get_object();

			if(using_val) {
				var pointer = this.get_pointer(),
					eventized_pointer;
				if(using_state instanceof ist.StartState) {
					eventized_pointer = pointer.push(using_val);
				} else {
					eventized_pointer = pointer.push(using_val, new ist.StateContext(using_state));
				}

				var cobj = ist.find_or_put_contextual_obj(using_val, eventized_pointer, {
					inherited_from: using_info.inherited_from
				});
				
				//console.log(cobj, cobj.val());
		
				if(ist.__debug) {
					//rv = using_val.get_value(eventized_pointer);
					rv = cobj.val();
				} else {
					try {
						rv = cobj.val();
						//rv = using_val.get_value(eventized_pointer);
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
			if(this.constructor === My) { this.begin_destroy(true); }

			this.$value.offChange(this.$value.get, this.$value);
			this.$active_value.destroy(true);
			delete this.$active_value;
			My.superclass.destroy.apply(this, arguments);
		};
		proto.get_runtime_errors = function () {
			return this.$runtime_errors.get();
		};
		proto.pause  = function(recursive) {
			My.superclass.pause.apply(this, arguments);
			
			if(recursive) {
			}
		};
		proto.resume = function(recursive) {
			My.superclass.resume.apply(this, arguments);

			if(recursive) {
			}
		};
	}(ist.ContextualStatefulProp));
}(interstate));
