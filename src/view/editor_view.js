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
			server_window: window.opener,
			client_id: ""
		},

		_create: function () {
			if (this.options.command_box) {
				this.command_box = $("<input />").prependTo(this.element.parent())
					.focus()
					.on("keydown", _.bind(function (event) {
						if (event.keyCode === 13) {
							var val = this.command_box.val();
							this.command_box.val("");
							this.on_input_command(val);
						}
					}, this));
			}

			this.env = red.create("environment");
			if (this.option("debug_env")) {
				window.output_env = this.env;
			}
			this.root = this.env.get_root();

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
					$("html").css({
						"border-bottom": "10px solid " + color,
						"min-height": "100%",
						"box-sizing": "border-box"
					});
				}
			}, this).on("loaded", function (root_client) {
				this.root.set("root_client", root_client, {literal: true});
				this.load_viewer();
			}, this);

			this.element.text("Loading...");
		},

		load_viewer: function () {
			var post_command = _.bind(function (type, arg1, arg2, arg3) {
				var command, parent, name, from_name,
					to_name, state, value, statechart,
					dict_wrapper, prop_info, new_name,
					transition, str, parent_puppet_id,
					from_state, to_state, statechart_puppet_id;
				if (type === 'set_str') {
					var cwrapper = arg1,
						to_text = arg2;
					if (cwrapper) {
						command = new red.ChangeCellCommand({
							cell: { id: to_func(cwrapper.cobj_id) },
							str: to_text
						});
						this.client_socket.post_command(command);
					}
				} else if (type === 'rename') {
					dict_wrapper = arg1;
					prop_info = arg2;
					from_name = prop_info.name;
					to_name = arg3;
					command = new red.RenamePropCommand({
						parent: { id: to_func(dict_wrapper.obj_id) },
						from: from_name,
						to: to_name
					});
					this.client_socket.post_command(command);
				} else if (type === 'unset') {
					dict_wrapper = arg1;
					prop_info = arg2;
					name = prop_info.name;
					command = new red.UnsetPropCommand({
						parent: { id: to_func(dict_wrapper.obj_id) },
						name: name
					});
					this.client_socket.post_command(command);
				} else if (type === 'add_prop') {
					var prop_type = arg1;
					dict_wrapper = arg2;

					if (prop_type === 'obj') {
						value = red.create("stateful_obj", undefined, true);
						value.do_initialize({
							direct_protos: red.create("stateful_prop", { can_inherit: false, statechart_parent: value })
						});
						/*value.get_own_statechart().add_state("INIT")
							.starts_at("INIT");
							*/
					} else if (prop_type === 'dict') {
						value = red.create("dict", {has_protos: false}, true);
						value.do_initialize({ });
					} else {
						if (dict_wrapper.type() === "stateful") {
							value = red.create('stateful_prop');
						} else {
							//value = red.create('stateful_prop');
							value = red.create('cell', {str: ''});
						}
					}

					command = new red.SetPropCommand({
						parent: { id: to_func(dict_wrapper.obj_id) },
						value: value
					});
					this.client_socket.post_command(command);
				} else if (type === 'set_stateful_prop_for_state') {
					var stateful_prop = arg1;
					state = arg2;
					value = red.create('cell', {str: ''});

					command = new red.SetStatefulPropValueCommand({
						stateful_prop: { id: to_func(stateful_prop.obj_id) },
						state: { id: to_func(state.cobj_id) },
						value: value
					});

					this.client_socket.post_command(command);
				} else if (type === 'set_builtin') {
					var obj = arg1,
						builtin_name = arg2,
						value_str = arg3;
					value = red.create('cell', {str: value_str});

					command = new red.SetBuiltinCommand({
						parent: { id: to_func(obj.obj_id) },
						name: "copies",
						value: value
					});

					this.client_socket.post_command(command);
				} else if (type === 'rename_state') {
					state = arg1;
					new_name = arg2;
					var old_name = state.get_name("parent");
					parent_puppet_id = state.parent().puppet_master_id;
					command = new red.RenameStateCommand({
						statechart: { id: to_func(parent_puppet_id) },
						from: old_name,
						to: new_name
					});
					this.client_socket.post_command(command);
				} else if (type === 'remove_state') {
					state = arg1;
					name = state.get_name("parent");
					parent_puppet_id = state.parent().puppet_master_id;
					command = new red.RemoveStateCommand({
						statechart: { id: to_func(parent_puppet_id) },
						name: name
					});
					this.client_socket.post_command(command);
				} else if (type === 'remove_transition') {
					transition = arg1;
					statechart = transition.root();
					command = new red.RemoveTransitionCommand({
						transition: { id: to_func(transition.puppet_master_id) },
						statechart: { id: to_func(statechart.puppet_master_id) }
					});
					this.client_socket.post_command(command);
				} else if (type === 'set_transition_str') {
					transition = arg1;
					str = arg2;
					var transition_id = transition.puppet_master_id;
					command = new red.SetTransitionEventCommand({
						transition: { id: to_func(transition_id) },
						event: str
					});
					this.client_socket.post_command(command);
				} else if (type === 'add_transition') {
					from_state = arg1;
					to_state = arg2;
					statechart = from_state.root();
					statechart_puppet_id = statechart.puppet_master_id;
					var from_puppet_id = from_state.puppet_master_id,
						to_puppet_id = to_state.puppet_master_id;
					var event = red.create_event("parsed", {str: "(event)", inert: true});
					command = new red.AddTransitionCommand({
						from: { id: to_func(from_puppet_id) },
						to: { id: to_func(to_puppet_id) },
						event: event,
						statechart: { id: to_func(statechart_puppet_id) }
					});
					this.client_socket.post_command(command);
				} else if (type === 'add_state') {
					statechart = arg1;
					statechart_puppet_id = statechart.puppet_master_id; 
					var substates = statechart.get_substates();

					var substates_size = _.size(substates);
					var state_name, make_start;

					if(substates_size === 0) {
						state_name = "init";
						make_start = true;
					} else {
						var orig_state_name = "state_" + substates_size;
						state_name = orig_state_name;
						var i = 1;
						while(_.has(substates, state_name)) {
							state_name = orig_state_name + "_" + i;
						}
						make_start = false;
					}

					command = new red.AddStateCommand({
						statechart: { id: to_func(statechart_puppet_id) },
						name: state_name,
						make_start: make_start
					});

					this.client_socket.post_command(command);
				} else {
					console.log(arguments);
				}
			}, this);

	this.env.top()

	// ===== BEGIN EDITOR ===== 

	.set("ambiguous_view", "<stateful>")
	.cd("ambiguous_view")
		.set("(prototypes)", "(start)", "type === 'stateful' ? [dict_view] : type === 'dict' ? [dict_view] : type === 'stateful_prop' ? [stateful_prop_view] : type === 'cell' ? [cell_view] : type === 'statechart' ? [statecuart_view] : [value_view]")
		.set("client")
		.set("client", "(start)", "false")
		.set("type", "(start)", "client && client.type ? client.type() : ''")
		.up()

	.set("stateful_prop_view", "<stateful>")
	.cd("stateful_prop_view")
		.set("(prototypes)", "(start)", "[dom]")
		.set("tag")
		.set("tag", "(start)", "'span'")
		.set("active_value", "(start)", "client.get_$('active_value')")
		.set("child_nodes", "<dict>")
		.cd("child_nodes")
			.set("unset_values", "<stateful>")
			.cd("unset_values")
				.set("(prototypes)", "(start)", "[unset_cell_view]")
				.set("(copies)", "parent.parent.client.get_$('get_states') || 0")
				.set("my_state", "this.my_copy")
				.up()
			.set("values", "<stateful>")
			.cd("values")
				.set("(prototypes)", "(start)", "my_state ? [stateful_cell_view] : []")
				.set("(copies)", "(start)", "parent.parent.client.get_$('get_values')")
				.set("cell", "this.my_copy.value")
				.set("my_state", "this.my_copy.state")
				.set("inherited", "this.my_copy.inherited")
				.set("active", "active_value.value === cell")
				.up()
			.up()
		.set("attr", "<dict>")
		.cd("attr")
			.set("class", "'stateful_prop'")
			.up()
		.set("css", "<dict>")
		.cd("css")
		/*
			.set("width", "(statechart_disp.layout_engine ? statechart_disp.layout_engine.total_width()-70 : 0) + 'px'")
			.set("height", "'7px'")
			.set("display", "'inline-block'")
			.set("border-bottom", "'1px dashed #CCC'")
			*/
			.up()
		.up()
	.set("value_view", "<stateful>")
	.cd("value_view")
		.set("(prototypes)", "(start)", "[dom]")
		.set("tag")
		.set("tag", "(start)", "'span'")
		.set("text")
		.set("text", "(start)", "''")
		.set("attr", "<dict>")
		.up()
	.set("cell_view", "<stateful>")
	.cd("cell_view")
		.set("(prototypes)", "(start)", "[primitive_cell_view]")
		.set("cell", "client.get_$('get_object')")
		.up()
	.set("unset_cell_view", "<stateful>")
	.cd("unset_cell_view")
		.add_state("INIT")
		.start_at("INIT")
		.set("(prototypes)", "INIT", "[dom]")
		.add_transition("INIT", "INIT", "on('mousedown', this)")
		.set("tag", "INIT", "'span'")
		.set("attr", "<dict>")
		.cd("attr")
			.set("class", "'no_cell'")
			.up()
		.set("css", "<dict>")
		.cd("css")
			.set("cursor", "'pointer'")
			.set("position", "'absolute'")
			.set("left", "(parent.parent.parent.parent.parent.parent.statechart_disp.layout_engine.get_x(my_state) - (12/2)) + 'px'")
			.up()
		.on_state("INIT -> INIT", "function (event) {\n" +
			"post_command('set_stateful_prop_for_state', parent.parent.client, my_state);\n" +
		"}")
		.up()
	.set("stateful_cell_view", "<stateful>")
	.cd("stateful_cell_view")
		.set("(prototypes)", "(start)", "[primitive_cell_view]")
		.set("css", "<dict>")
		.cd("css")
			.set("position", "'absolute'")
			.set("left", "(parent.parent.parent.parent.parent.parent.statechart_disp.layout_engine.get_x(my_state)-(parseInt(width)/2)) + 'px'")
			.set("width", "(parent.parent.parent.parent.parent.parent.statechart_disp.layout_engine.get_width(my_state)) + 'px'")
			.set("border", "active ? '1px solid red' : '1px solid #EEE'")
			//.set("background", "parent.parent.parent.parent.parent.parent.statechart_disp.layout_engine.get_background_css()")
			.up()
		.up()
	.set("primitive_cell_view", "<stateful>")
	.cd("primitive_cell_view")
		.add_state("idle")
		.start_at("idle")
		.add_state("editing")
		.add_transition("idle", "editing", "on('mousedown', this)")
		.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 13)")
		.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 27)")
		.add_transition("editing", "idle", "on('blur', this)")
		.set("(prototypes)", "idle", "[dom]")
		.set("tag")
		.set("tag", "idle", "'span'")
		.set("tag", "editing", "'input'")
		.set("text")
		.set("text", "idle", "cell.get_$('get_str') || ' '")
		.set("attr", "<dict>")
		.cd("attr")
			.set("class", "'raw_cell'")
			.up()
		.on_state("idle -> editing", "function (event) {\n" +
			"var dom_attachment = get_attachment(this, 'dom');\n" +
			"if (dom_attachment) {\n" +
				"var dom_obj = dom_attachment.get_dom_obj();\n" +
				"if (dom_obj) {\n" +
					"dom_obj.focus();\n" +
					"dom_obj.value = text;\n" +
					"dom_obj.select();\n" +
				"}\n" +
			"}\n" +
		"}")
		.on_state("editing >0- idle", "function (event) {\n" +
			"var value = event.target.value;\n" +
			"post_command('set_str', cell, value);\n" +
		"}")
		.up()
	.set("statechart_view", "<stateful>")
	.cd("statechart_view")
		.set("(prototypes)", "(start)", "[dom]")
		.set("tag")
		.set("tag", "(start)", "'div'")
		.set("layout_engine", "(start)", "get_layout_engine(client.get_$('get_statecharts'))")
		.set("child_nodes", "<stateful_prop>")
		.set("child_nodes", "(start)", "get_statechart_view(client.get_$('get_statecharts'), layout_engine)")
		.set("attr", "<dict>")
		.cd("attr")
			.set("class", "'statechart'")
			.up()
		.set("css", "<dict>")
		.up()
	.set("copies_manager", "<stateful>")
	.cd("copies_manager")
		.set("(prototypes)", "[dom]")
		.add_state("idle")
		.start_at("idle")
		.add_state("editing")
		.add_transition("idle", "editing", "on('mousedown', this)")
		.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 13)")
		.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 27)")
		.add_transition("editing", "idle", "on('blur', this)")

		.set("text")
		.set("copies_obj", "client.get_$('copies_obj')")
		.set("copies_str", "copies_obj ? copies_obj.get_$('get_str') : ''")
		.set("copies_values", "client.get_$('get_manifestaitons_value')")

		.set("text", "idle", "client.get_$('is_template') ? 'copies: ' + ( copies_str + ( isNaN(parseInt(copies_str)) ?  ' (' +  client.get_$('instances').length + ')' : '')) : '(1 copy)' ")
		.set("css", "<dict>")
		.set("tag")
		.set("tag", "idle", "'span'")
		.set("tag", "editing", "'input'")
		.cd("css")
			.set("position", "'absolute'")
			.set("left", "'30px'")
			.up()
		.on_state("idle -> editing", "function (event) {\n" +
			"var dom_attachment = get_attachment(this, 'dom');\n" +
			"if (dom_attachment) {\n" +
				"var dom_obj = dom_attachment.get_dom_obj();\n" +
				"if (dom_obj) {\n" +
					"dom_obj.focus();\n" +
					"dom_obj.value = copies_str;\n" +
					"dom_obj.select();\n" +
				"}\n" +
			"}\n" +
		"}")
		.on_state("editing >0- idle", "function (event) {\n" +
			"var value = event.target.value;\n" +
			"post_command('set_builtin', client, 'copies', value);\n" +
		"}")
		.up()
	.set("dict_view", "<stateful>")
	.cd("dict_view")
		.set("(prototypes)", "(start)", "[dom]")
		.set("child_nodes", "<dict>")
		.set("copy_client", "(start)", "client")
		.cd("child_nodes")
			.set("copies_disp", "<stateful>")
			.cd("copies_disp")
				.set("(prototypes)", "(client.type() === 'stateful' && client.get_$('has_copies')) ? [copies_manager] : []")
				.set("dict", "(start)", "client")
				.up()
			.set("statechart_disp", "<stateful>")
			.cd("statechart_disp")
				.set("(prototypes)", "client.type() === 'stateful' ? [statechart_view] : []")
				.up()
			.set("child_disp", "<stateful>")
			.cd("child_disp")
				.set("(prototypes)", "(start)", "[dom]")
				.set("(copies)", "copy_client.get_$('children')")
				.set("attr", "<dict>")
				.cd("attr")
					.set("class", "'dict_child' + (parent.my_copy.inherited ? ' inherited' : '')")
					.up()
				.set("child_nodes", "<dict>")
				.cd("child_nodes")
					.set("prop_name", "<stateful>")
					.cd("prop_name")
						.add_state("idle")
						.start_at("idle")
						.add_state("editing")
						.add_transition("idle", "editing", "on('mousedown', this)")
						.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 13)")
						.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 27)")
						.add_transition("editing", "idle", "on('blur', this)")
						.set("(prototypes)", "idle", "[dom]")
						.set("tag")
						.set("tag", "idle", "'span'")
						.set("tag", "editing", "'input'")
						.set("text")
						.set("text", "idle", "my_copy.name")
						.set("attr", "<dict>")
						.cd("attr")
							.set("class", "'prop_name'")
							.up()
						.on_state("idle -> editing", "function (event) {\n" +
							"var dom_attachment = get_attachment(this, 'dom');\n" +
							"if (dom_attachment) {\n" +
								"var dom_obj = dom_attachment.get_dom_obj();\n" +
								"if (dom_obj) {\n" +
									"dom_obj.focus();\n" +
									"dom_obj.value = text;\n" +
									"dom_obj.select();\n" +
								"}\n" +
							"}\n" +
						"}")
						.on_state("editing >0- idle", "function (event) {\n" +
							"var value = event.target.value;\n" +
							"if (value === '') {\n" +
								"post_command('unset', parent.parent.parent.parent.client, parent.parent.my_copy);\n" +
							"} else {\n" +
								"post_command('rename', parent.parent.parent.parent.client, parent.parent.my_copy, value);\n" +
							"}\n" +
						"}")
						.up()
					.set("prop_value", "<stateful>")
					.cd("prop_value")
						.set("(prototypes)", "[dom]")
						.set("tag")
						.set("tag", "(start)", "'span'")
						.set("text")
						.set("text", "(start)", "print_value(parent.parent.my_copy.value)")
						.set("attr", "<dict>")
						.cd("attr")
							.set("class", "'value'")
							.up()
						.up()
					.set("prop_src", "<stateful>")
					.cd("prop_src")
						.set("(prototypes)", "[ambiguous_view]")
						.set("client", "parent.parent.my_copy.value || false")
						.up()
					.up()
				.up()
			.set("add_prop_disp", "<stateful>")
			.cd("add_prop_disp")
				.add_state("INIT")
				.start_at("INIT")
				.set("(prototypes)", "INIT", "[dom]")
				.add_state("add_field")
				.add_transition("INIT", "add_field", "on('clicked', this.add_field)")
				.add_transition("add_field", "INIT", "on('clicked', this.add_prop, this.add_obj, this.add_dict)")
				.set("add_prop", "<stateful>")
				.cd("add_prop")
					.add_state("INIT")
					.start_at("INIT")
					.set("(prototypes)", "INIT", "[dom]")
					.add_transition("INIT", "INIT", "on('click', this)")
					.set("text", "INIT", "' (Property) '")
					.set("tag", "<stateful_prop>")
					.set("tag", "INIT", "'a'")
					.set("attr", "<dict>")
					.cd("attr")
						.set("href", "<stateful_prop>")
						.set("href", "INIT", "'javascript:void(0)'")
						.up()
					.on_state("INIT -> INIT", "function () {\n" +
						"emit('clicked', this);\n" +
						"post_command('add_prop', 'prop', parent.parent.parent.client);\n" +
					"}")
					.up()
				.set("add_obj", "<stateful>")
				.cd("add_obj")
					.add_state("INIT")
					.start_at("INIT")
					.set("(prototypes)", "INIT", "[dom]")
					.add_transition("INIT", "INIT", "on('click', this)")
					.set("text", "INIT", "' (Object) '")
					.set("tag", "<stateful_prop>")
					.set("tag", "INIT", "'a'")
					.set("attr", "<dict>")
					.cd("attr")
						.set("href", "<stateful_prop>")
						.set("href", "INIT", "'javascript:void(0)'")
						.up()
					.on_state("INIT -> INIT", "function () {\n" +
						"emit('clicked', this);\n" +
						"post_command('add_prop', 'obj', parent.parent.parent.client);\n" +
					"}")
					.up()
				.set("add_dict", "<stateful>")
				.cd("add_dict")
					.add_state("INIT")
					.start_at("INIT")
					.set("(prototypes)", "INIT", "[dom]")
					.add_transition("INIT", "INIT", "on('click', this)")
					.set("text", "INIT", "' (Stateless Object) '")
					.set("tag", "<stateful_prop>")
					.set("tag", "INIT", "'a'")
					.set("attr", "<dict>")
					.cd("attr")
						.set("href", "<stateful_prop>")
						.set("href", "INIT", "'javascript:void(0)'")
						.up()
					.on_state("INIT -> INIT", "function () {\n" +
						"emit('clicked', this);\n" +
						"post_command('add_prop', 'dict', parent.parent.parent.client);\n" +
					"}")
					.up()
				.set("add_field", "<stateful>")
				.cd("add_field")
					.add_state("INIT")
					.start_at("INIT")
					.set("(prototypes)", "INIT", "[dom]")
					.add_transition("INIT", "INIT", "on('click', this)")
					.set("text", "INIT", "'(Add field)'")
					.set("tag", "<stateful_prop>")
					.set("tag", "INIT", "'a'")
					.set("attr", "<dict>")
					.cd("attr")
						.set("href", "<stateful_prop>")
						.set("href", "INIT", "'javascript:void(0)'")
						.up()
					.on_state("INIT -> INIT", "function () {\n" +
						"emit('clicked', this);\n" +
					"}")
					.up()
				.set("child_nodes", "<stateful_prop>")
				.set("child_nodes", "INIT", "[add_field]")
				.set("child_nodes", "add_field", "[add_prop, add_obj]")
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
			.set("(prototypes)", "dom")
			.set("text", "'root'")
			.set("attr", "<dict>")
			.cd("attr")
				.set("class", "'prop_name'")
				.up()
			.up()
		.set("obj", "<stateful>")
		.cd("obj")
			.set("(prototypes)", "(start)", "[ambiguous_view]")
			.set("client")
			.set("client", "(start)", "root_client")
			.up()
		.up()
	.set("get_layout_engine", function (wrappers) {
		if (wrappers) {
			var statecharts = _.map(wrappers, function (wrapper) {
				return red.create_remote_statechart(wrapper);
			});
			var le =  new red.RootStatechartLayoutEngine(statecharts);
			return le;
		}
		return false;
	})
	.set("get_statechart_view", function (wrappers, le) {
		if (wrappers) {
			var statecharts = _.map(wrappers, function (wrapper) {
				return red.create_remote_statechart(wrapper);
			});
			//var statechart = cobj.get_own_statechart();
			var content = window.document.createElement("div");
			if (statecharts) {
				var el = window.document.createElement("div");
				el.style.position = "relative";
				el.style.left = "300px";
				el.style.width="0px";
				content.appendChild(el);
				var paper = new Raphael(el, 0, 0);

				var view = new red.RootStatechartView(statecharts, le, paper);
				view.on("rename_state", function (event) {
					var state = event.state,
						to_name = event.str;
					post_command("rename_state", state, to_name);
				}).on("remove_state", function (event) {
					var state = event.state;
					post_command("remove_state", state);
				}).on("change_transition_event", function (event) {
					var transition = event.transition,
						event_str = event.str;
					post_command("set_transition_str", transition, event_str);
				}).on("remove_transition", function (event) {
					var transition = event.transition;
					post_command("remove_transition", transition);
				}).on("add_transition", function (e) {
					var from = e.from,
						to = e.to;
					post_command("add_transition", from, to);
				}).on("add_state", function (e) {
					var statechart = e.statechart;
					post_command("add_state", statechart);
				});
				$(content).data("pause", _.bind(view.pause, view));
				$(content).data("resume", _.bind(view.resume, view));
			} else {
				content.textContent = "(waiting for statechart to load)";
			}
			return content;
		}
	})
	.set("post_command", post_command)
	.set("get_attachment", function (obj, attachment_name) {
		if (obj instanceof red.ContextualDict) {
			var attachment = obj.get_attachment_instance(attachment_name);
			return attachment || false;
		}
		return false;
	})
	.set("print_value",
	"function (client) {\n" +
		"var type = client && client.type ? client.type() : '';\n"+
		"var rv;\n"+

		"if (type === 'cell' || type === 'stateful_prop') {\n"+
			"rv = client.get_$('val');\n"+
		"} else if (type === 'dict' || type === 'stateful') {\n"+
			"return '';\n"+
		"} else if (type === '') {\n"+
		/*
			"if (client === undefined) {\n"+
				"rv = '(undefined)';\n"+
			"} else if (client === null) {\n"+
				"rv = '(null)';\n"+
			"} else if (client === true) {\n"+
				"rv = '(true)';\n"+
			"} else if (client === false) {\n"+
				"rv = '(false)';\n"+
			"} else {\n"+
			*/
				"rv = client;\n"+
				/*
			"}\n"+
			*/
		"}\n"+

		"if (typeof rv === 'string' && rv[0] !== '(') {\n"+
			"return '\"' + rv + '\"';\n"+
		"} else {\n"+
			"return ''+rv;\n"+
		"}\n"+
	"}");

	// ===== END EDITOR ===== 

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
		},

		_destroy: function () {
			this.remove_message_listener();
			this.client_socket.destroy();
			if (this.command_box) {
				this.command_box.remove();
			}
		}
	});
}(red, jQuery));
