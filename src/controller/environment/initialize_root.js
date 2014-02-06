/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.get_default_root = function(dont_initialize, builtins) {
		var root = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment({instance_options: {tag: 'div'}})]});

		if(!dont_initialize) {
			ist.initialize_root(root, builtins);
		}

		return root;
	};
	ist.initialize_root = function (root_dict, builtins) {
		if(builtins !== false || (_.indexOf(builtins, "svg") >= 0)) {
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
			circle.set("cx", new ist.Cell({str: "width/2"}));
			circle.set("cy", new ist.Cell({str: "height/2"}));
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
			svg.set("ellipse", ellipse);
			ellipse.set("show", new ist.Cell({str: "true"}));
			ellipse.set("clip_rect", new ist.Cell({str: "null"}));
			ellipse.set("cursor", new ist.Cell({str: "'default'"}));
			ellipse.set("cx", new ist.Cell({str: "width/3"}));
			ellipse.set("cy", new ist.Cell({str: "height/3"}));
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


			var rect = new ist.Dict({has_protos: false, direct_attachments: [new ist.ShapeAttachment({
																								instance_options: {
																									shape_type: "rect",
																									constructor_params: [0, 0, 0, 0]
																								}
																						})]
																					});
			svg.set("rect", rect);
			rect.set("show", new ist.Cell({str: "true"}));
			rect.set("clip_rect", new ist.Cell({str: "null"}));
			rect.set("cursor", new ist.Cell({str: "'default'"}));
			rect.set("x", new ist.Cell({str: "width/4"}));
			rect.set("y", new ist.Cell({str: "height/4"}));
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

			var group = new ist.Dict({has_protos: false, direct_attachments: [new ist.GroupAttachment()]});
			svg.set("group", group);
			group.set("show", new ist.Cell({str: "true"}));
		}

		if(builtins !== false || (_.indexOf(builtins, "dom") >= 0)) {
			var dom = new ist.Dict({has_protos: false});
			root_dict.set("dom", dom);

			var node = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("node", node);
			node.set("tag", new ist.Cell({str: "'div'"}));

			var div = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("div", div);
			div.set("tag", new ist.Cell({str: "'div'"}));

			var strong = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("strong", strong);
			strong.set("tag", new ist.Cell({str: "'strong'"}));

			var span = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("span", span);
			span.set("tag", new ist.Cell({str: "'span'"}));

			var ul = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("ul", ul);
			ul.set("tag", new ist.Cell({str: "'ul'"}));

			var ol = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("ol", ol);
			ol.set("tag", new ist.Cell({str: "'ol'"}));

			var li = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("li", li);
			li.set("tag", new ist.Cell({str: "'li'"}));

			var h1 = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("h1", h1);
			h1.set("tag", new ist.Cell({str: "'h1'"}));
			h1.set("textContent", new ist.Cell({str: "'Header 1'"}));

			var h2 = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("h2", h2);
			h2.set("tag", new ist.Cell({str: "'h2'"}));
			h2.set("textContent", new ist.Cell({str: "'Header 2'"}));

			var h3 = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("h3", h3);
			h3.set("tag", new ist.Cell({str: "'h3'"}));
			h3.set("textContent", new ist.Cell({str: "'Header 3'"}));

			var h4 = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("h4", h4);
			h4.set("tag", new ist.Cell({str: "'h4'"}));
			h4.set("textContent", new ist.Cell({str: "'Header 4'"}));

			var h5 = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("h5", h5);
			h5.set("tag", new ist.Cell({str: "'h5'"}));
			h5.set("textContent", new ist.Cell({str: "'Header 5'"}));

			var h6 = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("h6", h4);
			h6.set("tag", new ist.Cell({str: "'h6'"}))
				.set("textContent", new ist.Cell({str: "'Header 6'"}));

			var input = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("input", input);
			input.set("tag", new ist.Cell({str: "'input'"}));

			var table = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("table", table);
			table.set("tag", new ist.Cell({str: "'table'"}));

			var tbody = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("tbody", table);
			tbody.set("tbody", new ist.Cell({str: "'tbody'"}));

			var tr = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("tr", tr);
			tr.set("tag", new ist.Cell({str: "'tr'"}));

			var td = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("td", td);
			td.set("tag", new ist.Cell({str: "'td'"}));

			var th = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("th", td);
			th.set("tag", new ist.Cell({str: "'th'"}));

			var p = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("p", p);
			p.set("tag", new ist.Cell({str: "'p'"}));

			var pre = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("pre", pre);
			pre.set("tag", new ist.Cell({str: "'pre'"}));

			var br = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("br", br);
			br.set("tag", new ist.Cell({str: "'br'"}));

			var a = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("a", a);
			br.set("tag", new ist.Cell({str: "'a'"}));
			
			var label = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("label", label);
			label.set("tag", new ist.Cell({str: "'label'"}));
			
			var img = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("img", img);
			img.set("tag", new ist.Cell({str: "'img'"}));

			var select = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("select", select);
			select.set("tag", new ist.Cell({str: "'select'"}));

			var option = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("option", option);
			option.set("tag", new ist.Cell({str: "'option'"}));

			var button = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("button", button);
			button.set("tag", new ist.Cell({str: "'button'"}));

			var hr = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});
			dom.set("hr", hr);
			hr.set("tag", new ist.Cell({str: "'hr'"}));
		}

		if(builtins !== false || (_.indexOf(builtins, "functions") >= 0)) {
			root_dict.set("on", ist.on_event);
			root_dict.set("find", ist.find_fn);
			root_dict.set("emit", ist.emit);
		}
	};
}(interstate));
