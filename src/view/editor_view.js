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
			this.load_viewer();
		}, this);
		this.element.text("Loading...");
	}

	, load_viewer: function() {
		this.env.top()

// ===== BEGIN EDITOR ===== 

.set("ambiguous_view", "<stateful>")
.cd("ambiguous_view")
	.set("(protos)", "INIT", "type === 'stateful' ? [dict_view] : type === 'dict' ? [dict_view] : type === 'stateful_prop' ? [stateful_prop_view] : type === 'cell' ? [cell_view] : type === 'statechart' ? [statecuart_view] : [value_view]")
	.set("client")
	.set("client", "INIT", "false")
	.set("type", "INIT", "client && client.type ? client.type() : ''")
	.up()

.set("stateful_prop_view", "<stateful>")
.cd("stateful_prop_view")
	.set("(protos)", "INIT", "[dom]")
	.set("tag")
	.set("tag", "INIT", "'span'")
	.set("child_nodes", "<dict>")
	.cd("child_nodes")
		.set("unset_values", "<stateful>")
		.cd("unset_values")
			.set("(protos)", "INIT", "[unset_cell_view]")
			.set("(copies)", "INIT", "parent.parent.client.get_$('get_states') || 0")
			.set("my_state", "this.my_copy")
			.up()
		.set("values", "<stateful>")
		.cd("values")
			.set("(protos)", "INIT", "[stateful_cell_view]")
			.set("(copies)", "INIT", "parent.parent.client.get_$('get_values')")
			.set("cell", "this.my_copy.value")
			.set("my_state", "this.my_copy.state")
			.set("inherited", "this.my_copy.inherited")
			.up()
		.up()
	.set("attr", "<dict>")
	.cd("attr")
		.set("class", "'stateful_prop'")
		.up()
	.set("css", "<dict>")
	.up()
.set("value_view", "<stateful>")
.cd("value_view")
	.set("(protos)", "INIT", "[dom]")
	.set("tag")
	.set("tag", "INIT", "'span'")
	.set("text")
	.set("text", "INIT", "''")
	.set("attr", "<dict>")
	.cd("attr")
		.set("class", "'&nbsp;'")
		.up()
	.up()
.set("cell_view", "<stateful>")
.cd("cell_view")
	.set("(protos)", "INIT", "[primitive_cell_view]")
	.set("cell", "client.get_$('get_object')")
	.up()
.set("unset_cell_view", "<stateful>")
.cd("unset_cell_view")
	.set("(protos)", "INIT", "[dom]")
	.add_transition("INIT", "INIT", "on('mousedown', this)")
	.set("tag", "INIT", "'span'")
	.set("css", "<dict>")
	.cd("css")
		.set("cursor", "'pointer'")
		.set("position", "'absolute'")
		.set("left", "(parent.parent.parent.parent.parent.parent.statechart_disp.layout_engine.get_x(my_state) - (12/2)) + 'px'")
		.set("width", "'12px'")
		.set("height", "'12px'")
		.set("borderRadius", "'6px'")
		.set("backgroundColor", "'#EEE'")
		.set("border", "'1px solid #777'")
		.up()
	.on_state("INIT -> INIT", "function(event) {\n" +
		"post_command('set_stateful_prop_for_state', parent.parent.client, my_state);\n" +
	"}")
	.up()
.set("stateful_cell_view", "<stateful>")
.cd("stateful_cell_view")
	.set("(protos)", "INIT", "[primitive_cell_view]")
	.set("css", "<dict>")
	.cd("css")
		.set("position", "'absolute'")
		.set("left", "(parent.parent.parent.parent.parent.parent.statechart_disp.layout_engine.get_x(my_state)-(50/2)) + 'px'")
		.set("width", "(parent.parent.parent.parent.parent.parent.statechart_disp.layout_engine.get_width(my_state)) + 'px'")
		//.set("background", "parent.parent.parent.parent.parent.parent.statechart_disp.layout_engine.get_background_css()")
		.up()
	.up()
.set("primitive_cell_view", "<stateful>")
.cd("primitive_cell_view")
	.rename_state("INIT", "idle")
	.add_state("editing")
	.add_transition("idle", "editing", "on('mousedown', this)")
	.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 13)")
	.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 27)")
	.add_transition("editing", "idle", "on('blur', this)")
	.set("(protos)", "idle", "[dom]")
	.set("tag")
	.set("tag", "idle", "'span'")
	.set("tag", "editing", "'input'")
	.set("text")
	.set("text", "idle", "cell.get_$('get_str')")
	.set("attr", "<dict>")
	.cd("attr")
		.set("class", "'raw_cell'")
		.up()
	.on_state("idle -> editing", "function(event) {\n" +
		"var dom_attachment = get_attachment(this, 'dom');\n" +
		"if(dom_attachment) {\n" +
			"var dom_obj = dom_attachment.get_dom_obj();\n" +
			"if(dom_obj) {\n" +
				"dom_obj.focus();\n" +
				"dom_obj.value = text;\n" +
				"dom_obj.select();\n" +
			"}\n" +
		"}\n" +
	"}")
	.on_state("editing >0- idle", "function(event) {\n" +
		"var value = event.target.value;\n" +
		"post_command('set_str', cell, value);\n" +
	"}")
	.up()
.set("statechart_view", "<stateful>")
.cd("statechart_view")
	.set("(protos)", "INIT", "[dom]")
	.set("tag")
	.set("tag", "INIT", "'div'")
	.set("layout_engine", "INIT", "get_layout_engine(client.get_$('get_statecharts'))")
	.set("child_nodes", "<stateful_prop>")
	.set("child_nodes", "INIT", "get_statechart_view(client.get_$('get_statecharts'), layout_engine)")
	.set("attr", "<dict>")
	.cd("attr")
		.set("class", "'statechart'")
		.up()
	.set("css", "<dict>")
	/*
	.cd("css")
		.set("background", "parent.layout_engine ? parent.layout_engine.get_background_css() : ''")
		.up()
		*/
	.up()
.set("dict_view", "<stateful>")
.cd("dict_view")
	.set("(protos)", "INIT", "[dom]")
	.set("child_nodes", "<dict>")
	.cd("child_nodes")
		.set("statechart_disp", "<stateful>")
		.cd("statechart_disp")
			.set("(protos)", "client.type() === 'stateful' ? [statechart_view] : []")
			.up()
		.set("child_disp", "<stateful>")
		.cd("child_disp")
			.set("(protos)", "INIT", "[dom]")
			.set("(copies)", "client.get_$('children')")
			.set("attr", "<dict>")
			.cd("attr")
				.set("class", "'dict_child' + (parent.my_copy.inherited ? ' inherited' : '')")
				.up()
			.set("child_nodes", "<dict>")
			.cd("child_nodes")
				.set("prop_name", "<stateful>")
				.cd("prop_name")
					.rename_state("INIT", "idle")
					.add_state("editing")
					.add_transition("idle", "editing", "on('mousedown', this)")
					.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 13)")
					.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 27)")
					.add_transition("editing", "idle", "on('blur', this)")
					.set("(protos)", "idle", "[dom]")
					.set("tag")
					.set("tag", "idle", "'span'")
					.set("tag", "editing", "'input'")
					.set("text")
					//.set("text", "idle", "parent.parent.my_copy.value && (parent.parent.my_copy.value.type() === 'dict' ||  parent.parent.my_copy.value.type() === 'stateful') ? my_copy.name + ':' : my_copy.name")
					.set("text", "idle", "my_copy.name")
					.set("attr", "<dict>")
					.cd("attr")
						.set("class", "'prop_name'")
						.up()
					.on_state("idle -> editing", "function(event) {\n" +
						"var dom_attachment = get_attachment(this, 'dom');\n" +
						"if(dom_attachment) {\n" +
							"var dom_obj = dom_attachment.get_dom_obj();\n" +
							"if(dom_obj) {\n" +
								"dom_obj.focus();\n" +
								"dom_obj.value = text;\n" +
								"dom_obj.select();\n" +
							"}\n" +
						"}\n" +
					"}")
					.on_state("editing >0- idle", "function(event) {\n" +
						"var value = event.target.value;\n" +
						"if(value === '') {\n" +
							"post_command('unset', parent.parent.parent.parent.client, parent.parent.my_copy);\n" +
						"} else {\n" +
							"post_command('rename', parent.parent.parent.parent.client, parent.parent.my_copy, value);\n" +
						"}\n" +
					"}")
					.up()
				.set("prop_value", "<stateful>")
				.cd("prop_value")
					.set("(protos)", "[dom]")
					.set("tag")
					.set("tag", "INIT", "'span'")
					.set("text")
					.set("text", "INIT", "print_value(parent.parent.my_copy.value)")
					.set("attr", "<dict>")
					.cd("attr")
						.set("class", "'value'")
						.up()
					.up()
				.set("prop_src", "<stateful>")
				.cd("prop_src")
					.set("(protos)", "[ambiguous_view]")
					.set("client", "parent.parent.my_copy.value || false")
					.up()
				.up()
			.up()
		.set("add_prop_disp", "<stateful>")
		.cd("add_prop_disp")
			.set("(protos)", "INIT", "[dom]")
			.set("child_nodes", "<dict>")
			.cd("child_nodes")
				.set("add_prop", "<stateful>")
				.cd("add_prop")
					.set("(protos)", "INIT", "[dom]")
					.add_transition("INIT", "INIT", "on('click', this)")
					.set("text", "INIT", "'+prop'")
					.set("tag", "<stateful_prop>")
					.set("tag", "INIT", "'a'")
					.set("attr", "<dict>")
					.cd("attr")
						.set("href", "<stateful_prop>")
						.set("href", "INIT", "'javascript:void(0)'")
						.up()
					.on_state("INIT -> INIT", "function() {\n" +
						"post_command('add_prop', 'prop', parent.parent.parent.parent.client);\n" +
					"}")
					.up()
				.set("add_obj", "<stateful>")
				.cd("add_obj")
					.set("(protos)", "INIT", "[dom]")
					.add_transition("INIT", "INIT", "on('click', this)")
					.set("text", "INIT", "'+obj'")
					.set("tag", "<stateful_prop>")
					.set("tag", "INIT", "'a'")
					.set("attr", "<dict>")
					.cd("attr")
						.set("href", "<stateful_prop>")
						.set("href", "INIT", "'javascript:void(0)'")
						.up()
					.on_state("INIT -> INIT", "function() {\n" +
						"post_command('add_prop', 'obj', parent.parent.parent.parent.client);\n" +
					"}")
					.up()
				.up()
			.set("attr", "<dict>")
			.cd("attr")
				.set("class", "'add_prop_row'")
				.up()
			.up()
		.up()
	.set("attr", "<dict>")
	.cd("attr")
		.set("class", "'dict'")
		.up()
	.up()
.cd("child_nodes")
	.set("root_name", "<dict>")
	.cd("root_name")
		.set("(protos)", "dom")
		.set("text", "'root'")
		.set("attr", "<dict>")
		.cd("attr")
			.set("class", "'prop_name'")
			.up()
		.up()
	.set("obj", "<stateful>")
	.cd("obj")
		.set("(protos)", "INIT", "[ambiguous_view]")
		.set("client")
		.set("client", "INIT", "root_client")
		.up()
	.up()
.set("get_layout_engine", function(wrappers) {
	if(wrappers) {
		var statecharts = _.map(wrappers, function(wrapper) {
			return red.create_remote_statechart(wrapper);
		});
		var le =  new red.RootStatechartLayoutEngine(statecharts);
		return le;
	}
	return false;
})
.set("get_statechart_view", function(wrappers, le) {
	if(wrappers) {
		var statecharts = _.map(wrappers, function(wrapper) {
			return red.create_remote_statechart(wrapper);
		});
		//var statechart = cobj.get_own_statechart();
		var content = document.createElement("div");
		if(statecharts) {
			var el = document.createElement("span");
			el.style.position = "relative";
			el.style.left = "300px";
			content.appendChild(el);
			var paper = Raphael(el, 0, 0);

			var view = new red.RootStatechartView(statecharts, le, paper);
		} else {
			content.textContent = "(waiting for statechart to load)";
		}
		return content;
	}
})
.set("post_command", _.bind(function(type) {
	if(type === 'set_str') {
		var cwrapper = arguments[1],
			to_text = arguments[2];
		if(cwrapper) {
			var command = new red.ChangeCellCommand({
				cell: { id: to_func(cwrapper.cobj_id) },
				str: to_text
			});
			this.client_socket.post_command(command);
		}
	} else if(type === 'rename') {
		var dict_wrapper = arguments[1],
			prop_info = arguments[2],
			from_name = prop_info.name,
			to_name = arguments[3];
		var command = new red.RenamePropCommand({
			parent: { id: to_func(dict_wrapper.obj_id) },
			from: from_name,
			to: to_name
		});
		this.client_socket.post_command(command);
	} else if(type === 'unset') {
		var dict_wrapper = arguments[1],
			prop_info = arguments[2],
			name = prop_info.name;
		var command = new red.UnsetPropCommand({
			parent: { id: to_func(dict_wrapper.obj_id) },
			name: name
		});
		this.client_socket.post_command(command);
	} else if(type === 'add_prop') {
		var prop_type = arguments[1],
			dict_wrapper = arguments[2];

		var value;
		if(prop_type === 'obj') {
			value = red.create("stateful_obj", undefined, true);
			value.do_initialize({
				direct_protos: red.create("stateful_prop", { can_inherit: false, statechart_parent: value })
			});
			value.get_own_statechart()	.add_state("INIT")
										.starts_at("INIT");
		} else {
			if(dict_wrapper.type() === "stateful") {
				value = red.create('stateful_prop');
			} else {
				value = red.create('cell', {str: ''});
			}
		}

		var command = new red.SetPropCommand({
			parent: { id: to_func(dict_wrapper.obj_id) },
			value: value
		});
		this.client_socket.post_command(command);
	} else if(type === 'set_stateful_prop_for_state') {
		var stateful_prop = arguments[1],
			state = arguments[2];

		var value = red.create('cell', {str: ''});

		var command = new red.SetStatefulPropValueCommand({
			stateful_prop: { id: to_func(stateful_prop.obj_id) },
			state: { id: to_func(state.cobj_id) },
			value: value
		});

		this.client_socket.post_command(command);
	} else {
		console.log(arguments);
	}
}, this))
.set("get_attachment", function(obj, attachment_name) {
	if(obj instanceof red.ContextualDict) {
		var attachment = obj.get_attachment_instance(attachment_name);
		return attachment || false;
	}
	return false;
})
.set("print_value",
"function(client) {\n" +
	"var type = client && client.type ? client.type() : '';\n"+
	"var rv;\n"+

	"if(type === 'cell' || type === 'stateful_prop') {\n"+
		"rv = client.get_$('val');\n"+
	"} else if(type === 'dict' || type === 'stateful') {\n"+
		"return '';\n"+
	"} else if(type === '') {\n"+
	/*
		"if(client === undefined) {\n"+
			"rv = '(undefined)';\n"+
		"} else if(client === null) {\n"+
			"rv = '(null)';\n"+
		"} else if(client === true) {\n"+
			"rv = '(true)';\n"+
		"} else if(client === false) {\n"+
			"rv = '(false)';\n"+
		"} else {\n"+
		*/
			"rv = client;\n"+
			/*
		"}\n"+
		*/
	"}\n"+

	"if(typeof rv === 'string' && rv[0] !== '(') {\n"+
		"return '\"' + rv + '\"';\n"+
	"} else {\n"+
		"return ''+rv;\n"+
	"}\n"+
"}");

var to_func = function(value) {
	return function() { return value; };
};


// ===== END EDITOR ===== 

		$(window).on("keydown", _.bind(function(event) {
			if(event.keyCode === 90 && event.metaKey) {
				if(event.shiftKey) {
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
						root: this.root
					});
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
