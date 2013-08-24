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
			this.env = new red.Environment();
			this.app = $("<div />")	.appendTo(this.element)
									.dom_output({
										root: this.env.get_root(),
										editor_url: "tutorial_editor.html"
									});
			//hide the output for now
			$("svg").hide();
			this.get_started_message = $("<div />")	.html("Click <span style='font-variant: small-caps'>edit</span> in the top right of this window to start the tutorial")
													.appendTo(this.element)
													.css({
														"font-size": "2em"
													});
			this.$on_editor_open = $.proxy(this.on_editor_open, this);
			this.app.on("editor_open", this.$on_editor_open);
		},
		on_editor_open: function() {
			this.app.off("editor_open", this.$on_editor_open);
			this.get_started_message.remove();
			$("svg").show();

			this.server_socket = this.app.dom_output("get_server_socket");
			this.server_socket.on("message", function(data) {
				if(data.type === "tutorial") {
					if(data.subtype === "page_set") {
						this.show_page_no(data.page_index);
					} else if(data.subtype === "inter_page") {
						if(this.page) {
							if(_.isFunction(this.page.runtime.on_message)) {
								
							}
						}
					}
				}
			}, this);
		},
		_destroy: function() {
			this.app.running_app("destroy").remove();
		},
		show_page_no: function(page_index) {
			var options;
			if(this.page) {
				options = this.page.runtime;
				if(_.isFunction(options.on_exit)) {
					options.on_exit.call(this, $, _.bind(this.post_to_client, this));
				}
			}

			var pages = this.option("pages");
			this.page = pages[page_index];
			options = this.page.runtime;

			if(_.isFunction(options.on_enter)) {
				options.on_enter.call(this, $, _.bind(this.post_to_client, this));
			}
		},
		post_to_client: function(message) {
			this.server_socket.post({
				type: "tutorial",
				subtype: "inter_page",
				message: message
			});
		}
	});
}(red, jQuery));
