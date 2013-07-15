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

	red.register_attachments({
		"paper": {
			ready: function() {
				this.dom_obj = window.document.createElement("div");
				this.paper = new Raphael(this.dom_obj, 0, 0);
			},
			parameters: {
				width_height: function(contextual_object) {
					var width = contextual_object.prop_val("width"),
						height = contextual_object.prop_val("height");
					this.paper.setSize(width, height);
				},
				screen: {
					type: "list",
					add: function(shape_attachment_instance, index) {
						var robj = shape_attachment_instance.create_robj(this.paper);
					},
					remove: function(shape_attachment_instance) {
						shape_attachment_instance.remove();
					},
					move: function(item, from_index, to_index) {
						//console.log("move");
					},
					getter: function(contextual_object) {
						var screen = contextual_object.prop_val("screen");
						var screen_contents = [];
						if(screen instanceof red.ContextualDict) {
							screen_contents = screen.children();
						}
				
						var children = [];
						_.each(screen_contents, function(child_info) {
							var child = child_info.value;
							if(child instanceof red.ContextualDict) {
								if(child.is_template()) {
									var copies = child.instances();
									_.each(copies, function(child) {
										var shape_attachment_instance = child.get_attachment_instance("shape");
										if(shape_attachment_instance) {
											children.push(shape_attachment_instance);
										}
									});
								} else {
									var shape_attachment_instance = child.get_attachment_instance("shape");
									if(shape_attachment_instance) {
										children.push(shape_attachment_instance);
									}
								}
							}
						}, this);
						return children;
					}
				}
			},
			proto_props: {
				get_dom_obj: function() {
					return this.dom_obj;
				},
				destroy:  function() {
					console.log("destroy");
				}
			},
			attachment_destroy: function() {
			}
		},
	"shape": {
			ready: function() {
				this.shape_type = this.options.shape_type;
				this.constructor_params = this.options.constructor_params;
				this.$robj = cjs.$(false);
			},
			destroy: function() {
				this.remove();
				this.$robj.destroy();
				this.$robj = false;
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
									var anim_options = { };
									anim_options[raph_name] = prop_val;
									try {
										robj.animate(anim_options, duration);
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
		}
	});
}(red, jQuery));
