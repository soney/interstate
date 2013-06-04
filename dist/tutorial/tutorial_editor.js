/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	$.widget("red.tutorial_editor", {
		options: {
			pages: [],
			root: null,
			page_no: 0
		},
		_create: function() {
			this.editor = $("<div />")	.appendTo(this.element)
										.editor({ });

			this.instructions = $("<div />").addClass("instructions")
											.appendTo(this.element);
			this.instruction_content = $("<div />")	.addClass("content")
													.appendTo(this.instructions);
			this.next_button = $("<a />")	.attr("href", "javascript:void(0)")
											.text("next")
											.addClass("next")
											.appendTo(this.instructions)
											.on("click", $.proxy(this.next, this));

			this.client_socket = this.editor.editor("get_client_socket");
			this.client_socket.on("message", function(data) {
				if(data.type === "tutorial") {
					console.log(data.subtype);
				}
			}).on("loaded", function() {
				this.show_page_no(this.option("page_no"));
			}, this);
		},
		_destroy: function() {
			this.editor.editor("destroy").remove();
			this.instructions.remove();
		},
		next: function() {
			this.option("page_no", this.option("page_no") + 1);
		},
		show_page_no: function(page_index) {
			var pages = this.option("pages");
			var page = pages[page_index];
			var options = page.editor;

			if(page_index === pages.length - 1) {
				this.next_button.hide();
			} else {
				this.next_button.show();
			}

			this.instruction_content.text(options.text);
			if(options.hide_editor === true) {
				this.editor.hide();
			} else {
				this.editor.show();
			}

			if(options.body_color) {
				$("html").css("background-color", options.body_color);
			} else {
				$("html").css("background-color", "");
			}
			this.client_socket.post({
				type: "tutorial",
				subtype: "page_set",
				page_index: page_index
			});
		},
		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "page_no") {
				var pages = this.option("pages");
				if(value < pages.length) {
					this.show_page_no(value);
				}
			}
		}
	});
}(red, jQuery));
