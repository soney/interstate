/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	$.widget("interstate.tutorial_running_app", {
		options: {
			pages: [],
			page_no: 0
		},
		_create: function() {
			this.env = new ist.Environment();
			this.app = $("<div />")	.appendTo(this.element)
									.dom_output({
										root: this.env.get_root(),
										editor_url: "tutorial_editor.html"
									});
			//hide the output for now
			$("svg").hide();
			this.get_started_message = $("<div />")	.html("click <span style='font-variant: small-caps'>edit</span> in the top right corner <br /> of this window to start the tutorial")
													.appendTo(this.element)
													.css({
														"font-size": "2em",
														"text-align": "center",
														"font-family": '"HelveticaNeue-UltraLight", "Helvetica Neue Ultra Light", "Helvetica Neue", Helvetica',
														"font-weight": "100",
														"padding-top": "30px",
														"color": "#464646"
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
				if(options && _.isFunction(options.on_exit)) {
					options.on_exit.call(this, $, _.bind(this.post_to_client, this));
				}
			}

			var pages = this.option("pages");
			this.page = pages[page_index];
			options = this.page.runtime;

			if(options && _.isFunction(options.on_enter)) {
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
}(interstate, jQuery));
