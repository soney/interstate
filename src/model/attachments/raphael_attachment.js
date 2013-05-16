/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,Raphael,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	var VALID_TYPES = ["path", "image", "rect", "text", "circle", "ellipse"];

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
				screen: function(contextual_object) {
					var screen = contextual_object.prop_val("screen");
					var screen_contents = [];
					if(screen instanceof red.ContextualDict) {
						screen_contents = screen.children();
					}

				
					var children = [];
					_.each(screen_contents, function(child_info) {
						var child = child_info.value;
						if(child instanceof red.ContextualDict) {
							var shape_attachment_instance = child.get_attachment_instance("shape");
							if(shape_attachment_instance) {
								var robj = shape_attachment_instance.create_robj(this.paper);
								children.push(robj);
							}
						}
					}, this);
				}
			},
			proto_props: {
				get_dom_obj: function() {
					return this.dom_obj;
				}
			}
		},
	"shape": {
			ready: function() {
				this.shape_type = this.options.shape_type;
				this.constructor_params = this.options.constructor_params;
			},
			parameters: (function(infos) {
				var parameters = {};
				_.each(infos, function(euc_name, raph_name) {
					parameters[euc_name] = function(contextual_object) {
						if(contextual_object.has(euc_name)) {
							var prop_val = contextual_object.prop_val(euc_name);
							if(this.robj) {
								this.robj.attr(raph_name, prop_val);
							}
						}
					};
				}, this);
				return parameters;
			}({
				"arrow-end": "arrow_end",
				"arrow-start": "arrow_start",
				blur: "blur",
				"clip-rect": "clip_rect",
				cursor: "cursor",
				cx: "cy",
				cy: "cx",
				fill: "fill",
				"fill-opacity": "fill_opacity",
				font: "font",
				"font-family": "font_family",
				"font-size": "font_size",
				"font-style": "font_style",
				"font-weight": "font_weight",
				gradient: "gradient",
				height: "height",
				href: "href",
				"letter-spacing": "letter_spacing",
				opacity: "opacity",
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
				title: "title",
				transform: "transform",
				width: "width",
				x: "x",
				y: "y"
			})),
			proto_props: {
				create_robj: function(paper) {
					if(this.robj) {
						return this.robj;
					} else {
						this.robj = paper[this.shape_type].apply(paper, this.constructor_params);
						return this.robj;
					}
				}
			}
		}
	});
	/*
	var to_register = {};
	_.each([
		{
			type: "circle",
			constructor_params: [0, 0, 0],
			parameters: {
				"clip_rect": "clip-rect",
				"cursor": "cursor",
				"fill": "fill",
				"cx": "cx",
				"cy": "cy",
				"fill_opacity": "fill-opacity",
				"opacity": "opacity",
				"r": "r",
				"stroke": "stroke",
				"stroke_dasharray": "stroke-dasharray",
				"stroke_opacity": "stroke-opacity",
				"stroke_width": "stroke-width",
				"transform": "transform"
			}
		},
		{
			type: "ellipse",
			constructor_params: [0, 0, 0, 0],
			parameters: {
				"clip_rect": "clip-rect",
				"cursor": "cursor",
				"fill": "fill",
				"cx": "cx",
				"cy": "cy",
				"fill_opacity": "fill-opacity",
				"opacity": "opacity",
				"rx": "rx",
				"ry": "ry",
				"stroke": "stroke",
				"stroke_dasharray": "stroke-dasharray",
				"stroke_opacity": "stroke-opacity",
				"stroke_width": "stroke-width",
				"transform": "transform"
			}
		},
		{
			type: "image",
			constructor_params: ["", 0, 0, 0, 0],
			parameters: {
				"clip_rect": "clip-rect",
				"cursor": "cursor",
				"fill": "fill",
				"x": "x",
				"y": "y",
				"fill_opacity": "fill-opacity",
				"opacity": "opacity",
				"rx": "rx",
				"ry": "ry",
				"stroke": "stroke",
				"stroke_dasharray": "stroke-dasharray",
				"stroke_opacity": "stroke-opacity",
				"stroke_width": "stroke-width",
				"transform": "transform"
			}
		}

	], function(item_info) {
		to_register[item_info.type] = (function(info) {
				var rv = {
					ready: function() {
						this.robj = false;
					},
					proto_props: {
						create_robj: function(paper) {
							if(this.robj) {
								return this.robj;
							} else {
								this.robj = paper[info.type].apply(paper, info.constructor_params);
								return this.robj;
							}
						}
					}
				};
				rv.parameters = {};
				_.each(info.parameters, function(raph_name, euc_name) {
					rv.parameters[euc_name] = function(contextual_object) {
						if(contextual_object.has(euc_name)) {
							var prop_val = contextual_object.prop_val(euc_name);
							if(this.robj) {
								this.robj.attr(raph_name, prop_val);
							}
						}
					};
				}, this);
				return rv;
		}(item_info));
	});

	red.register_attachments(to_register);
	*/
}(red, jQuery));
