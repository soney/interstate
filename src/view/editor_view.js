/*jslint nomen: true, vars: true, white: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var to_func = function (value) {
		return function () { return value; };
	};

	$.widget("red.editor", {
		options: {
			debug_ready: false,
			debug_env: false,
			command_box: false,
			full_window: true,
			server_window: window.opener,
			client_id: ""
		},

		_create: function () {
			if(this.option("full_window")) {
				$("html").addClass("full_window_editor");
			}
			var communication_mechanism;
			if(this.option("server_window") === window) {
				communication_mechanism = new red.SameWindowCommWrapper(this.option("client_id")); 
			} else {
				communication_mechanism = new red.InterWindowCommWrapper(this.option("server_window"), this.option("client_id")); 
			}

			this.client_socket = new red.ProgramStateClient({
				ready_func: this.option("debug_ready"),
				comm_mechanism: communication_mechanism
			}).on("message", function (data) {
				if (data.type === "color") {
					var color = data.value;
				}
			}, this).on("loaded", function (root_client) {
				this.load_viewer(root_client);
			}, this);

			this.element.text("Loading...");
		},

		load_viewer: function (root_client) {
			this.element.html("");
			this.navigator = $("<div />")	.appendTo(this.element)
											.attr("id", "obj_nav");

			this.curr_obj = $("<div />")	.appendTo(this.element)
											.attr("id", "curr_obj");

			var root_col = $("<div />")	.appendTo(this.navigator)
										.column({
											client: root_client
										});
		/*
			$(window).on("keydown", _.bind(function (event) {
				if (event.keyCode === 90 && (event.metaKey || event.ctrlKey)) {
					if (event.shiftKey) {
						this.client_socket.post_command("redo");
					} else {
						this.client_socket.post_command("undo");
					}
					event.stopPropagation();
					event.preventDefault();
				}
			}, this));

			this.element.html("")
						.dom_output({
							root: this.root,
							show_edit_button: false
						});
			if (this.option("debug_env")) {
				this.env.print_on_return = true;
			}
			*/
		},

		_destroy: function () {
			this.client_socket.destroy();
		}
	});

	$.widget("red.column", {
		options: {
			client: false
		},

		_create: function () {
			this.element.addClass("col");
			this.element.text("hi");
			console.log(this.client);
		}
	});
}(red, jQuery));
