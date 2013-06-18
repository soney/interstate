/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.Environment = function (options) {
		// Undo stack
		this._command_stack = new red.CommandStack();

		var root, root_pointer;
		if (options && _.has(options, "root")) {
			root = options.root;
			root_pointer = new red.Pointer({stack: [root]});
		} else {
			root = new red.Dict({has_protos: false, direct_attachments: [new red.PaperAttachment()]});

			root_pointer = new red.Pointer({stack: [root]});
			if(!options || options.create_builtins !== false) {
				this.initialize_props(root_pointer);
			}
		}

		//Context tracking
		this.pointer = root_pointer;
		this.print_on_return = false;

		if(!options || options.create_builtins !== false) {
			root.set("on", red.on_event);
			/*
			root.set("emit", red.emit);
			root.set("find", function (find_root) {
				if (arguments.length === 0) {
					find_root = new red.ContextualObject({pointer: root_pointer});
				}
				return new red.Query({value: find_root});
			});
			*/
		}
	};

	(function (my) {
		var proto = my.prototype;

		proto.initialize_props = function (root_pointer) {
			var root_dict = root_pointer.points_at();

			var screen = new red.Dict({has_protos: false});
			root_dict.set("screen", screen);

			root_dict.set("width", new red.Cell({str: "500"}));
			root_dict.set("height", new red.Cell({str: "500"}));

			var shape = new red.Dict({has_protos: false});
			root_dict.set("shape", shape);

			var circle = new red.Dict({has_protos: false, direct_attachments: [new red.ShapeAttachment({
																								instance_options: {
																									shape_type: "circle",
																									constructor_params: [0, 0, 0]
																								}
																						})]
																					});
			shape.set("circle", circle);
			circle.set("show", red.create("cell", {str: "true"}));
			circle.set("clip_rect", red.create("cell", {str: "null"}));
			circle.set("cursor", red.create("cell", {str: "'default'"}));
			circle.set("cx", red.create("cell", {str: "30"}));
			circle.set("cy", red.create("cell", {str: "50"}));
			circle.set("fill", red.create("cell", {str: "'none'"}));
			circle.set("fill_opacity", red.create("cell", {str: "1.0"}));
			circle.set("opacity", red.create("cell", {str: "1.0"}));
			circle.set("r", red.create("cell", {str: "50"}));
			circle.set("stroke", red.create("cell", {str: "'black'"}));
			circle.set("stroke_dasharray", red.create("cell", {str: "''"}));
			circle.set("stroke_opacity", red.create("cell", {str: "1.0"}));
			circle.set("stroke_width", red.create("cell", {str: "1"}));
			circle.set("transform", red.create("cell", {str: "''"}));
			circle.set("animated_properties", red.create("cell", {str: "false"}));
			circle.set("animation_duration", red.create("cell", {str: "300"}));


			var ellipse = red.create("dict", {has_protos: false, direct_attachments: [red.create("shape_attachment", {
																								instance_options: {
																									shape_type: "ellipse",
																									constructor_params: [0, 0, 0, 0]
																								}
																						})]
																					});
			shape.set("ellipse", ellipse);
			ellipse.set("show", red.create("cell", {str: "true"}));
			ellipse.set("clip_rect", red.create("cell", {str: "null"}));
			ellipse.set("cursor", red.create("cell", {str: "'default'"}));
			ellipse.set("cx", red.create("cell", {str: "30"}));
			ellipse.set("cy", red.create("cell", {str: "50"}));
			ellipse.set("fill", red.create("cell", {str: "'none'"}));
			ellipse.set("fill_opacity", red.create("cell", {str: "1.0"}));
			ellipse.set("opacity", red.create("cell", {str: "1.0"}));
			ellipse.set("rx", red.create("cell", {str: "50"}));
			ellipse.set("ry", red.create("cell", {str: "20"}));
			ellipse.set("stroke", red.create("cell", {str: "'black'"}));
			ellipse.set("stroke_dasharray", red.create("cell", {str: "''"}));
			ellipse.set("stroke_opacity", red.create("cell", {str: "1.0"}));
			ellipse.set("stroke_width", red.create("cell", {str: "1"}));
			ellipse.set("transform", red.create("cell", {str: "''"}));
			ellipse.set("animated_properties", red.create("cell", {str: "false"}));
			ellipse.set("animation_duration", red.create("cell", {str: "300"}));
			
			var image = red.create("dict", {has_protos: false, direct_attachments: [red.create("shape_attachment", {
																								instance_options: {
																									shape_type: "image",
																									constructor_params: ["", 0, 0, 0, 0]
																								}
																						})]
																					});
			shape.set("image", image);
			image.set("show", red.create("cell", {str: "true"}));
			image.set("clip_rect", red.create("cell", {str: "null"}));
			image.set("cursor", red.create("cell", {str: "'default'"}));
			image.set("opacity", red.create("cell", {str: "1.0"}));
			image.set("src", red.create("cell", {str: "'http://from.so/smile.png'"}));
			image.set("transform", red.create("cell", {str: "''"}));
			image.set("x", red.create("cell", {str: "20"}));
			image.set("y", red.create("cell", {str: "20"}));
			image.set("width", red.create("cell", {str: "150"}));
			image.set("height", red.create("cell", {str: "150"}));
			image.set("animated_properties", red.create("cell", {str: "false"}));
			image.set("animation_duration", red.create("cell", {str: "300"}));


			var rect = red.create("dict", {has_protos: false, direct_attachments: [red.create("shape_attachment", {
																								instance_options: {
																									shape_type: "rect",
																									constructor_params: [0, 0, 0, 0]
																								}
																						})]
																					});
			shape.set("rect", rect);
			rect.set("show", red.create("cell", {str: "true"}));
			rect.set("clip_rect", red.create("cell", {str: "null"}));
			rect.set("cursor", red.create("cell", {str: "'default'"}));
			rect.set("x", red.create("cell", {str: "20"}));
			rect.set("y", red.create("cell", {str: "30"}));
			rect.set("fill", red.create("cell", {str: "'red'"}));
			rect.set("fill_opacity", red.create("cell", {str: "1.0"}));
			rect.set("opacity", red.create("cell", {str: "1.0"}));
			rect.set("r", red.create("cell", {str: "0"}));
			rect.set("stroke", red.create("cell", {str: "'black'"}));
			rect.set("stroke_dasharray", red.create("cell", {str: "''"}));
			rect.set("stroke_opacity", red.create("cell", {str: "1.0"}));
			rect.set("stroke_width", red.create("cell", {str: "1"}));
			rect.set("transform", red.create("cell", {str: "''"}));
			rect.set("width", red.create("cell", {str: "40"}));
			rect.set("height", red.create("cell", {str: "50"}));
			rect.set("animated_properties", red.create("cell", {str: "false"}));
			rect.set("animation_duration", red.create("cell", {str: "300"}));
			
			var text = red.create("dict", {has_protos: false, direct_attachments: [red.create("shape_attachment", {
																								instance_options: {
																									shape_type: "text",
																									constructor_params: [0, 0, ""]
																								}
																						})]
																					});
			shape.set("text", text);
			text.set("show", red.create("cell", {str: "true"}));
			text.set("clip_rect", red.create("cell", {str: "null"}));
			text.set("cursor", red.create("cell", {str: "'default'"}));
			text.set("x", red.create("cell", {str: "50"}));
			text.set("y", red.create("cell", {str: "30"}));
			text.set("opacity", red.create("cell", {str: "1.0"}));
			text.set("stroke", red.create("cell", {str: "'none'"}));
			text.set("fill", red.create("cell", {str: "'black'"}));
			text.set("fill_opacity", red.create("cell", {str: "1.0"}));
			text.set("stroke_dasharray", red.create("cell", {str: "''"}));
			text.set("stroke_opacity", red.create("cell", {str: "1.0"}));
			text.set("stroke_width", red.create("cell", {str: "1"}));
			text.set("transform", red.create("cell", {str: "''"}));
			text.set("text", red.create("cell", {str: "'hello world'"}));
			text.set("text_anchor", red.create("cell", {str: "'middle'"}));
			text.set("font_family", red.create("cell", {str: "'Arial'"}));
			text.set("font_size", red.create("cell", {str: "16"}));
			text.set("font_weight", red.create("cell", {str: "400"}));
			text.set("font_style", red.create("cell", {str: "'normal'"}));
			text.set("animated_properties", red.create("cell", {str: "false"}));
			text.set("animation_duration", red.create("cell", {str: "300"}));

			var path = red.create("dict", {has_protos: false, direct_attachments: [red.create("shape_attachment", {
																								instance_options: {
																									shape_type: "path",
																									constructor_params: ["M0,0"]
																								}
																						})]
																					});
			shape.set("path", path);
			path.set("show", red.create("cell", {str: "true"}));
			path.set("clip_rect", red.create("cell", {str: "null"}));
			path.set("cursor", red.create("cell", {str: "'default'"}));
			path.set("fill", red.create("cell", {str: "'red'"}));
			path.set("fill_opacity", red.create("cell", {str: "1.0"}));
			path.set("opacity", red.create("cell", {str: "1.0"}));
			path.set("stroke", red.create("cell", {str: "'black'"}));
			path.set("stroke_dasharray", red.create("cell", {str: "''"}));
			path.set("stroke_opacity", red.create("cell", {str: "1.0"}));
			path.set("stroke_miterlimit", red.create("cell", {str: "0"}));
			path.set("stroke_width", red.create("cell", {str: "1"}));
			path.set("path", red.create("cell", {str: "'M24.132,7.971c-2.203-2.205-5.916-2.098-8.25,0.235L15.5,8.588l-0.382-0.382c-2.334-2.333-6.047-2.44-8.25-0.235c-2.204,2.203-2.098,5.916,0.235,8.249l8.396,8.396l8.396-8.396C26.229,13.887,26.336,10.174,24.132,7.971z'"}));
			path.set("transform", red.create("cell", {str: "''"}));
			path.set("animated_properties", red.create("cell", {str: "false"}));
			path.set("animation_duration", red.create("cell", {str: "300"}));
			/*

			var dom = red.create("dict", {has_protos: false, direct_attachments: [red.create("dom_attachment")]});
			dom.set("tag", red.create("cell", {str: "'div'"}));
		//	dom.set("text", red.create("cell", {str: "undefined"}));
			//dom.set("children", red.create("dict", {has_protos: false}));
		//	dom.set("attr", red.create("dict", {has_protos: false}));
		//	dom.set("css", red.create("dict", {has_protos: false}));
			root_dict.set("dom", dom);

			var raphael = red.create("dict", {has_protos: false, direct_attachments: [red.create("raphael_attachment")]});
			root_dict.set("raphael", raphael);

			var three = red.create("dict", {has_protos: false});

			var point_light = red.create("dict", {has_protos: false, direct_attachments: [red.create("point_light_attachment")]});
			three.set("point_light", point_light);

			var scene = red.create("dict", {has_protos: false, direct_attachments: [red.create("three_scene_attachment")]});
			three.set("scene", scene);

			var lambert_material = red.create("dict", {has_protos: false, direct_attachments: [red.create("lambert_material_attachment")]});
			three.set("lambert_material", lambert_material);

			var sphere_geometry = red.create("dict", {has_protos: false, direct_attachments: [red.create("sphere_geometry_attachment")]});
			three.set("sphere_geometry", sphere_geometry);

			var mesh = red.create("dict", {has_protos: false, direct_attachments: [red.create("mesh_attachment")]});
			three.set("mesh", mesh);

			root_dict.set("three", three);

			var box2d = red.create("dict", {has_protos: false});

			var box2d_world = red.create("dict", {has_protos: false, direct_attachments: [red.create("box2d_world_attachment")]});
			box2d.set("world", box2d_world);

			var box2d_fixture = red.create("dict", {has_protos: false, direct_attachments: [red.create("box2d_fixture_attachment")]});
			box2d_fixture.set("get_x", function() { return this.get_attachment_instance("box2d_fixture").b2x.get(); });
			box2d_fixture.set("get_y", function() { return this.get_attachment_instance("box2d_fixture").b2y.get(); });
			box2d_fixture.set("get_vx", function() { return this.get_attachment_instance("box2d_fixture").b2vx.get(); });
			box2d_fixture.set("get_vy", function() { return this.get_attachment_instance("box2d_fixture").b2vy.get(); });
			box2d_fixture.set("get_theta", function() { return this.get_attachment_instance("box2d_fixture").b2t.get(); });
			box2d_fixture.set("get_vtheta", function() { return this.get_attachment_instance("box2d_fixture").b2vt.get(); });
			box2d.set("fixture", box2d_fixture);

			var box2d_body = red.create("dict", {has_protos: false, direct_attachments: [red.create("box2d_body_attachment")]});
			box2d.set("body", box2d_body);

			var box2d_shape = red.create("dict", {has_protos: false, direct_attachments: [red.create("box2d_shape_attachment")]});
			box2d.set("shape", box2d_shape);

			/*

			var box2d_joint = red.create("dict", {has_protos: false, direct_attachments: [red.create("box2d_joint_attachment")]});
			box2d.set("joint", box2d_joint);

			root_dict.set("box2d", box2d);

			var children = red.create("dict", {has_protos: false});
			root_dict.set("child_nodes", children);
			*/
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
			var SOandC = red.find_stateful_obj_and_context(this.pointer);
			var owner = SOandC.stateful_obj;
			statechart = owner.get_own_statechart();
			if (!statechart) {
				throw new Error("Could not find statechart");
			}
			return statechart;
		};
		proto.find_state = function (name) {
			var i, inherited_statecharts, isc;
			if (name instanceof red.State || name instanceof red.StatechartTransition) {
				return name.basis() || name;
			} else {
				var SOandC = red.find_stateful_obj_and_context(this.pointer);
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
						var contextual_object = red.find_or_put_contextual_obj(SOandC.stateful_obj, SOandC.context);
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
			var root = this.pointer.points_at(0);
			root.reset();
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
				if (parent_obj instanceof red.StatefulObj) {
					value = "<stateful_prop>";
				} else {
					value = "<stateful>";
				}
			} else {
				value = _.last(arguments);
			}

			if (_.isString(value)) {
				if (value === "<dict>") {
					value = red.create("dict", {has_protos: false});
					var direct_protos = red.create("cell", { ignore_inherited_in_first_dict: true/*str: "[]", ignore_inherited_in_contexts: [value]*/});
					value._set_direct_protos(direct_protos);
				} else if (value === "<stateful>") {
					value = red.create("stateful_obj", undefined, true);
					value.do_initialize({
						direct_protos: red.create("stateful_prop", { can_inherit: false, statechart_parent: value })
					});
					/*
					value.get_own_statechart().add_state("INIT")
						.starts_at("INIT");
					*/
				} else if (value === "<stateful_prop>") {
					value = red.create("stateful_prop");
				} else {
					value = red.create("cell", {str: value});
				}
			}

			if (arguments.length === 3 || (arguments.length === 4 && _.isNumber(arg3))) { // prop_name, state, value
				var state = this.find_state(arg1);
				index = arg3;

				if (value instanceof red.StatefulProp) {
					throw new Error("Value is an instanceof a stateful prop");
				}

				if (builtin_info) {
					getter_name = builtin_info._get_getter_name();
					val = parent_obj[getter_name]();
					if (val) {
						if (val instanceof red.StatefulProp) {
							commands.push(new red.SetStatefulPropValueCommand({
								stateful_prop: val,
								state: state,
								value: value
							}));
						} else {
							throw new Error("Trying to set value for non stateful prop");
						}
					} else {
						val = red.create("stateful_prop");
						commands.push(new red.SetBuiltinCommand({
							parent: parent_obj,
							name: builtin_name,
							value: value
						}));
						commands.push(new red.SetStatefulPropValueCommand({
							stateful_prop: val,
							state: state,
							value: value
						}));
					}
				} else {
					if (parent_obj._has_direct_prop(prop_name)) {
						val = parent_obj._get_direct_prop(prop_name);
						if (val instanceof red.StatefulProp) {
							if (val._has_direct_value_for_state(state)) {
								var sp_val = val._direct_value_for_state(state);
								if (sp_val instanceof red.Cell && _.isString(arg2)) {
									commands.push(new red.ChangeCellCommand({
										cell: sp_val,
										str: arg2
									}));
									
									value.destroy();
								} else {
									commands.push(new red.SetStatefulPropValueCommand({
										stateful_prop: val,
										state: state,
										value: value
									}));
								}
							} else {
								commands.push(new red.SetStatefulPropValueCommand({
									stateful_prop: val,
									state: state,
									value: value
								}));
							}
						} else {
							val = red.create("stateful_prop");
							commands.push(new red.SetPropCommand({
								parent: parent_obj,
								name: prop_name,
								value: val,
								index: index
							}));
							commands.push(new red.SetStatefulPropValueCommand({
								stateful_prop: val,
								state: state,
								value: value
							}));
						}
					} else {
						val = red.create("stateful_prop");
						commands.push(new red.SetPropCommand({
							parent: parent_obj,
							name: prop_name,
							value: val,
							index: index
						}));
						commands.push(new red.SetStatefulPropValueCommand({
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
						if (val instanceof red.Cell && _.isString(arg1)) {
							commands.push(new red.ChangeCellCommand({
								cell: val,
								str: arg1
							}));
						} else {
							commands.push(new red.SetBuiltinCommand({
								parent: parent_obj,
								name: builtin_name,
								value: value
							}));
						}
					} else {
						commands.push(new red.SetBuiltinCommand({
							parent: parent_obj,
							name: builtin_name,
							value: value
						}));
					}
				} else {
					if (parent_obj._has_direct_prop(prop_name)) {
						val = parent_obj._get_direct_prop(prop_name);
						if (val instanceof red.Cell && _.isString(arg1)) {
							commands.push(new red.ChangeCellCommand({
								cell: val,
								str: arg1
							}));
							value.destroy();
						} else {
							commands.push(new red.SetPropCommand({
								parent: parent_obj,
								name: prop_name,
								value: value,
								index: index
							}));
						}
					} else {
						commands.push(new red.SetPropCommand({
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
					commands.push(new red.SetBuiltinCommand({
						parent: parent_obj,
						name: builtin_name,
						value: value
					}));
				} else {
					commands.push(new red.SetPropCommand({
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
				command = new red.CombinedCommand({
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
			var command = new red.UnsetPropCommand({
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

		proto._get_rename_prop_command = function (from_name, to_name) {
			var parent_obj = this.get_pointer_obj();
			var command = new red.RenamePropCommand({
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
		proto._get_move_prop_command = function (prop_name, index) {
			var parent_obj = this.get_pointer_obj();
			var command = new red.MovePropCommand({
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

				cell = red.create("cell", {str: "", ignore_inherited_in_first_dict: true });
				commands.push(this._get_stateful_prop_set_value_command(prop,
																		for_state,
																		cell));
			}

			commands.push(new red.ChangeCellCommand({
				cell: cell,
				str: str
			}));

			var command;
			if (commands.length === 1) {
				command = commands[0];
			} else {
				command = new red.CombinedCommand({
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
				if (state instanceof red.Statechart) {
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
			var command = new red.SetStatefulPropValueCommand({
				stateful_prop: stateful_prop,
				state: state,
				value: value
			});
			return command;
		};

		proto._get_stateful_prop_unset_value_command = function (stateful_prop, state) {
			var command = new red.UnsetStatefulPropValueCommand({
				stateful_prop: stateful_prop,
				state: state
			});
			return command;
		};

		proto._get_add_state_command = function (state_name, index) {
			var statechart = this.get_current_statechart();

			if (_.isNumber(index)) { index += 1; } // Because of the pre_init state

			var command = new red.AddStateCommand({
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

			var command = new red.RemoveStateCommand({
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
			var command = new red.MoveStateCommand({
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

			var command = new red.RenameStateCommand({
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
				event = red.create_event("parsed", {str: event, inert: true});
			}

			var command = new red.AddTransitionCommand({
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
			var command = new red.MakeConcurrentCommand({
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
			
			if (transition_id instanceof red.StatechartTransition) {
				transition = transition_id;
			} else {
				id = transition_id;
			}
			var command = new red.RemoveTransitionCommand({
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

			var command = new red.SetTransitionEventCommand({
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
			var command = new red.SetTransitionFromCommand({
				transition: transition,
				statechart: to_state
			});
			this._do(command);
			return this.default_return_value();
		};
		proto.set_to = function (transition, to_state) {
			transition = this.find_state(transition);
			to_state = this.find_state(to_state);
			var command = new red.SetTransitionToCommand({
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
			command = new red.SetTransitionToCommand({
				transition: outgoing_transition,
				statechart: to_state
			});
			this._do(command);
			return this.default_return_value();
		};
		proto.on_state = function (spec, func, context) {
			var statechart = this.get_current_statechart();
			if (_.isString(func)) {
				func = red.get_parsed_val(red.parse(func), { });
			}
			var command = new red.StatechartOnCommand({
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
			var command = new red.StatechartOffCommand({
				statechart: statechart,
				spec: spec,
				listener: func,
				context: context
			});
			this._do(command);
			return this.default_return_value();
		};
		proto.print = function (logging_mechanism) {
			return red.print(this.pointer, logging_mechanism);
		};
		proto.destroy = function () {
		};
	}(red.Environment));

	red.define("environment", function (options) {
		var env = new red.Environment(options);
		return env;
	});

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
}(red));
