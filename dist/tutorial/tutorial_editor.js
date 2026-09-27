/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	$.widget("interstate.tutorial_editor", {
		options: {
			pages: [],
			root: null,
			page_no: 0,
			client_id: false
		},
		_create: function() {
			this.editor = $("<div />")	.appendTo(this.element)
										.editor({
											pinned_row: false,
											client_id: this.option("client_id")
										});
			this.instructions_table = $("<table />").addClass("instructions")
													.attr("role", "presentation")
													.appendTo(this.element);
			
			this.instructions_row = $("<tr />").appendTo(this.instructions_table);

			//this.instructions = $("<div />").addClass("instructions")
											//.appendTo(this.element);
			this.prev_cell = $("<td />").addClass("prev")
										.appendTo(this.instructions_row);
			this.prev_button = $("<button type='button' />").text("prev")
															.attr("aria-label", "Previous step")
															.appendTo(this.prev_cell)
															.on("click", $.proxy(this.prev, this));
			this.content_cell = $("<td />")	.addClass("content")
											.appendTo(this.instructions_row);
			// (Read out each step when it's shown)
			// (Focusable, so that the keyboard can scroll a long step)
			this.instruction_content = $("<div />")	.attr({ role: "region", "aria-label": "Tutorial step", "aria-live": "polite", tabindex: "0" })
													.appendTo(this.content_cell);
			this.next_cell = $("<td />").addClass("next")
										.appendTo(this.instructions_row);
			this.next_button = $("<button type='button' />").text("next")
															.attr("aria-label", "Next step")
															.appendTo(this.next_cell)
															.on("click", $.proxy(this.next, this));

			this.client_socket = this.editor.editor("get_client_socket");
			this.client_socket.on("tutorial", function(data) {
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
				this.prev_cell.hide();
			} else {
				this.prev_cell.show();
			}
			if(page_index === pages.length-1) {
				this.next_button.text("done").attr("aria-label", "Done").on("click.done", $.proxy(function() {
					this.instructions_table.hide();
					$("#obj_nav, #pinned").css("scroll-padding-bottom", "");
				}, this));
			} else {
				this.next_button.text("next").attr("aria-label", "Next step").off("click.done");
			}
			// Scroll whatever gets focus into view above the instructions (which cover the bottom of the editor)
			_.defer($.proxy(function() {
				$("#obj_nav, #pinned").css("scroll-padding-bottom", this.instructions_table.outerHeight() + "px");
			}, this));
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
}(interstate, jQuery));
