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
			window.env = this.env;
		}
		this.element.dom_output({
			root: this.env.get_root()
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
		}, this).on("loaded", function() {
		/*
			this.root.set("external_root", root, {literal: true});
			this.root.set("external_root_pointer", red.create("pointer", {stack: [root]}), {literal: true});
			*/
			this.load_viewer();
		}, this);
	}

	, load_viewer: function() {
		this.env

// ===== BEGIN EDITOR ===== 

/*
.top()
.set("stringify_value", "function(v) {\n" +
"if(red._.isUndefined(v)) { return '(undefined)'; }\n" +
"else if(red._.isNull(v)) { return '(null)'; }\n" +
"else if(red._.isNumber(v) || red._.isBoolean(v)) { return v+''; }\n" +
"else if(red._.isString(v)) { return '\"' + v + '\"'; }\n" +
"else if(red._.isFunction(v)) { return '(func)'; }\n" +
"else if(v instanceof red.Pointer) { return stringify_value(v.points_at()); }\n" +
"else if(v instanceof red.PointerObject) { return stringify_value(v.get_pointer()); }\n" +
"else if(v instanceof red.Dict) { return v.uid; }\n" +
"return v;\n" +
"\n" +
"}")
.set("ambiguous_view", "<stateful>")
.cd("ambiguous_view")
	.set("(protos)", "INIT", "(obj instanceof red.StatefulObj ? [dict_view] : (obj instanceof red.Dict ? [dict_view] : (obj instanceof red.StatefulProp ? [stateful_prop_view] : (obj instanceof red.Cell ? [cell_view] : []))))")
	.set("obj", "INIT", "pointer ? pointer.points_at() : false")
	.up()
.set("cell_view", "<stateful>")
.cd("cell_view")
	.rename_state("INIT", "idle")
	.add_state("editing")
	.add_transition("idle", "editing", "on('mousedown', this)")
	.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 13)") //enter
	.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 27)") //esc
	.set("(protos)", "idle", "[dom]")
	.set("text")
	.set("text", "idle", "obj.get_str()")
	.set("tag")
	.set("tag", "idle", "'span'")
	.set("tag", "editing", "'input'")
	.set("attr", "<dict>")
	.cd("attr")
		.set("type", "editing", "'text'")
		.set("value", "idle->editing", "obj.get_str()")
		.up()
	.on_state("editing -0> idle", "function(event) {\n" +
		"var text = event.target.value;\n" +
		"var command = new red.ChangeCellCommand({\n" +
			"cell: obj,\n" +
			"str: text\n" +
		"});\n" +
		"post_command(command);\n" +
		"\n" +
	"}")
	.up()
.set("stateful_prop_view", "<stateful>")
.cd("stateful_prop_view")
	.set("(protos)", "INIT", "[dom]")
	.set("tag")
	.set("tag", "INIT", "'span'")
	.set("children", "<dict>")
	.cd("children")
		.set("cview", "<stateful>")
		.cd("cview")
			.set("(manifestations)", "parent.parent.obj.get_value_specs(pointer)")
			.set("(protos)", "[ambiguous_view]")
			.set("obj", "basis.value")
			.up()
		.up()
	.up()
.set("statechart_view", "<stateful>")
.cd("statechart_view")
	.set("(protos)", "INIT", "[dom]")
	.set("tag")
	.set("tag", "INIT", "'div'")
	.set("children", "<dict>")
	.cd("children")
		.set("root_state", "<stateful>")
		.cd("root_state")
			.set("state", "INIT", "statechart")
			.set("(protos)", "INIT", "[state_view]")
			.up()
		.up()
	.up()
.set("state_view", "<stateful>")
.cd("state_view")
	.set("(protos)", "INIT", "[dom]")
	.set("tag")
	.set("tag", "INIT", "'span'")
	.set("children", "<dict>")
	.cd("children")
		.set("name_view", "<dict>")
		.cd("name_view")
			.set("(protos)", "[dom]")
			.set("tag")
			.set("tag", "'span'")
			.set("text")
			.set("text", "state.get_name('parent')")
			.up()
		.set("substate_view", "<stateful>")
		.cd("substate_view")
			.set("(manifestations)", "parent.parent.state.get_substates()")
			.set("state", "INIT", "basis")
			.set("(protos)", "INIT", "state ? [state_view] : []")
			.up()
		.up()
	.up()
.set("dict_view", "<stateful>")
.cd("dict_view")
	.set("(protos)", "INIT", "[dom]")
	.set("dict", "INIT", "pointer.points_at()")
	.set("children", "<dict>")
	.cd("children")
		.set("scv", "<stateful>")
		.cd("scv")
			.set("(protos)", "INIT", "dict instanceof red.StatefulObj ? [statechart_view] : []")
			.set("statechart", "INIT", "dict.get_own_statechart()")
			.up()
		.set("child_view", "<stateful>")
		.cd("child_view")
			.set("(manifestations)", "dict.get_prop_names(pointer)")
			.set("(protos)", "INIT", "[dom]")
			.set("name", "INIT", "basis")
			.set("value", "INIT", "dict.prop_val(name, pointer)")
			.set("prop_pointer", "INIT", "dict.get_prop_pointer(name, pointer)")
			.set("children", "<dict>")
			.cd("children")
				.set("prop_ops", "<stateful>")
				.cd("prop_ops")
					.set("(protos)", "INIT", "[dom]")
					.set("tag", "<stateful_prop>")
					.set("tag", "INIT", "'span'")
					.set("children", "<dict>")
					.cd("children")
						.set("remove", "<stateful>")
						.cd("remove")
							.set("(protos)", "INIT", "[dom]")
							.add_transition("INIT", "INIT", "on('click', this)")
							.set("tag")
							.set("tag", "INIT", "'a'")
							.set("text")
							.set("text", "INIT", "'(-)'")
							.set("attr", "<dict>")
							.cd("attr")
								.set("href", "'javascript:void(0)'")
								.up()
							.on_state("INIT -> INIT", "function() {\n" +
							"var command = new red.UnsetPropCommand({\n" +
								"parent: dict,\n" +
								"name: name\n" +
							"});\n" +
							"post_command(command);\n" +
							"\n" +
							"}")
							.up()
						.up()
					.up()
				.set("prop_name_view", "<stateful>")
				.cd("prop_name_view")
					.rename_state("INIT", "idle")
					.add_state("renaming")
					.add_transition("idle", "renaming", "on('mousedown', this)")
					.add_transition("renaming", "idle", "on('keydown', this).when_eq('keyCode', 13)") //enter
					.add_transition("renaming", "idle", "on('keydown', this).when_eq('keyCode', 27)") //esc
					.set("(protos)", "idle", "[dom]")
					.set("text")
					.set("text", "idle", "name")
					.set("tag")
					.set("tag", "idle", "'span'")
					.set("tag", "renaming", "'input'")
					.set("attr", "<dict>")
					.cd("attr")
						.set("type", "renaming", "'text'")
						.set("value", "idle->renaming", "name")
						.up()
					.on_state("renaming -0> idle", "function(event) {\n" +
						"var text = event.target.value;\n" +
						"var command = new red.RenamePropCommand({\n" +
							"from: name,\n" +
							"to: text,\n" +
							"parent: dict\n" +
						"});\n" +
						"post_command(command);\n" +
						"\n" +
					"}")
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
					.set("pointer", "INIT", "parent.parent.prop_pointer")
					.set("(protos)", "INIT", "[ambiguous_view]")
					.set("css", "<dict>")
					.cd("css")
						.set("padding-left", "'25px'")
						.up()
					.up()
				.up()
			.up()
		.set("dict_ops", "<stateful>")
		.cd("dict_ops")
			.set("(protos)", "INIT", "[dom]")
			.add_state("hover")
			.add_transition("INIT", "hover", "on('mouseover', this)")
			.add_transition("hover", "INIT", "on('mouseout', types)")
			.set("tag")
			.set("tag", "INIT", "'div'")
			.set("add_prop_button", "<stateful>")
			.cd("add_prop_button")
				.set("(protos)", "INIT", "[dom]")
				.set("tag")
				.set("tag", "INIT", "'a'")
				.set("text", "<stateful_prop>")
				.set("text", "INIT", "'(+ add property)'")
				.set("attr", "<dict>")
				.cd("attr")
					.set("href", "'javascript:void(0)'")
					.up()
				.up()
			.set("types", "<stateful>")
			.cd("types")
				.set("(protos)", "INIT", "[dom]")
				.set("tag")
				.set("tag", "INIT", "'div'")
				.set("children", "<dict>")
				.cd("children")
					.set("cell", "<stateful>")
					.cd("cell")
						.set("(protos)", "INIT", "[dom]")
						.set("tag")
						.set("tag", "INIT", "'a'")
						.set("text")
						.set("text", "INIT", "'cell'")
						.set("attr", "<dict>")
						.cd("attr")
							.set("href", "'javascript:void(0)'")
							.set("name", "'cell'")
							.up()
						.up()
					.set("stateful_prop", "<stateful>")
					.cd("stateful_prop")
						.set("(protos)", "INIT", "[dom]")
						.set("tag")
						.set("tag", "INIT", "'a'")
						.set("text")
						.set("text", "INIT", "'stateful_prop'")
						.set("attr", "<dict>")
						.cd("attr")
							.set("href", "'javascript:void(0)'")
							.set("name", "'stateful_prop'")
							.up()
						.up()
					.set("dict", "<stateful>")
					.cd("dict")
						.set("(protos)", "INIT", "[dom]")
						.set("tag")
						.set("tag", "INIT", "'a'")
						.set("text")
						.set("text", "INIT", "'dict'")
						.set("attr", "<dict>")
						.cd("attr")
							.set("href", "'javascript:void(0)'")
							.set("name", "'dict'")
							.up()
						.up()
					.set("stateful_obj", "<stateful>")
					.cd("stateful_obj")
						.set("(protos)", "INIT", "[dom]")
						.set("tag")
						.set("tag", "INIT", "'a'")
						.set("text")
						.set("text", "INIT", "'stateful_obj'")
						.set("attr", "<dict>")
						.cd("attr")
							.set("href", "'javascript:void(0)'")
							.set("name", "'stateful_obj'")
							.up()
						.up()
					.up()
				.up()
			.set("children", "<stateful_prop>")
			.set("children", "INIT", "[add_prop_button]")
			.set("children", "hover", "[add_prop_button, types]")
			.add_transition("hover", "INIT", "on('click', this)")
			.on_state("hover -1> INIT", "function(event) {\n" +
			"var creating_type = event.target.name\n" +
			"var prop_name = 'prop_' + dict.get_prop_names(pointer).length;\n" +
			"var orig_prop_name = prop_name;\n" +
			"var i = 0;\n" +
			"while(dict._has_prop(prop_name, pointer)) {\n" + 
			"prop_name = orig_prop_name+'_'+i;\n" +
			"i++\n" +
			"}\n" +
			"var command = new red.SetPropCommand({\n" +
			"parent: dict,\n" + 
			"name: prop_name,\n" + 
			"value: red.create(creating_type)\n" + 
			"});\n" + 
			"post_command(command);\n" +
			"}")
			.up()
		.up()
	.up()
.cd("children")
	.set("obj", "<stateful>")
	.cd("obj")
		.set("pointer", "<stateful_prop>")
		.set("pointer", "INIT", "external_root_pointer")
		.set("(protos)", "INIT", "ambiguous_view")
		.set("css", "<dict>")
		.cd("css")
			.set("font-family", "'Courier New, monospace'")
			.set("font-size", "'0.8em'")
			.up()
		.up()
	.up()
.set("post_command", _.bind(function(command) {
	this.client_socket.post_command(command);
}, this))
;
*/


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
