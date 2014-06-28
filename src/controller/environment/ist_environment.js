/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.Environment = function (options) {
		// Undo stack
		this._command_stack = new ist.CommandStack();

		var root, root_pointer;
		if (options && _.has(options, "root")) {
			root = options.root;
		} else {
			root = ist.get_default_root(!options || options.builtins);
		}

		//Context tracking
		this.pointer = new ist.Pointer({stack: [root]});
		this.print_on_return = false;
	};

	(function (my) {
		var proto = my.prototype;

		proto.default_return_value = function () {
			if (this.print_on_return) {
				return this.print();
			} else {
				return this;
			}
		};

		proto.get_root_pointer = function () {
			return this.pointer.slice(0, 1);
		};
		proto.get_root = function () {
			return this.pointer.root();
		};
		proto.get_pointer_obj = function () {
			return this.pointer.points_at();
		};

		proto.get_current_statechart = function () {
			var statechart;
			var SOandC = ist.find_stateful_obj_and_context(this.pointer);
			var owner = SOandC.stateful_obj;
			statechart = owner.get_own_statechart();
			if (!statechart) {
				throw new Error("Could not find statechart");
			}
			return statechart;
		};

		proto.find_state = function (name) {
			var i, inherited_statecharts, isc;
			if (name instanceof ist.State || name instanceof ist.StatechartTransition) {
				return name.basis() || name;
			} else {
				var SOandC = ist.find_stateful_obj_and_context(this.pointer);
				var owner = SOandC.stateful_obj;
				var statechart = owner.get_own_statechart();

				var states = name.split(/->|-(\d+)>/);
				if (states.length > 1) { //transition
					var from_name = states[0].trim(),
						to_name = states[2].trim(),
						index = parseInt(states[1], 10) || 0;

					var transition = statechart.find_transitions(from_name, to_name, index);

					if (!transition) {
						var pointer = this.get_pointer_obj();
						inherited_statecharts = pointer.get_inherited_statecharts(this.pointer);
						for (i = 0; i < inherited_statecharts.length; i += 1) {
							isc = inherited_statecharts[i];
							transition = isc.find_transitions(from_name, to_name, index);
							if (transition) {
								break;
							}
						}
					}

					return transition.basis() || transition;
				} else {
					var state = statechart.find_state(name);

					if (!state) {
						var contextual_object = ist.find_or_put_contextual_obj(SOandC.stateful_obj, SOandC.context);
						var statecharts = contextual_object.get_statecharts();
						inherited_statecharts = statecharts.slice(1);
						for (i = 0; i < inherited_statecharts.length; i += 1) {
							isc = inherited_statecharts[i];
							state = isc.find_state(name);
							if (state) {
								break;
							}
						}
					}

					return state.basis() || state;
				}
			}
		};

		proto._do = function (command) {
			this._command_stack._do(command);
		};
		proto.undo = function () {
			this._command_stack._undo();
		};
		proto.redo = function () {
			this._command_stack._redo();
		};

		proto.cd = function (prop_name) {
			var dict = this.pointer.points_at(),
				pv = dict._get_direct_prop(prop_name);

			if (pv) {
				this.pointer = this.pointer.push(pv);
			}
			return this.default_return_value();
		};

		proto.top = function () {
			this.pointer = this.pointer.slice(0, 1);
			return this.default_return_value();
		};
		proto.up = function () {
			this.pointer = this.pointer.pop();
			return this.default_return_value();
		};
		proto.reset = function () {
			var parent_obj = this.get_pointer_obj(),
				cobj = ist.find_or_put_contextual_obj(parent_obj, this.pointer);

			if(cobj instanceof ist.ContextualStatefulObj) {
				cobj.reset();
			} else {
				throw new Error("Trying to reset non-stateful");
			}
			return this.default_return_value();
		};

		proto.set = function (prop_name, arg1, arg2, arg3) {
			var builtin_name, i, index, getter_name, val, value,
				commands = [],
				builtin_info = false,
				parent_obj = this.get_pointer_obj();

			if (prop_name[0] === "(" && prop_name[prop_name.length - 1] === ")") {
				builtin_name = prop_name.slice(1, prop_name.length - 1);

				var builtins = parent_obj.get_builtins();
				for (i in builtins) {
					if (builtins.hasOwnProperty(i)) {
						var builtin = builtins[i];
						var env_name = builtin._get_env_name();
						if (builtin_name === env_name) {
							builtin_info = builtin;
							break;
						}
					}
				}
			}
			if (arguments.length === 1) {
				if (parent_obj instanceof ist.StatefulObj) {
					value = "<stateful_prop>";
				} else {
					value = "<stateful>";
				}
			} else {
				value = _.last(arguments);
			}

			if (_.isString(value)) {
				if (value === "<dict>") {
					value = new ist.Dict({});
					var direct_protos = new ist.Cell({ ignore_inherited_in_first_dict: true/*str: "[]", ignore_inherited_in_contexts: [value]*/});
					value._set_direct_protos(direct_protos);
				} else if (value === "<stateful>") {
					value = new ist.StatefulObj(undefined, true);
					value.do_initialize({
						direct_protos: new ist.StatefulProp({ can_inherit: false, statechart_parent: value })
					});
					/*
					value.get_own_statechart().add_state("INIT")
						.starts_at("INIT");
					*/
				} else if (value === "<stateful_prop>") {
					value = new ist.StatefulProp();
				//} else {
					//value = new ist.Cell({str: value});
				}
			}

			if (arguments.length === 3 || (arguments.length === 4 && _.isNumber(arg3))) { // prop_name, state, value
				var state = this.find_state(arg1);
				index = arg3;

				if (value instanceof ist.StatefulProp) {
					throw new Error("Value is an instanceof a stateful prop");
				}

				if (builtin_info) {
					getter_name = builtin_info._get_getter_name();
					val = parent_obj[getter_name]();
					if (val) {
						if (val instanceof ist.StatefulProp) {
							var val_for_state = val._direct_value_for_state(state);
							if(val_for_state instanceof ist.Cell && _.isString(value)) {
								commands.push(new ist.ChangeCellCommand({
									cell: val_for_state,
									str: value
								}));
							} else {
								commands.push(new ist.SetStatefulPropValueCommand({
									stateful_prop: val,
									state: state,
									value: _.isString(value) ? new ist.Cell({str: value}) : value
								}));
							}
						} else {
							throw new Error("Trying to set value for non stateful prop");
						}
					} else {
						val = new ist.StatefulProp();
						commands.push(new ist.SetBuiltinCommand({
							parent: parent_obj,
							name: builtin_name,
							value: value
						}));
						commands.push(new ist.SetStatefulPropValueCommand({
							stateful_prop: val,
							state: state,
							value: value
						}));
					}
				} else {
					if (parent_obj._has_direct_prop(prop_name)) {
						val = parent_obj._get_direct_prop(prop_name);
						if (val instanceof ist.StatefulProp) {
							if (val._has_direct_value_for_state(state)) {
								var sp_val = val._direct_value_for_state(state);
								if (sp_val instanceof ist.Cell && _.isString(arg2)) {
									commands.push(new ist.ChangeCellCommand({
										cell: sp_val,
										str: value
									}));
								} else {
									commands.push(new ist.SetStatefulPropValueCommand({
										stateful_prop: val,
										state: state,
										value: _.isString(value) ? new ist.Cell({str: value}) : value
									}));
								}
							} else {
								commands.push(new ist.SetStatefulPropValueCommand({
									stateful_prop: val,
									state: state,
									value: _.isString(value) ? new ist.Cell({str: value}) : value
								}));
							}
						} else {
							val = new ist.StatefulProp();
							commands.push(new ist.SetPropCommand({
								parent: parent_obj,
								name: prop_name,
								value: val,
								index: index
							}));
							commands.push(new ist.SetStatefulPropValueCommand({
								stateful_prop: val,
								state: state,
								value: _.isString(value) ? new ist.Cell({str: value}) : value
							}));
						}
					} else {
						val = new ist.StatefulProp();
						commands.push(new ist.SetPropCommand({
							parent: parent_obj,
							name: prop_name,
							value: val,
							index: index
						}));
						commands.push(new ist.SetStatefulPropValueCommand({
							stateful_prop: val,
							state: state,
							value: _.isString(value) ? new ist.Cell({str: value}) : value
						}));
					}
				}
			} else if (arguments.length === 2 || (arguments.length === 3 && _.isNumber(arg2))) {
				index = arg2;

				parent_obj = this.get_pointer_obj();
				if (builtin_info) {
					getter_name = builtin_info._get_getter_name();
					val = parent_obj[getter_name]();
					if (val) {
						if (val instanceof ist.Cell && _.isString(arg1)) {
							commands.push(new ist.ChangeCellCommand({
								cell: val,
								str: arg1
							}));
						} else {
							commands.push(new ist.SetBuiltinCommand({
								parent: parent_obj,
								name: builtin_name,
								value: value
							}));
						}
					} else {
						commands.push(new ist.SetBuiltinCommand({
							parent: parent_obj,
							name: builtin_name,
							value: value
						}));
					}
				} else {
					if (parent_obj._has_direct_prop(prop_name)) {
						val = parent_obj._get_direct_prop(prop_name);
						if (val instanceof ist.Cell && _.isString(arg1)) {
							commands.push(new ist.ChangeCellCommand({
								cell: val,
								str: value
							}));
						} else {
							commands.push(new ist.SetPropCommand({
								parent: parent_obj,
								name: prop_name,
								value: _.isString(value) ? new ist.Cell({str: value}) : value,
								index: index
							}));
						}
					} else {
						commands.push(new ist.SetPropCommand({
							parent: parent_obj,
							name: prop_name,
							value: _.isString(value) ? new ist.Cell({str: value}) : value,
							index: index
						}));
					}
				}
			} else if (arguments.length === 1) {
				if (builtin_info) {
					getter_name = builtin_info._get_getter_name();
					commands.push(new ist.SetBuiltinCommand({
						parent: parent_obj,
						name: builtin_name,
						value: _.isString(value) ? new ist.Cell({str: value}) : value
					}));
				} else {
					commands.push(new ist.SetPropCommand({
						parent: parent_obj,
						name: prop_name,
						value: _.isString(value) ? new ist.Cell({str: value}) : value,
						index: index
					}));
				}
			}
			var command;
			if (commands.length === 1) {
				command = commands[0];
			} else {
				command = new ist.CombinedCommand({
					commands: commands
				});
			}
			this._do(command);
			
			return this.default_return_value();
		};
		proto._get_unset_prop_command = function (prop_name) {
			var parent_obj = this.get_pointer_obj();
			if (!_.isString(prop_name)) {
				console.error("No name given");
				return;
			}
			var command = new ist.UnsetPropCommand({
				parent: parent_obj,
				name: prop_name
			});
			return command;
		};
		proto.unset = function () {
			var command = this._get_unset_prop_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};

		proto.inherit = function(prop_name) {
			var parent_obj = this.get_pointer_obj();
			var ptr = this.pointer;
			var obj = ptr.points_at();
			var cobj = ist.find_or_put_contextual_obj(obj, ptr);
			cobj = cobj.prop(prop_name);
			var command = new ist.InheritPropCommand({
				cobj: cobj,
				//parent: cobj,
				name: prop_name
			});
			this._do(command);
			return this.default_return_value();
		};

		proto._get_rename_prop_command = function (from_name, to_name) {
			var parent_obj = this.get_pointer_obj();
			var command = new ist.RenamePropCommand({
				parent: parent_obj,
				from: from_name,
				to: to_name
			});
			return command;
		};
		proto.rename = function () {
			var command = this._get_rename_prop_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};
		proto.set_copies = function (val) {
			var parent_obj = this.get_pointer_obj();
			var command = new ist.SetCopiesCommand({
				parent: parent_obj,
				value: val
			});
			this._do(command);
			return this.default_return_value();
		};
		proto._get_move_prop_command = function (prop_name, index) {
			var parent_obj = this.get_pointer_obj();
			var command = new ist.MovePropCommand({
				parent: parent_obj,
				name: prop_name,
				to: index
			});
			return command;
		};
		proto.move = function () {
			var command = this._get_move_prop_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};

		proto._get_set_cell_command = function (arg0, arg1, arg2) {
			var cell, str, for_state, i, dict, builtin_name, builtins, env_name, builtin, commands = [];
			if (arguments.length === 1) {
				cell = this.get_pointer_obj();
				str = arg0;
			} else if (arguments.length === 2) {
				dict = this.get_pointer_obj();

				if (_.isString(arg0)) {
					if (arg0[0] === "(" && arg0[arg0.length - 1] === ")") {
						builtin_name = arg0.slice(1, arg0.length - 1);

						builtins = dict.get_builtins();
						for (i in builtins) {
							if (builtins.hasOwnProperty(i)) {
								builtin = builtins[i];
								env_name = builtin._get_env_name();
								if (builtin_name === env_name) {
									cell = dict[builtin._get_getter_name()]();
									break;
								}
							}
						}
					} else {
						cell = dict._get_prop(arg0, this.pointer);
					}
				} else {
					cell = arg0;
				}
			} else {
				var prop, ignore_inherited_in_contexts = [];
				dict = this.get_pointer_obj();

				if (_.isString(arg0)) {
					if (arg0[0] === "(" && arg0[arg0.length - 1] === ")") {
						builtin_name = arg0.slice(1, arg0.length - 1);

						if (arg0 === "(prototypes)") {
							ignore_inherited_in_contexts = [dict];
						}

						builtins = dict.get_builtins();
						for (i in builtins) {
							if (builtins.hasOwnProperty(i)) {
								builtin = builtins[i];
								env_name = builtin._get_env_name();
								if (builtin_name === env_name) {
									prop = dict[builtin._get_getter_name()]();
									break;
								}
							}
						}
					} else {
						prop = dict._get_prop(arg0, this.pointer);
					}
				} else {
					prop = arg0;
				}

				for_state = this.find_state(arg1);
				str = arg2;

				cell = new ist.Cell({str: "", ignore_inherited_in_first_dict: true });
				commands.push(this._get_stateful_prop_set_value_command(prop,
																		for_state,
																		cell));
			}

			commands.push(new ist.ChangeCellCommand({
				cell: cell,
				str: str
			}));

			var command;
			if (commands.length === 1) {
				command = commands[0];
			} else {
				command = new ist.CombinedCommand({
					commands: commands
				});
			}
			return command;
		};

		proto.set_cell = function () {
			var command = this._get_set_cell_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};

		var get_state = function (state_name, states) {
			var i, state;
			for (i = 0; i < states.length; i += 1) {
				state = states[i];
				if (state instanceof ist.Statechart) {
					if (state === state_name) {
						return state;
					} else if (state.get_name() === state_name) {
						return state;
					} else if (state.get_name(state.parent()) === state_name) {
						return state;
					}
				}
			}
			return undefined;
		};

		proto._get_stateful_prop_set_value_command = function (stateful_prop, state, value) {
			var command = new ist.SetStatefulPropValueCommand({
				stateful_prop: stateful_prop,
				state: state,
				value: value
			});
			return command;
		};

		proto._get_stateful_prop_unset_value_command = function (stateful_prop, state) {
			var command = new ist.UnsetStatefulPropValueCommand({
				stateful_prop: stateful_prop,
				state: state
			});
			return command;
		};

		proto._get_add_state_command = function (state_name, index) {
			var statechart = this.get_current_statechart();

			if (_.isNumber(index)) { index += 1; } // Because of the pre_init state

			var command = new ist.AddStateCommand({
				name: state_name,
				statechart: statechart,
				index: index
			});
			return command;
		};

		proto.add_state = function () {
			var command = this._get_add_state_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};

		proto._get_remove_state_command = function (state_name) {
			var statechart = this.get_current_statechart();

			var command = new ist.RemoveStateCommand({
				name: state_name,
				statechart: statechart
			});
			return command;
		};
		proto.remove_state = function () {
			var command = this._get_remove_state_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};

		proto._get_move_state_command = function (state_name, index) {
			var statechart = this.get_current_statechart();

			if (_.isNumber(index)) { index += 1; } // Because of the pre_init state
			var command = new ist.MoveStateCommand({
				name: state_name,
				statechart: statechart,
				index: index
			});
			return command;
		};

		proto.move_state = function () {
			var command = this._get_move_state_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};


		proto._get_rename_state_command = function (from_state_name, to_state_name) {
			var statechart = this.get_current_statechart();

			var command = new ist.RenameStateCommand({
				from: from_state_name,
				to: to_state_name,
				statechart: statechart
			});
			return command;
		};
		proto.rename_state = function () {
			var command = this._get_rename_state_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};


		proto._get_add_transition_command = function (from_state_name, to_state_name, event) {
			var statechart = this.get_current_statechart();
			var parent = this.get_pointer_obj();

			var from_state = statechart.find_state(from_state_name);
			var to_state = statechart.find_state(to_state_name);

			if (_.isString(event)) {
				event = new ist.ParsedEvent({str: event, inert: true});
			}

			var command = new ist.AddTransitionCommand({
				statechart: statechart,
				event: event,
				from: from_state,
				to: to_state
			});
			return command;
		};
		proto.make_concurrent = function (state_name, concurrent) {
			if(arguments.length === 1) {
				concurrent = state_name;
				state_name = false;
			}

			var state = state_name ? this.find_state(state_name) : this.get_current_statechart(),
				command = new ist.MakeConcurrentCommand({
					statechart: state,
					concurrent: concurrent !== false
				});

			this._do(command);
			return this.default_return_value();
		};
		proto.add_transition = function () {
			var command = this._get_add_transition_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};

		proto._get_remove_transition_command = function (transition_id) {
			var statechart = this.get_current_statechart();
			var id, transition;
			
			if (transition_id instanceof ist.StatechartTransition) {
				transition = transition_id;
			} else {
				id = transition_id;
			}
			var command = new ist.RemoveTransitionCommand({
				statechart: statechart,
				id: id,
				transition: transition
			});
			return command;
		};
		proto.remove_transition = function () {
			var command = this._get_remove_transition_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};

		proto._get_set_event_command = function (transition_id, event) {
			var statechart = this.get_current_statechart();

			var command = new ist.SetTransitionEventCommand({
				statechart: statechart,
				id: transition_id,
				event: event
			});
			return command;
		};
		proto.set_event = function () {
			var command = this._get_set_event_command.apply(this, arguments);
			this._do(command);
			return this.default_return_value();
		};
		proto.set_from = function (transition, to_state) {
			transition = this.find_state(transition);
			to_state = this.find_state(to_state);
			var command = new ist.SetTransitionFromCommand({
				transition: transition,
				statechart: to_state
			});
			this._do(command);
			return this.default_return_value();
		};
		proto.set_to = function (transition, to_state) {
			transition = this.find_state(transition);
			to_state = this.find_state(to_state);
			var command = new ist.SetTransitionToCommand({
				transition: transition,
				statechart: to_state
			});
			this._do(command);
			return this.default_return_value();
		};
		proto.start_at = function(state_name) {
			var statechart,
				start_state, outgoing_transition, command,
				to_state = this.find_state(state_name);

			if(state_name.indexOf(".") < 0) {
				statechart = this.get_current_statechart();
			} else {
				statechart = this.find_state(state_name.slice(0, state_name.lastIndexOf(".")));
			}

			start_state = statechart.get_start_state();
			outgoing_transition = start_state.get_outgoing_transition();

			command = new ist.SetTransitionToCommand({
				transition: outgoing_transition,
				statechart: to_state
			});

			this._do(command);
			return this.default_return_value();
		};
		proto.on_state = function (spec, func, context) {
			var statechart = this.get_current_statechart();
			if (_.isString(func)) {
				func = ist.get_parsed_val(ist.parse(func), { });
			}
			var command = new ist.StatechartOnCommand({
				statechart: statechart,
				spec: spec,
				listener: func,
				pcontext: this.pointer,
				context: context
			});
			this._do(command);
			return this.default_return_value();
		};
		proto.off_state = function (spec, func, context) {
			var statechart = this.get_current_statechart();
			var command = new ist.StatechartOffCommand({
				statechart: statechart,
				spec: spec,
				listener: func,
				context: context
			});
			this._do(command);
			return this.default_return_value();
		};
		proto.print = function (logging_mechanism) {
			return ist.print(this.pointer, logging_mechanism);
		};
		proto.destroy = function () {
			var ptr = this.pointer,
				root = ptr.root(),
				croot = ist.find_or_put_contextual_obj(root);


			this._command_stack.destroy();
			delete this._command_stack;

			window.dbg = true;
			croot.destroy();
			window.dbg = false;
			/*
			if(_.keys(interstate.cobj_hashes).length>0) {
				debugger;
			}
			*/
			root.destroy();
			delete this.pointer;
		};
		proto._cycle_stringify_destringify = function() {
			var root = this.get_root(),
				stringified_root = ist.stringify(root);

			root.destroy();
			this._command_stack.clear();

			var new_root = ist.destringify(stringified_root);

			this.pointer = new ist.Pointer({stack: [new_root]});
		};
	}(ist.Environment));
}(interstate));
