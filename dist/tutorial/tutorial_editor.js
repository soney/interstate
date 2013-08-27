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
			this.prev_button = $("<a />")	.attr("href", "javascript:void(0)")
											.text("prev")
											.addClass("prev")
											.appendTo(this.instructions)
											.on("click", $.proxy(this.prev, this));
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
		prev: function() {
			this.option("page_no", this.option("page_no") - 1);
		},
		show_page_no: function(page_index) {
			var options;
			if(this.page) {
				options = this.page.editor;
				if(_.isFunction(options.on_exit)) {
					options.on_exit.call(this, $);
				}
			}

			var pages = this.option("pages");
			this.page = pages[page_index];
			options = this.page.editor;

			if(_.isFunction(options.on_enter)) {
				options.on_enter.call(this, $);
			}

			this.instruction_content.html(options.text);
			this.client_socket.post({
				type: "tutorial",
				subtype: "page_set",
				page_index: page_index
			});
			if(page_index === 0) {
				this.prev_button.hide();
			} else {
				this.prev_button.show();
			}
			if(page_index === pages.length-1) {
				this.next_button.text("done").on("click.done", $.proxy(function() {
					this.instructions.hide();
				}, this));
			} else {
				this.next_button.text("next").off("click.done");
			}
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
