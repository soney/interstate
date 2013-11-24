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
			root_pointer = new ist.Pointer({stack: [root]});
		} else {
			root = new ist.Dict({has_protos: false, direct_attachments: [new ist.PaperAttachment()/*, new ist.DomAttachment({instance_options: {tag: 'div'}})*/]});

			root_pointer = new ist.Pointer({stack: [root]});
			if(!options || options.create_builtins !== false) {
				var builtins = options && options.builtins || true;
				//this.initialize_props(root_pointer, builtins);
			}
		}
		//root.set("touches", touches);

		//Context tracking
		this.pointer = root_pointer;
		this.print_on_return = false;
	};

	var touches = cjs([]);
	var touchstart_listener = function(event) {
		touches.push.apply(touches, _.map(event.changedTouches, function(touch) {
			return cjs({
				x: touch.pageX,
				y: touch.pageY,
				id: touch.identifier
			});
		}));
		event.preventDefault();
	};
	var touchmove_listener = function(event) {
		var changed_touches = {};
		_.each(event.changedTouches, function(ct) {
			changed_touches[ct.identifier] = ct;
		});

		touches.forEach(function(touch) {
			var touch_id = touch.get("id");
			if(_.has(changed_touches, touch_id)) {
				var changed_touch = changed_touches[touch_id];
				touch.set("x", changed_touch.pageX);
				touch.set("y", changed_touch.pageY);
			}
		});

		event.preventDefault();
	};
	var touchend_listener = function(event) {
		var new_touches = {};
		_.each(event.touches, function(t) {
			new_touches[t.identifier] = true;
		});

		var remove_indicies = [];
		touches.forEach(function(touch, i) {
			var touch_id = touch.get("id");
			if(!_.has(new_touches, touch_id)) {
				remove_indicies.push(i);
			}
		});
		cjs.wait();
		while(remove_indicies.length > 0) {
			var removed = touches.splice(remove_indicies.pop(), 1);
			removed[0].destroy();
		}
		cjs.signal();

		event.preventDefault();
	};
	var addTouchListeners = function() {
		window.addEventListener("touchstart", touchstart_listener);
		window.addEventListener("touchmove", touchmove_listener);
		window.addEventListener("touchend", touchend_listener);
	};
	var removeTouchListeners = function() {
		window.removeEventListener("touchstart", touchstart_listener);
		window.removeEventListener("touchmove", touchmove_listener);
		window.removeEventListener("touchend", touchend_listener);
	};
	addTouchListeners();

	(function (my) {
		var proto = my.prototype;

		proto.initialize_props = function (root_pointer, builtins) {
			var root_dict = root_pointer.points_at();
			if(builtins === true || (_.indexOf(builtins, "raphael") >= 0)) {
				var screen = new ist.Dict({has_protos: false});
				root_dict.set("screen", screen);

				root_dict.set("width", new ist.Cell({str: "" + window.innerWidth}));
				root_dict.set("height", new ist.Cell({str: "" + window.innerHeight}));

				var shape = new ist.Dict({has_protos: false});
				root_dict.set("shape", shape);

				var circle = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																									instance_options: {
																										shape_type: "circle",
																										constructor_params: [0, 0, 0]
																									}
																							})]
																						});
				shape.set("circle", circle);
				circle.set("show", new ist.Cell({str: "true"}));
				circle.set("clip_rect", new ist.Cell({str: "null"}));
				circle.set("cursor", new ist.Cell({str: "'default'"}));
				circle.set("cx", new ist.Cell({str: "sketch.width/2"}));
				circle.set("cy", new ist.Cell({str: "sketch.height/2"}));
				circle.set("fill", new ist.Cell({str: "'teal'"}));
				circle.set("fill_opacity", new ist.Cell({str: "1.0"}));
				circle.set("opacity", new ist.Cell({str: "1.0"}));
				circle.set("r", new ist.Cell({str: "50"}));
				circle.set("stroke", new ist.Cell({str: "'none'"}));
				circle.set("stroke_dasharray", new ist.Cell({str: "''"}));
				circle.set("stroke_opacity", new ist.Cell({str: "1.0"}));
				circle.set("stroke_width", new ist.Cell({str: "1"}));
				circle.set("transform", new ist.Cell({str: "''"}));
				circle.set("animated_properties", new ist.Cell({str: "false"}));
				circle.set("animation_duration", new ist.Cell({str: "300"}));
				circle.set("animation_easing", new ist.Cell({str: "'linear'"}));


				var ellipse = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																									instance_options: {
																										shape_type: "ellipse",
																										constructor_params: [0, 0, 0, 0]
																									}
																							})]
																						});
				shape.set("ellipse", ellipse);
				ellipse.set("show", new ist.Cell({str: "true"}));
				ellipse.set("clip_rect", new ist.Cell({str: "null"}));
				ellipse.set("cursor", new ist.Cell({str: "'default'"}));
				ellipse.set("cx", new ist.Cell({str: "sketch.width/3"}));
				ellipse.set("cy", new ist.Cell({str: "sketch.height/3"}));
				ellipse.set("fill", new ist.Cell({str: "'yellow'"}));
				ellipse.set("fill_opacity", new ist.Cell({str: "1.0"}));
				ellipse.set("opacity", new ist.Cell({str: "1.0"}));
				ellipse.set("rx", new ist.Cell({str: "150"}));
				ellipse.set("ry", new ist.Cell({str: "90"}));
				ellipse.set("stroke", new ist.Cell({str: "'none'"}));
				ellipse.set("stroke_dasharray", new ist.Cell({str: "''"}));
				ellipse.set("stroke_opacity", new ist.Cell({str: "1.0"}));
				ellipse.set("stroke_width", new ist.Cell({str: "1"}));
				ellipse.set("transform", new ist.Cell({str: "''"}));
				ellipse.set("animated_properties", new ist.Cell({str: "false"}));
				ellipse.set("animation_duration", new ist.Cell({str: "300"}));
				ellipse.set("animation_easing", new ist.Cell({str: "'linear'"}));
				
				var image = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																									instance_options: {
																										shape_type: "image",
																										constructor_params: ["", 0, 0, 0, 0]
																									}
																							})]
																						});
				shape.set("image", image);
				image.set("show", new ist.Cell({str: "true"}));
				image.set("clip_rect", new ist.Cell({str: "null"}));
				image.set("cursor", new ist.Cell({str: "'default'"}));
				image.set("opacity", new ist.Cell({str: "1.0"}));
				image.set("src", new ist.Cell({str: "'http://interstate.from.so/images/interstate_logo.png'"}));
				image.set("transform", new ist.Cell({str: "''"}));
				image.set("x", new ist.Cell({str: "20"}));
				image.set("y", new ist.Cell({str: "20"}));
				image.set("width", new ist.Cell({str: "150"}));
				image.set("height", new ist.Cell({str: "150"}));
				image.set("animated_properties", new ist.Cell({str: "false"}));
				image.set("animation_duration", new ist.Cell({str: "300"}));
				image.set("animation_easing", new ist.Cell({str: "'linear'"}));


				var rect = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																									instance_options: {
																										shape_type: "rect",
																										constructor_params: [0, 0, 0, 0]
																									}
																							})]
																						});
				shape.set("rect", rect);
				rect.set("show", new ist.Cell({str: "true"}));
				rect.set("clip_rect", new ist.Cell({str: "null"}));
				rect.set("cursor", new ist.Cell({str: "'default'"}));
				rect.set("x", new ist.Cell({str: "sketch.width/4"}));
				rect.set("y", new ist.Cell({str: "sketch.height/4"}));
				rect.set("fill", new ist.Cell({str: "'Chartreuse'"}));
				rect.set("fill_opacity", new ist.Cell({str: "1.0"}));
				rect.set("opacity", new ist.Cell({str: "1.0"}));
				rect.set("r", new ist.Cell({str: "0"}));
				rect.set("stroke", new ist.Cell({str: "'none'"}));
				rect.set("stroke_dasharray", new ist.Cell({str: "''"}));
				rect.set("stroke_opacity", new ist.Cell({str: "1.0"}));
				rect.set("stroke_width", new ist.Cell({str: "1"}));
				rect.set("transform", new ist.Cell({str: "''"}));
				rect.set("width", new ist.Cell({str: "140"}));
				rect.set("height", new ist.Cell({str: "90"}));
				rect.set("animated_properties", new ist.Cell({str: "false"}));
				rect.set("animation_duration", new ist.Cell({str: "300"}));
				rect.set("animation_easing", new ist.Cell({str: "'linear'"}));
				
				var text = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																									instance_options: {
																										shape_type: "text",
																										constructor_params: [0, 0, ""]
																									}
																							})]
																						});
				shape.set("text", text);
				text.set("show", new ist.Cell({str: "true"}));
				text.set("clip_rect", new ist.Cell({str: "null"}));
				text.set("cursor", new ist.Cell({str: "'default'"}));
				text.set("x", new ist.Cell({str: "200"}));
				text.set("y", new ist.Cell({str: "150"}));
				text.set("opacity", new ist.Cell({str: "1.0"}));
				text.set("stroke", new ist.Cell({str: "'none'"}));
				text.set("fill", new ist.Cell({str: "'grey'"}));
				text.set("fill_opacity", new ist.Cell({str: "1.0"}));
				text.set("stroke_dasharray", new ist.Cell({str: "''"}));
				text.set("stroke_opacity", new ist.Cell({str: "1.0"}));
				text.set("stroke_width", new ist.Cell({str: "1"}));
				text.set("transform", new ist.Cell({str: "''"}));
				text.set("text", new ist.Cell({str: "'hello world'"}));
				text.set("text_anchor", new ist.Cell({str: "'middle'"}));
				text.set("font_family", new ist.Cell({str: "'Arial'"}));
				text.set("font_size", new ist.Cell({str: "40"}));
				text.set("font_weight", new ist.Cell({str: "400"}));
				text.set("font_style", new ist.Cell({str: "'normal'"}));
				text.set("animated_properties", new ist.Cell({str: "false"}));
				text.set("animation_duration", new ist.Cell({str: "300"}));
				text.set("animation_easing", new ist.Cell({str: "'linear'"}));

				var path = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																									instance_options: {
																										shape_type: "path",
																										constructor_params: ["M0,0"]
																									}
																							})]
																						});
				shape.set("path", path);
				path.set("show", new ist.Cell({str: "true"}));
				path.set("clip_rect", new ist.Cell({str: "null"}));
				path.set("cursor", new ist.Cell({str: "'default'"}));
				path.set("fill", new ist.Cell({str: "'none'"}));
				path.set("fill_opacity", new ist.Cell({str: "1.0"}));
				path.set("opacity", new ist.Cell({str: "1.0"}));
				path.set("stroke", new ist.Cell({str: "'RoyalBlue'"}));
				path.set("stroke_dasharray", new ist.Cell({str: "''"}));
				path.set("stroke_opacity", new ist.Cell({str: "1.0"}));
				path.set("stroke_miterlimit", new ist.Cell({str: "0"}));
				path.set("stroke_width", new ist.Cell({str: "1"}));
				path.set("path", new ist.Cell({str: "'M0,0L300,300'"}));
				path.set("transform", new ist.Cell({str: "''"}));
				path.set("animated_properties", new ist.Cell({str: "false"}));
				path.set("animation_duration", new ist.Cell({str: "300"}));
				path.set("animation_easing", new ist.Cell({str: "'linear'"}));

				var group = new ist.Dict({has_protos: false, direct_attachments: [new ist.GroupAttachment()]});
				shape.set("group", group);
				group.set("show", new ist.Cell({str: "true"}));
			}

			if(builtins === true || (_.indexOf(builtins, "dom") >= 0)) {
			/*
				var child_nodes = new ist.Dict({has_protos: false});
				root_dict.set("child_nodes", child_nodes);
				var dom = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
				root_dict.set("dom", dom);
				dom.set("tag", new ist.Cell({str: "'div'"}));
				*/
			}

			if(builtins === true || (_.indexOf(builtins, "functions") >= 0)) {
				root_dict.set("on", ist.on_event);
				root_dict.set("find", ist.find_fn);
				root_dict.set("emit", ist.emit);
			}
		};

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
			var dict = this.pointer.points_at();
			var pv = dict._get_direct_prop(prop_name);
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
			var parent_obj = this.get_pointer_obj();
			var cobj = ist.find_or_put_contextual_obj(parent_obj, this.pointer);
			if(cobj instanceof ist.ContextualStatefulObj) {
				cobj.reset();
			} else {
				throw new Error("Trying to reset non-stateful");
			}
			return this.default_return_value();
		};

		proto.set = function (prop_name, arg1, arg2, arg3) {
			var builtin_name, i, index, getter_name, val, value;
			var commands = [],
				builtin_info = false;

			var parent_obj = this.get_pointer_obj();

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
					value = new ist.Dict({has_protos: false});
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
				} else {
					value = new ist.Cell({str: value});
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
							commands.push(new ist.SetStatefulPropValueCommand({
								stateful_prop: val,
								state: state,
								value: value
							}));
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
										str: arg2
									}));
									
									value.destroy();
								} else {
									commands.push(new ist.SetStatefulPropValueCommand({
										stateful_prop: val,
										state: state,
										value: value
									}));
								}
							} else {
								commands.push(new ist.SetStatefulPropValueCommand({
									stateful_prop: val,
									state: state,
									value: value
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
								value: value
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
							value: value
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
								str: arg1
							}));
							value.destroy();
						} else {
							commands.push(new ist.SetPropCommand({
								parent: parent_obj,
								name: prop_name,
								value: value,
								index: index
							}));
						}
					} else {
						commands.push(new ist.SetPropCommand({
							parent: parent_obj,
							name: prop_name,
							value: value,
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
						value: value
					}));
				} else {
					commands.push(new ist.SetPropCommand({
						parent: parent_obj,
						name: prop_name,
						value: value,
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
			//console.log(obj, ptr);
			var cobj = ist.find_or_put_contextual_obj(obj, ptr);
			var command = new ist.InheritPropCommand({
				parent: cobj,
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

						if (arg0 === "(protos)") {
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
			concurrent = concurrent !== false;
			var state = this.find_state(state_name);
			var command = new ist.MakeConcurrentCommand({
				statechart: state,
				concurrent: concurrent
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
			var statechart = this.get_current_statechart();
			var command;
			var start_state = statechart.get_start_state();
			var to_state = this.find_state(state_name);
			var outgoing_transition = start_state.get_outgoing_transition();
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
			var ptr = this.pointer;
			var root = ptr.root();
			var croot = ist.find_or_put_contextual_obj(root);


			this._command_stack.destroy();
			delete this._command_stack;

			croot.destroy();
			root.destroy();
			delete this.pointer;
		};
	}(ist.Environment));
	/*

	ist.define("environment", function (options) {
		var env = new ist.Environment(options);
		return env;
	});
	*/

	var pad = function (str, len) {
		if (str.length > len) {
			return str.substring(0, len - 3) + "...";
		} else if (str.length < len) {
			var rv = str;
			while (rv.length < len) {
				rv += " ";
			}
			return rv;
		} else {
			return str;
		}
	};
}(interstate));
