/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var dom_template = cjs.createTemplate(
		"<span class='dom_attachment_view'>" +
			"<span class='tag'>{{'<'+tag+'>'}}</span>" +
				"{{#if textContent}}" +
					"{{textContent}}" +
				"{{#else}}" +
					"<span class='elipses'>...</span>" +
				"{{/if}}" +
			"<span class='tag'>{{'</'+tag+'>'}}</span>" +
		"</span>"
	);
	var name = ist.attachmentViews.dom = "dom_attachment_view";
	$.widget("interstate." + name, {
		options: {
			client: false
		},
		_create: function() {
			var client = this.option("client");
			this.$tag = client.get_$("prop_val", "tag")
			this.$textContent = client.get_$("prop_val", "textContent")
			this._addContentBindings();
		},
		_destroy: function() {
			var client = this.option("client");

			this._removeContentBindings();
			this.$tag.destroy();
			this._super();
		},
		_addContentBindings: function() {
			dom_template({
				tag: this.$tag,
				textContent: this.$textContent
			}, this.element);
		},
		_removeContentBindings: function() {
			cjs.destroyTemplate(this.element);
		},
		_addClassBindings: function() {
			this.element.removeClass("dom_attachment_view");
		},
		_removeClassBindings: function() {
			this.element.removeClass("dom_attachment_view");
		},
	});
}(interstate, jQuery));
