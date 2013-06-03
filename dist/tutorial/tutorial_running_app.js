/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	$.widget("red.tutorial_running_app", {
		options: {
			pages: [],
			page_no: 0
		},
		_create: function() {
			this.env = red.create("environment");
			this.app = $("<div />")	.appendTo(this.element)
									.dom_output({
										root: this.env.get_root(),
										editor_url: "tutorial_editor.html"
									});
			//hide the output for now
			$("svg").hide();
			this.get_started_message = $("<div />")	.text("Click 'edit' in the top right of this window to start the tutorial")
													.appendTo(this.element);
			this.$on_editor_open = $.proxy(this.on_editor_open, this);
			this.app.on("editor_open", this.$on_editor_open);
		},
		on_editor_open: function() {
			this.app.off("editor_open", this.$on_editor_open);
			this.get_started_message.remove();
			$("svg").show();
		},
		_destroy: function() {
			this.app.running_app("destroy").remove();
		}
	});
}(red, jQuery));
