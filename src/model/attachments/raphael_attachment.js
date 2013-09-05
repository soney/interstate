/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,Raphael,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var is_paper = function(obj) { return obj instanceof Raphael._Paper; };

	var insert_at = function (child_node, parent_node, index) {
		var paper = parent_node;
		var paper_children = [];
		var child_index;
		paper.forEach(function(child) {
			paper_children.push(child);
		});
		child_index = _.indexOf(paper_children, child_node);
		if(child_index >= 0) {
			move(child_node, child_index, index);
		} else {
			if(paper_children.length <= index) {
				child_node.insertAfter(paper.bottom);
			} else {
				var before_child = paper_children[index];
				child_node.insertBefore(before_child);
			}
		}
	};
	var remove = function (child_node) {
		child_node.remove();
	};
	var move = function (child_node, from_index, to_index) {
		var paper = child_node.paper;
		var paper_children = [];
		paper.forEach(function(child) {
			paper_children.push(child);
		});

		if (from_index < to_index) { //If it's less than the index we're inserting at...
			to_index += 1; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
		}
		var before_child = paper_children[to_index];
		if(to_index >= paper_children.length) {
			before_child = paper.bottom;
		}
		child_node.insertBefore(before_child);
	};
	var get_children = function(child_nodes) {
		var children = [];
		_.each(child_nodes, function(child) {
			if(child instanceof red.ContextualDict) {
				if(child.is_template()) {
					var copies = child.instances();
					children.push.apply(children, get_children(copies));
				} else {
					var shape_attachment_instance = child.get_attachment_instance("shape");
					if(shape_attachment_instance) {
						var to_show = child.prop_val("show");
						if(to_show) {
							children.push(shape_attachment_instance);
						}
					}
					var group_attachment_instance = child.get_attachment_instance("group");
					if(group_attachment_instance) {
						//console.log(group_attachment_instance);
						children.push.apply(children, group_attachment_instance.get_children());
					}
				}
			}
		}, this);
		return children;
	};

	red.PaperAttachment = red.register_attachment("paper", {
			ready: function() {
				this.dom_obj = window.document.createElement("div");
				this.paper = new Raphael(this.dom_obj, 0, 0);
			},
			destroy: function(silent) {
				this.paper.clear();
				this.paper.remove();
				delete this.paper;
				delete this.dom_obj;
			},
			parameters: {
				width_height: function(contextual_object) {
					var width = contextual_object.prop_val("width"),
						height = contextual_object.prop_val("height");
					this.paper.setSize(width, height);
				},
				screen: {
					type: "list",
					add: function(shape_attachment_instance, to_index) {
						var shape = shape_attachment_instance.create_robj(this.paper);
						var itemi, len;
						var index = 0;
						var item;
						this.paper.forEach(function(elem) {
							if(index === to_index) {
								itemi = elem;
							}
							len = index;
							index++;
						});
						if(itemi !== shape) {
							if(to_index >= len) {
								shape.toBack();
							} else {
								shape.insertBefore(itemi);
							}
						}
					},
					remove: function(shape_attachment_instance) {
						shape_attachment_instance.remove();
					},
					move: function(item, from_index, to_index) {
						var shape = item.get_robj();
						var index = 0;
						if (from_index < to_index) { //If it's less than the index we're inserting at...
							to_index += 1; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
						}
						var itemi, len;
						this.paper.forEach(function(elem) {
							if(index === to_index) {
								itemi = elem;
							}
							len = index;
							index++;
						});
						if(to_index >= len) {
							shape.toBack();
						} else {
							shape.insertBefore(itemi);
						}
					},
					getter: function(contextual_object) {
						var screen = contextual_object.prop_val("screen");
						var screen_contents = [];
						if(screen instanceof red.ContextualDict) {
							screen_contents = screen.children();
						}
				
						var values = _.pluck(screen_contents, "value");
						values.reverse();
						var children = get_children(values);
						return children;
					}
				}
			},
			proto_props: {
				get_dom_obj: function() {
					return this.dom_obj;
				}
			}
		});
	red.ShapeAttachment = red.register_attachment("shape", {
			ready: function() {
				this.shape_type = this.options.shape_type;
				this.constructor_params = this.options.constructor_params;
				this.$robj = cjs.$(false);
			},
			destroy: function(silent) {
				this.remove();
				this.$robj.destroy(silent);
				delete this.constructor_params;
				delete this.$robj;
			},
			parameters: (function(infos) {
				var can_animate_parameters = ["r", "cx", "cy", "x", "y", "width", "height", "path", "fill", "stroke", "opacity", "fill_opacity", "stroke_opacity", "transform"];
				var parameters = {};
				_.each(infos, function(euc_name, raph_name) {
					parameters[euc_name] = function(contextual_object) {
						if(contextual_object.has(euc_name)) {
							var prop_val = contextual_object.prop_val(euc_name);
							var robj = this.get_robj();
							if(robj) {
								var animated_properties = contextual_object.prop_val("animated_properties");
								if(_.indexOf(can_animate_parameters, euc_name) >= 0 &&
										((_.isArray(animated_properties) && _.indexOf(animated_properties, euc_name) >= 0) ||
											animated_properties === true ||
											animated_properties === "*")) {
									var duration = contextual_object.prop_val("animation_duration");
									if(!_.isNumber(duration)) {
										duration = 300;
									}
									
									var easing = contextual_object.prop_val("animation_easing");
									if(!_.isString(easing)) {
										easing = "linear";
									}

									var anim_options = { };
									anim_options[raph_name] = prop_val;
									try {
										robj.animate(anim_options, duration, easing);
									} catch(e) {
										console.error(e);
									}
								} else {
									try {
										robj.attr(raph_name, prop_val);
									} catch(e) {
										console.error(e);
									}
								}
							}
						}
					};
				}, this);
				return parameters;
			}({
				opacity: "opacity", // put opacity first because fill-opacity should be set after opacity (?)
				"arrow-end": "arrow_end",
				"arrow-start": "arrow_start",
				blur: "blur",
				"clip-rect": "clip_rect",
				cursor: "cursor",
				cx: "cx",
				cy: "cy",
				fill: "fill",
				"fill-opacity": "fill_opacity",
				font: "font",
				"font-family": "font_family",
				"font-size": "font_size",
				"font-style": "font_style",
				"font-weight": "font_weight",
				height: "height",
				href: "href",
				"letter-spacing": "letter_spacing",
				path: "path",
				r: "r",
				rx: "rx",
				ry: "ry",
				src: "src",
				stroke: "stroke",
				"stroke-dasharray": "stroke_dasharray",
				"stroke-linecap": "stroke_linecap",
				"stroke-linejoin": "stroke_linejoin",
				"stroke-miterlimit": "stroke_miterlimit",
				"stroke-opacity": "stroke_opacity",
				"stroke-width": "stroke_width",
				target: "target",
				"text-anchor": "text_anchor",
				text: "text",
				title: "title",
				transform: "transform",
				width: "width",
				x: "x",
				y: "y"
			})),
			proto_props: {
				create_robj: function(paper) {
					var robj = this.get_robj();
					if(robj) {
						return robj;
					} else {
						robj = paper[this.shape_type].apply(paper, this.constructor_params);
						this.$robj.set(robj);
						return robj;
					}
				},
				get_robj: function() {
					return cjs.get(this.$robj);
				},
				remove: function() {
					var robj = this.get_robj();
					if(robj) {
						robj.remove();
						this.$robj.set(false);
					}
				}
			},
			attachment_destroy: function() { }
		});
	red.GroupAttachment = red.register_attachment("group", {
			ready: function() {
				this.$children = cjs.$(this.child_getter, {context: this});
			},
			destroy: function(silent) {
				this.$children.destroy(silent);
				delete this.$children;
			},
			parameters: {
				children: function(contextual_object) {
				}
			},
			proto_props: {
				child_getter: function() {
					var contextual_object = this.get_contextual_object();
					var children, cobj_children, values;
					var to_show = contextual_object.prop_val("show");

					if(_.isArray(to_show) || _.isString(to_show)) {
						if(_.isString(to_show)) {
							to_show = [to_show];
						}
						cobj_children = _.filter(contextual_object.children(), function(child_info) {
							return _.contains(to_show, child_info.name);
						});
						values = _.pluck(cobj_children, "value");
						values.reverse();
						children = get_children(values);
					} else if(to_show) {
						cobj_children = contextual_object.children();
						values = _.pluck(cobj_children, "value");
						values.reverse();
						children = get_children(values);
					} else {
						children = [];
					}
					return children;
				},
				get_children: function() {
					return this.$children.get();
				}
			}
		});
}(red, jQuery));
