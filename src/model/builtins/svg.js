/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	// svg
	ist.createSvgObject = function() {
		var svg = new ist.Dict({has_protos: false}),
			shapes = {
				paper: new ist.Dict({
					has_protos: false,
					direct_attachments: [new ist.PaperAttachment()]
				}),
				circle: new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "circle",
																									constructor_params: [0, 0, 0]
																								}
																						})]
																					}),
				ellipse: new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "ellipse",
																									constructor_params: [0, 0, 0, 0]
																								}
																						})]
																					}),
				image: new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "image",
																									constructor_params: ["http://interstate.from.so/images/interstate_logo.png", 0, 0, 0, 0]
																								}
																						})]
																					}),
				rectangle: new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "rect",
																									constructor_params: [0, 0, 0, 0]
																								}
																						})]
																					}),
				text: new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "text",
																									constructor_params: [0, 0, ""]
																								}
																						})]
																					}),
				path: new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "path",
																									constructor_params: ["M0,0"]
																								}
																						})]
																					}),
				group: new ist.Dict({has_protos: false, direct_attachments: [new ist.GroupAttachment()]})
			},
			cell_values = {
				paper: {
					width: "400",
					height: "400",
					fill: "'white'"
				},

				circle: {
					show: "true",
					clip_rect: "'none'",
					cursor: "'default'",
					cx: "2*r",
					cy: "2*r",
					fill: "'teal'",
					fill_opacity: "1.0",
					opacity: "1.0",
					r: "50",
					stroke: "'none'",
					stroke_dasharray: "''",
					stroke_opacity: "1.0",
					stroke_width: "1",
					transform: "''",
					animated_properties: "false",
					animation_duration: "300",
					animation_easing: "'linear'",
					debugDraw: "false",
					shape: "'circle'"
				},
				ellipse: {
					show: "true",
					clip_rect: "null",
					cursor: "'default'",
					cx: "2*rx",
					cy: "2*ry",
					fill: "'yellow'",
					fill_opacity: "1.0",
					opacity: "1.0",
					rx: "150",
					ry: "90",
					stroke: "'none'",
					stroke_dasharray: "''",
					stroke_opacity: "1.0",
					stroke_width: "1",
					transform: "''",
					animated_properties: "false",
					animation_duration: "300",
					animation_easing: "'linear'",
					debugDraw: "false",
					shape: "'ellipse'"
				},

				image: {
					show: "true",
					clip_rect: "null",
					cursor: "'default'",
					opacity: "1.0",
					href: "'http://interstate.from.so/images/interstate_logo.png'",
					transform: "''",
					x: "20",
					y: "20",
					width: "150",
					height: "150",
					animated_properties: "false",
					animation_duration: "300",
					animation_easing: "'linear'",
					shape: "'image'",
				},

				rectangle: {
					show: "true",
					clip_rect: "null",
					cursor: "'default'",
					x: "10",
					y: "10",
					fill: "'Chartreuse'",
					fill_opacity: "1.0",
					opacity: "1.0",
					r: "0",
					stroke: "'none'",
					stroke_dasharray: "''",
					stroke_opacity: "1.0",
					stroke_width: "1",
					transform: "''",
					width: "150",
					height: "100",
					animated_properties: "false",
					animation_duration: "300",
					animation_easing: "'linear'",
					debugDraw: "false",
					shape: "'rectangle'",
				},

				text: {
					show: "true",
					clip_rect: "null",
					cursor: "'default'",
					x: "200",
					y: "150",
					opacity: "1.0",
					stroke: "'none'",
					fill: "'grey'",
					fill_opacity: "1.0",
					stroke_dasharray: "''",
					stroke_opacity: "1.0",
					stroke_width: "1",
					transform: "''",
					text: "'hello world'",
					text_anchor: "'middle'",
					font_family: "'Arial'",
					font_size: "40",
					font_weight: "400",
					font_style: "'normal'",
					animated_properties: "false",
					animation_duration: "300",
					animation_easing: "'linear'",
					shape: "'text'",
				},

				path: {
					show: "true",
					clip_rect: "null",
					cursor: "'default'",
					fill: "'none'",
					fill_opacity: "1.0",
					opacity: "1.0",
					stroke: "'RoyalBlue'",
					stroke_dasharray: "''",
					stroke_opacity: "1.0",
					stroke_miterlimit: "0",
					stroke_width: "1",
					path: "'M0,0L300,300'",
					transform: "''",
					animated_properties: "false",
					animation_duration: "300",
					debugDraw: "false",
					animation_easing: "'linear'",
					shape: "'path'",
				},

				group: {
					showChildren: "true",
				}
			};

		_.each(shapes, function(dict, shape_name) {
			svg.set(shape_name, dict);
			_.each(cell_values[shape_name], function(cell_content, attr_name) {
				dict.set(attr_name, new ist.Cell({str: cell_content}));
			});
		});

		svg.__is_svg__ = true;
		return svg;
	};
	ist.register_serializable_type("ist_svg",
		function (x) {
			return x.__is_svg__;
		},
		function () {
			return {};
		},
		function (obj) {
			return ist.createSvgObject();
		});
}(interstate));
