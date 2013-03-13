(function(red, $) {
var cjs = red.cjs, _ = red._;
var origin = window.location.protocol + "//" + window.location.host;

$.widget("red.editor", {
	
	options: {
		debug_ready: false,
		debug_env: false,
		command_box: false
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
			window.env = this.env;
		}
		var root_pointer = this.env.get_root_pointer();
		this.root = root_pointer.root();
		this.element.dom_output({
			root: root_pointer
		});


		this.client_socket = new red.ProgramStateClient({
			ready_func: this.option("debug_ready")
		}).on("message", function(data) {
			if(data.type === "color") {
				var color = data.value;
				$("html").css({
					"border-bottom": "10px solid " + color,
					height: "100%",
					"box-sizing": "border-box"
				});
			}
		}, this).on("root_loaded", function(root) {
			this.root.set("external_root", root, {literal: true});
			this.root.set("external_root_pointer", red.create("pointer", {stack: [root]}), {literal: true});
			this.load_viewer();
			window.eenv = this.client_socket.get_external_env();
		}, this);
	}

	, load_viewer: function() {
		this.env

// ===== BEGIN EDITOR ===== 

.top()
.set("stringify_value", "function(v) {\n" +
"if(red._.isUndefined(v)) { return '(undefined)'; }\n" +
"else if(red._.isNull(v)) { return '(null)'; }\n" +
"else if(red._.isNumber(v) || red._.isBoolean(v)) { return v+''; }\n" +
"else if(red._.isString(v)) { return '\"' + v + '\"'; }\n" +
"else if(red._.isFunction(v)) { return '(func)'; }\n" +
"return v;\n" +
"\n" +
"}")
.set("ambiguous_view", "<stateful>")
.cd("ambiguous_view")
	.set("(protos)", "INIT", "(pointer && pointer instanceof red.Pointer) ? (pointer.points_at() instanceof red.Dict ? [dict_view] : [dom]) : [dom]")
	.up()
.set("dict_view", "<stateful>")
.cd("dict_view")
	.set("(protos)", "INIT", "[dom]")
	.set("dict", "INIT", "pointer.points_at()")
	.set("children", "<dict>")
	.cd("children")
		.set("child_view", "<stateful>")
		.cd("child_view")
			.set("(manifestations)", "dict.get_prop_names(pointer)")
			.set("(protos)", "INIT", "[dom]")
			.set("name", "INIT", "basis")
			.set("value", "INIT", "dict.prop_val(name, pointer)")
			.set("prop_pointer", "INIT", "dict.get_prop_pointer(name, pointer)")
			.set("children", "<dict>")
			.cd("children")
				.set("prop_name_view", "<stateful>")
				.cd("prop_name_view")
					.set("(protos)", "INIT", "[dom]")
					.set("tag", "<stateful_prop>")
					.set("tag", "INIT", "'span'")
					.set("text", "<stateful_prop>")
					.set("text", "INIT", "name")
					.set("attr", "<dict>")
					.cd("attr")
						.set("class", "INIT", "'prop_name'")
						.up()
					.up()
				.set("prop_value_view", "<stateful>")
				.cd("prop_value_view")
					.set("(protos)", "INIT", "[dom]")
					.set("tag", "<stateful_prop>")
					.set("tag", "INIT", "'span'")
					.set("text", "<stateful_prop>")
					.set("text", "INIT", "stringify_value(value)")
					.set("attr", "<dict>")
					.cd("attr")
						.set("class", "INIT", "'prop_value'")
						.up()
					.up()
				.set("prop_src_view", "<stateful>")
				.cd("prop_src_view")
					.set("pointer", "<stateful_prop>")
					.set("pointer", "INIT", "prop_pointer")
					.set("(protos)", "INIT", "ambiguous_view")
				.up()
			.up()
		.up()
	.up()
.cd("children")
	.set("obj", "<stateful>")
	.cd("obj")
		.set("pointer", "<stateful_prop>")
		.set("pointer", "INIT", "external_root_pointer")
		.set("(protos)", "INIT", "ambiguous_view")
		.up()
	.up()
;


// ===== END EDITOR ===== 
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
