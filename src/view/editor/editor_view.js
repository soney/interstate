/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var display;
    var platform = window.navigator.platform;

	var to_func = function (value) {
		return function () { return value; };
	};

	if(platform === "iPhone" || platform === "iPod") {
		display = "phone";
	} else if(platform === "iPad") {
		display = "tablet";
	} else {
		display = "desktop";
	}

	$.widget("red.editor", {
		options: {
			debug_ready: false,
			full_window: true,
			server_window: window.opener,
			client_id: "",
			single_col_navigation: display === "phone" || display === "tablet",
			view_type: display
		},

		_create: function () {
			this.$on_command = $.proxy(this.on_command, this);
			this.element.addClass(this.option("view_type"));

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
											.navigator({
												root_client: root_client,
												single_col: this.option("single_col_navigation")
											})
											.on("command", this.$on_command);


			$(window).on("keydown", _.bind(function (event) {
				if (event.keyCode === 90 && (event.metaKey || event.ctrlKey)) {
					if (event.shiftKey) { this.undo(); }
					else { this.redo(); }
					event.stopPropagation();
					event.preventDefault();
				}
			}, this));
		},

	
		on_command: function(event) {
			var type = event.command_type;
			var client, value, command;

			if(type === "add_property") {
				client = event.client;
				var prop_type;
				if(client.type() === "dict") {
					prop_type = "cell";
				} else {
					prop_type = "stateful_prop";
				}

				if(prop_type === "cell") {
					value = red.create('cell');
				} else if(prop_type === "stateful_prop") {
					value = red.create('stateful_prop');
				}

				command = new red.SetPropCommand({
					parent: { id: to_func(client.obj_id) },
					value: value
				});
				this.client_socket.post_command(command);
			} else if(type === "rename") {
				client = event.client;
				command = new red.RenamePropCommand({
					parent: { id: to_func(client.obj_id) },
					from: event.from_name,
					to: event.to_name
				});
				this.client_socket.post_command(command);
			} else if(type === "unset") {
				client = event.client;
				command = new red.UnsetPropCommand({
					parent: { id: to_func(client.obj_id) },
					name: event.name
				});
				this.client_socket.post_command(command);
			} else {
				console.log("Unhandled type " + type);
			}
		},

		undo: function() {
			this.client_socket.post_command("undo");
		},
		redo: function() {
			this.client_socket.post_command("redo");
		},

		_destroy: function () {
			this.navigator.navigator("destroy");
			this.client_socket.destroy();
		}
	});
}(red, jQuery));
