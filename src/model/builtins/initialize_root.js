/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.get_default_root = function(builtins) {
		var root = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment({instance_options: {tag: 'div'}})]});

		ist.initialize_root(root, builtins);

		return root;
	};
	ist.initialize_root = function (root_dict, builtins) {
		if((builtins !== false && !_.isArray(builtins)) || (_.indexOf(builtins, "svg") >= 0)) {
			var svg = new ist.Dict({has_protos: false});
			root_dict.set("svg", svg);

			var paper = new ist.Dict({
				has_protos: false,
				direct_attachments: [new ist.PaperAttachment()]
			});
			paper.set("width", new ist.Cell({str: "400"}));
			paper.set("height", new ist.Cell({str: "400"}));
			paper.set("fill", new ist.Cell({str: "'white'"}));
			svg.set("paper", paper);

			var circle = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "circle",
																									constructor_params: [0, 0, 0]
																								}
																						})]
																					});
			svg.set("circle", circle);
			circle.set("show", new ist.Cell({str: "true"}));
			circle.set("clip_rect", new ist.Cell({str: "null"}));
			circle.set("cursor", new ist.Cell({str: "'default'"}));
			circle.set("cx", new ist.Cell({str: "2*r"}));
			circle.set("cy", new ist.Cell({str: "2*r"}));
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
			circle.set("shape", new ist.Cell({str: "'circle'"}));


			var ellipse = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "ellipse",
																									constructor_params: [0, 0, 0, 0]
																								}
																						})]
																					});
			svg.set("ellipse", ellipse);
			ellipse.set("show", new ist.Cell({str: "true"}));
			ellipse.set("clip_rect", new ist.Cell({str: "null"}));
			ellipse.set("cursor", new ist.Cell({str: "'default'"}));
			ellipse.set("cx", new ist.Cell({str: "2*rx"}));
			ellipse.set("cy", new ist.Cell({str: "2*ry"}));
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
			ellipse.set("shape", new ist.Cell({str: "'ellipse'"}));

			var image = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "image",
																									constructor_params: ["", 0, 0, 0, 0]
																								}
																						})]
																					});
			svg.set("image", image);
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
			image.set("shape", new ist.Cell({str: "'image'"}));


			var rect = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "rect",
																									constructor_params: [0, 0, 0, 0]
																								}
																						})]
																					});
			svg.set("rectangle", rect);
			rect.set("show", new ist.Cell({str: "true"}));
			rect.set("clip_rect", new ist.Cell({str: "null"}));
			rect.set("cursor", new ist.Cell({str: "'default'"}));
			rect.set("x", new ist.Cell({str: "10"}));
			rect.set("y", new ist.Cell({str: "10"}));
			rect.set("fill", new ist.Cell({str: "'Chartreuse'"}));
			rect.set("fill_opacity", new ist.Cell({str: "1.0"}));
			rect.set("opacity", new ist.Cell({str: "1.0"}));
			rect.set("r", new ist.Cell({str: "0"}));
			rect.set("stroke", new ist.Cell({str: "'none'"}));
			rect.set("stroke_dasharray", new ist.Cell({str: "''"}));
			rect.set("stroke_opacity", new ist.Cell({str: "1.0"}));
			rect.set("stroke_width", new ist.Cell({str: "1"}));
			rect.set("transform", new ist.Cell({str: "''"}));
			rect.set("width", new ist.Cell({str: "150"}));
			rect.set("height", new ist.Cell({str: "100"}));
			rect.set("animated_properties", new ist.Cell({str: "false"}));
			rect.set("animation_duration", new ist.Cell({str: "300"}));
			rect.set("animation_easing", new ist.Cell({str: "'linear'"}));
			rect.set("shape", new ist.Cell({str: "'rectangle'"}));

			var text = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "text",
																									constructor_params: [0, 0, ""]
																								}
																						})]
																					});
			svg.set("text", text);
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
			text.set("shape", new ist.Cell({str: "'text'"}));

			var path = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "path",
																									constructor_params: ["M0,0"]
																								}
																						})]
																					});
			svg.set("path", path);
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
			path.set("shape", new ist.Cell({str: "'path'"}));

			var group = new ist.Dict({has_protos: false, direct_attachments: [new ist.GroupAttachment()]});
			svg.set("group", group);
			group.set("showChildren", new ist.Cell({str: "true"}));
		}

		if((builtins !== false && !_.isArray(builtins)) || (_.indexOf(builtins, "dom") >= 0)) {
			var dom = new ist.Dict({has_protos: false});
			root_dict.set("dom", dom);

			var node = new ist.Dict({direct_attachments: [new ist.DomAttachment()]});
			dom.set("node", node);
			node.set("tag", new ist.Cell({str: "'div'"}));
			node.set("attr", new ist.Dict());
			node.set("style", new ist.Dict());
			node.set("textContent", new ist.Cell({str: "'no text'"}));
			node.set("show", new ist.Cell({str: "true"}));
			node.set("showChildren", new ist.Cell({str: "true"}));

			var div = new ist.Dict();
			dom.set("div", div);
			div._set_direct_protos(new ist.Cell({ ignore_inherited_in_first_dict: true, str: "dom.node"}));
			div.set("tag", new ist.Cell({str: "'div'"}));

			var input = new ist.Dict();
			dom.set("input", input);
			input._set_direct_protos(new ist.Cell({ ignore_inherited_in_first_dict: true, str: "dom.node"}));
			input	.set("tag", new ist.Cell({str: "'input'"}))
					.set("textContent", new ist.Cell({str: "''"}));

			_.each(["strong", "span", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5",
					"h6", "table", "tbody", "tr", "td", "th", "p", "pre", "br", "a",
					"label", "img", "select", "option", "button", "hr"],
					function(tag_name) {
						var obj = new ist.Dict();
						dom.set(tag_name, obj);
						obj._set_direct_protos(new ist.Cell({ ignore_inherited_in_first_dict: true, str: "dom.node"}));
						obj.set("tag", new ist.Cell({str: "'" + tag_name + "'"}));
					});

			var canvas = new ist.Dict({
				has_protos: false,
				direct_attachments: [new ist.CanvasAttachment()]
			});
			canvas.set("width", new ist.Cell({str: "400"}));
			canvas.set("height", new ist.Cell({str: "400"}));
			dom.set("canvas", canvas)
			/**/
		}

		if((builtins !== false && !_.isArray(builtins)) || (_.indexOf(builtins, "physics") >= 0)) {
			var physics = new ist.Dict({has_protos: false});
			root_dict.set("physics", physics);

			var world = new ist.Dict({direct_attachments: [new ist.WorldAttachment()]});
			physics.set("world", world);
			world.set("gx", new ist.Cell({str: "0.0"}));
			world.set("gy", new ist.Cell({str: "9.8"}));

			var fixture = new ist.Dict({direct_attachments: [new ist.FixtureAttachment()]});
			physics.set("fixture", fixture);
			fixture.set("fixed", new ist.Cell({str: "true"}));
			fixture.set("restitution", new ist.Cell({str: "0.2"}));
			fixture.set("friction", new ist.Cell({str: "0.5"}));
			fixture.set("density", new ist.Cell({str: "1.0"}));
			fixture.set("world", new ist.Cell({str: "physics.world"}));
			fixture.set("computed_x", new ist.Cell({str: "fetch_physics_info(this, 'getComputedX')"}));
			fixture.set("computed_y", new ist.Cell({str: "fetch_physics_info(this, 'getComputedY')"}));
			fixture.set("computed_theta", new ist.Cell({str: "fetch_physics_info(this, 'getComputedTheta')"}));
			fixture.set("applyForce", new ist.Cell({str: "physics_call(this, 'applyForce')"}));
			fixture.set("applyImpulse", new ist.Cell({str: "physics_call(this, 'applyImpulse')"}));
			fixture.set("physics_call", new ist.Cell({str: "function(p, prop_name) {" +
				"var fixture_attachment = interstate.get_attachment(p, 'box2d_fixture');" +
				//"if(fixture_attachment) {" +
				"return fixture_attachment[prop_name].bind(fixture_attachment);" +
				//"}" +
			"}"}));
			fixture.set("fetch_physics_info", new ist.Cell({str: "function(p, prop_name) {" +
				"var fixture_attachment = interstate.get_attachment(p, 'box2d_fixture');" +
				//"if(fixture_attachment) {" +
				"return fixture_attachment[prop_name]();" +
				//"}" +
			"}"}));
		}

		if((builtins !== false && !_.isArray(builtins)) || (_.indexOf(builtins, "functions") >= 0)) {
			root_dict.set("on", ist.on_event);
			root_dict.set("find", ist.find_fn);
			root_dict.set("emit", ist.emit);
		}

		if((builtins !== false && !_.isArray(builtins)) || (_.indexOf(builtins, "device") >= 0)) {
			var device = ist.createDevices();
			root_dict.set("device", device);
		}
	};
}(interstate));
