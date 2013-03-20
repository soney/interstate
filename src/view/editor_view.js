(function(red, $) {
var cjs = red.cjs, _ = red._;

$.widget("red.editor", {
	
	options: {
		debug_ready: false,
		debug_env: false,
		command_box: false,
		server_window: window.opener
	}

	, _create: function() {
		if(this.options.command_box) {
			this.command_box = $("<input />")	.prependTo(this.element.parent())
												.focus()
												.on("keydown", _.bind(function(event) {
													if(event.keyCode === 13) {
														var val = this.command_box.val();
														this.command_box.val("");
														this.on_input_command(val);
													}
												}, this));
		}

		this.env = red.create("environment");
		if(this.option("debug_env")) {
			window.output_env = this.env;
		}
		this.root = this.env.get_root();
		this.element.dom_output({
			root: this.root
		});

		this.client_socket = new red.ProgramStateClient({
			ready_func: this.option("debug_ready"),
			server_window: this.option("server_window")
		}).on("message", function(data) {
			if(data.type === "color") {
				var color = data.value;
				$("html").css({
					"border-bottom": "10px solid " + color,
					"min-height": "100%",
					"box-sizing": "border-box"
				});
			}
		}, this).on("loaded", function(root_client) {
			this.root.set("root_client", root_client, {literal: true});
			window.rc = root_client;
			this.load_viewer();
		}, this);
	}

	, load_viewer: function() {
		this.env.top()

// ===== BEGIN EDITOR ===== 

.set("ambiguous_view", "<stateful>")
.cd("ambiguous_view")
	.set("(protos)", "INIT", "type === 'stateful' ? [dict_view] : type === 'dict' ? [dict_view] : type === 'stateful_prop' ? [stateful_prop_view] : type === 'cell' ? [cell_view] : [value_view]")
	.set("client")
	.set("client", "INIT", "false")
	.set("type", "INIT", "client && client.type ? client.type() : ''")
	.up()
.set("stateful_prop_view", "<stateful>")
.cd("stateful_prop_view")
	.set("(protos)", "INIT", "[dom]")
	.set("tag")
	.set("tag", "INIT", "'span'")
	.set("text")
	.set("text", "INIT", "client.get('val')")
	.up()
.set("value_view", "<stateful>")
.cd("value_view")
	.set("(protos)", "INIT", "[dom]")
	.set("tag")
	.set("tag", "INIT", "'span'")
	.set("text")
	.set("text", "INIT", "client")
	.up()
.set("cell_view", "<stateful>")
.cd("cell_view")
	.set("(protos)", "INIT", "[dom]")
	.set("tag")
	.set("tag", "INIT", "'span'")
	.set("text")
	.set("text", "INIT", "client.get('val')")
	.up()
.set("dict_view", "<stateful>")
.cd("dict_view")
	.set("(protos)", "INIT", "[dom]")
	.set("children", "<dict>")
	.cd("children")
		.set("child_disp", "<stateful>")
		.cd("child_disp")
			.set("(protos)", "INIT", "[dom]")
			.set("(manifestations)", "client.get('children')")
			.set("children", "<dict>")
			.cd("children")
				.set("prop_name", "<stateful>")
				.cd("prop_name")
					.set("(protos)", "[dom]")
					.set("tag")
					.set("tag", "INIT", "'span'")
					.set("text")
					.set("text", "INIT", "basis.name")
					.up()
				.set("prop_value", "<stateful>")
				.cd("prop_value")
					.set("(protos)", "[ambiguous_view]")
					.set("client", "parent.parent.basis.value || false")
					.up()
				.up()
			.up()
		.up()
	.up()
.cd("children")
	.set("obj", "<stateful>")
	.cd("obj")
		.set("(protos)", "INIT", "[ambiguous_view]")
		.set("client")
		.set("client", "INIT", "root_client")


// ===== END EDITOR ===== 
this.env.print();
		if(this.option("debug_env")) {
			this.env.print_on_return = true;
		}
	}

	, _destroy: function() {
		this.remove_message_listener();
		this.client_socket.destroy();
		if(this.command_box) {
			this.command_box.remove();
		}
	}

	, on_input_command: function(value) {
		var tokens = aware_split(value).map(function(token) {
			return token.trim();
		});
		var command;
		if((["undo", "redo", "reset"]).indexOf(tokens[0]) >= 0) {
			command = tokens[0];
			this.client_socket.post_command(command);
		} else {
			var external_env = this.client_socket.get_external_env();
			command = external_env[tokens[0]].apply(external_env, _.rest(tokens));
			if(command instanceof red.Command) {
				this.client_socket.post_command(command);
			}
		}
	}
});

}(red, jQuery));
