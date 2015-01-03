/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	// dom
	ist.createDomObject = function() {
		var dom = new ist.Dict({has_protos: false}),
			node = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment()]});

		dom	.set("node", node);

		node.set("arguments", new ist.Cell({str: "['div']"}))
			.set("tag", new ist.Cell({str: "arguments[0] || 'div'"}))
			.set("attr", new ist.Dict({has_protos: false}))
			.set("style", new ist.Dict({has_protos: false}))
			.set("textContent", new ist.Cell({str: "'no text'"}))
			.set("show", new ist.Cell({str: "true"}))
			.set("showChildren", new ist.Cell({str: "true"}));

		_.each(["a", "input", "textarea", "form"], function(tag_name) {
			var dict, attr;
			if(tag_name === "input") {
				dict = new ist.Dict({direct_attachments: [new ist.DomInputAttachment()]});
			} else {
				dict = new ist.Dict();
			}
			attr = new ist.Dict();

			dict._set_direct_protos(new ist.Cell({ ignore_inherited_in_first_dict: true, str: "dom.node"}));
			dict.set("tag", new ist.Cell({str: "'"+tag_name+"'"}))
				.set("attr", attr);

			if(tag_name === "a") {
				attr.set("href", new ist.Cell({str: "container.href"}))
					.set("target", new ist.Cell({str: "container.target"}));

				dict.set("href", new ist.Cell({str: "'#'"}))
					.set("target", new ist.Cell({str: "'_self'"}));
			} else if(tag_name === "input") {
				attr.set("placeholder", new ist.Cell({str: "container.placeholder"}))
					.set("type", new ist.Cell({str: "container.type"}))
					.set("name", new ist.Cell({str: "container.name"}))
					.set("disabled", new ist.Cell({str: "container.disabled"}));

				dict.set("placeholder", new ist.Cell({str: "false"}))
					.set("type", new ist.Cell({str: "'text'"}))
					.set("name", new ist.Cell({str: "false"}))
					.set("disabled", new ist.Cell({str: "false"}));
			} else if(tag_name === "textarea") {
				attr.set("placeholder", new ist.Cell({str: "container.placeholder"}))
					.set("disabled", new ist.Cell({str: "container.disabled"}));

				dict.set("placeholder", new ist.Cell({str: "false"}))
					.set("disabled", new ist.Cell({str: "false"}));
			} else if(tag_name === "form") {
				attr.set("action", new ist.Cell({str: "container.action"}))
					.set("target", new ist.Cell({str: "container.target"}))
					.set("method", new ist.Cell({str: "container.method"}))
					.set("autocomplete", new ist.Cell({str: "container.autocomplete"}));

				dict.set("action", new ist.Cell({str: "'#'"}))
					.set("target", new ist.Cell({str: "'_self'"}))
					.set("method", new ist.Cell({str: "'GET'"}))
					.set("autocomplete", new ist.Cell({str: "'off'"}))
			}
			dom.set(tag_name, dict);
		});
		_.each(["radio", "text", "checkbox", "submit"], function(tag_name) {
			var dict = new ist.Dict(),
				attr = new ist.Dict();

			dict._set_direct_protos(new ist.Cell({ ignore_inherited_in_first_dict: true, str: "dom.input"}));
			dict.set("type", new ist.Cell({str: "'"+tag_name+"'"}))
				.set("attr", attr);

			attr.set("placeholder", new ist.Cell({str: "container.placeholder"}))
				.set("type", new ist.Cell({str: "container.type"}))
				.set("name", new ist.Cell({str: "container.name"}));

			if(tag_name === "radio") {
				dict.set("checked", new ist.Cell({str: "false"}))

				attr.set("checked", new ist.Cell({str: "container.checked"}))
			} else if(tag_name === "checkbox") {
				dict.set("checked", new ist.Cell({str: "false"}));

				attr.set("checked", new ist.Cell({str: "container.checked"}));
			} else if(tag_name === "text") {
				
			}
			dom.set(tag_name, dict);
		});

		_.each(["div", "strong", "span", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5",
				"h6", "table", "tbody", "tr", "td", "th", "p", "pre", "br",
				"label", "img", "select", "option", "button", "hr", "legend", "fieldset"],
				function(tag_name) {
					dom.set(tag_name, new ist.Cell({str: "node('" + tag_name + "')"}));
				});
		dom.__is_dom__ = true;
		return dom;
	};
	ist.register_serializable_type("ist_dom",
		function (x) {
			return x.__is_dom__;
		},
		function () {
			return {};
		},
		function (obj) {
			return ist.createDomObject();
		});
}(interstate));
