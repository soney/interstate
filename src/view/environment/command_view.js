(function(red, $) {
var cjs = red.cjs, _ = red._;
var origin = window.location.protocol + "//" + window.location.host;

$.widget("red.command_view", {
	
	options: { }

	, _create: function() {
		this.input = $("<input />")	.appendTo(this.element)
									.focus()
									.on("keydown", _.bind(function(event) {
										if(event.keyCode === 13) { //Enter
											var val = this.input.val();
											this.on_enter(val);
											this.input.val("");
										}
									}, this));
		this.red_view = $("<div />").addClass("red_view").appendTo(this.element);

		this.env = red.create("environment");
		this.output_view = this.red_view.dom_output({
			root: this.env.get_root_pointer()
		});
		this.env
		/*
				.set("on_enter", _.bind(this.on_enter, this))
				//.set("post_command", _.bind(this.post_command, this))
				.cd("children")
					.set("input", "<stateful>")
					.cd("input")
						.add_transition("INIT", "INIT", "on('keydown', this).when_eq('keyCode', 13)")
						.set("(protos)", "INIT", "dom")
						.set("tag", "INIT", "'input'")
						.on_state("INIT >- INIT", "function(info) {\n" +
							"var target = info.event.red_target;\n" +
							"var dom_attachment = target.call('get_attachment_instance', 'dom');\n" +
							"if(dom_attachment) {\n" +
								"var dom_obj = dom_attachment.get_dom_obj();\n" +
								"var text = dom_obj.value;\n" +
								"on_enter(text);\n" +
							"}\n" +
						"}")
						.set("attr", "<dict>")
						.cd("attr")
							.set("value", "<stateful prop>")
							.set("value", "INIT -> INIT", "''")
						/*
							.up()
						.up()
						/*
					.set("root", "<stateful>")
					.cd("root")
						.rename_state("INIT", "idle")
						.add_state("editing")
						.add_transition("idle", "editing", "on('mousedown', this)")
						.add_transition("editing", "idle", "on('keydown', this).when_eq('keyCode', 13)")
						.set("(protos)", "idle", "dom")
						.set("tag", "idle", "'span'")
						.set("tag", "editing", "'input'")
						.set("text", "idle", "'hello'")
						.set("text", "editing", "''")
						.on_state("editing >- idle", "function(info) {\n" +
							"var target = info.event.red_target;\n" +
							"var dom_attachment = target.call('get_attachment_instance', 'dom');\n" +
							"if(dom_attachment) {\n" +
								"var dom_obj = dom_attachment.get_dom_obj();\n" +
								"var text = dom_obj.value;\n" +
								"var command = new red.ChangeCellCommand({ cell: cell(), str: text });\n" +
								"send_command(command, text);\n" +
							"}\n" +
						"}")
					//	.up()
					//.up()
					//*/
					;
		//window.env = this.env;

		this.output = $("<pre />").addClass("output").appendTo(this.element);
		this.pointer = undefined;
		var current_parent = $(this.output);
		this.logger = {
			log: function() {
				var text = _.toArray(arguments).join(", ");
				var div = $("<div />")	.addClass("log")
										.text(text);
				current_parent.append(div);
			},
			group: function() {
				var text = _.toArray(arguments).join(", ");
				var div = $("<div />")	.addClass("group")
											.text(text);
				var children_div = $("<div />")	.addClass("children")
												.appendTo(div);
				current_parent.append(div);
				current_parent = children_div;
			},
			groupCollapsed: function() {
				var text = _.toArray(arguments).join(", ");
				var div = $("<div />")	.addClass("collapsed group")
											.text(text);
				var children_div = $("<div />")	.addClass("children")
												.appendTo(div);
				current_parent.append(div);
				current_parent = children_div;
			},
			groupEnd: function() {
				current_parent = current_parent.parent().parent();
			}
		};

		window.addEventListener("message", _.bind(function(event) {
			if(event.source === window.opener) {
				var message = event.data;
				var type = message.type;
				if(type === "delta") {
					var stringified_delta = message.value;
					var delta = red.destringify(stringified_delta);

					this.on_delta(delta);
				}
			}
		}, this));
	}

	, _destroy: function() {
		this.input.remove();
	}

	, on_enter: function(value) {
		var tokens = value.split(" ").map(function(token) {
			return token.trim();
		});

		var command_name = tokens[0];
		if(command_name === "cd") {
			var prop_name = tokens[1];
			this.pointer = this.pointer.call("get_prop_pointer", prop_name);
			this.output.html("");
			red.print(this.pointer, this.logger);
		} else if(command_name === "up") {
			this.pointer = this.pointer.pop();
			this.output.html("");
			red.print(this.pointer, this.logger);
		} else if(command_name === "top") {
			this.pointer = this.pointer.slice(0, 1);
			this.output.html("");
			red.print(this.pointer, this.logger);
		} else if(command_name === "set") {
			var prop_name = tokens[1];

			var value = _.isNumber(_.last(tokens)) ? tokens[tokens.length-2] : tokens[tokens.length-1];
			var builtin_info = false, builtin_name;
			var parent_obj = this.pointer.points_at();

			if(_.isString(value)) {
				if(value === "<dict>") {
					value = red.create("dict");
					var direct_protos = red.create("cell", {str: "[]", ignore_inherited_in_contexts: [value]});
					value._set_direct_protos(direct_protos);
				} else if(value === "<stateful>") {
					value = red.create("stateful_obj", undefined, true);
					value.do_initialize({
						direct_protos: red.create("stateful_prop", {check_on_nullify:true, can_inherit: false, ignore_inherited_in_contexts: [value]})
					});
					value.get_own_statechart()	.add_state("INIT")
												.starts_at("INIT");
				} else if(value === "<stateful prop>") {
					value = red.create("stateful_prop");
				} else {
					value = red.create("cell", {str: value});
				}
			}

			if(prop_name[0] === "(" && prop_name[prop_name.length-1] === ")") {
				builtin_name = prop_name.slice(1, prop_name.length-1);

				var builtins = parent_obj.get_builtins();
				for(var i in builtins) {
					var builtin = builtins[i];
					var env_name = builtin._get_env_name();
					if(builtin_name === env_name) {
						builtin_info = builtin;
						break;
					}
				}
			}

			if(tokens.length === 3 || (tokens.length === 4 && _.isNumber(tokens[3]))) {
				// Formats: set <name> <val> <index?>
				if(builtin_info) {
					console.log(builtin_name);
					this.post_command(new red.SetBuiltinCommand({
						parent: parent_obj
						, name: builtin_name
						, value: value
					}));
				} else {
					var index = _.isNumber(_.last(tokens)) ? _.last(tokens) : undefined;
					this.post_command(new red.SetPropCommand({
						parent: this.pointer.points_at(),
						name: prop_name,
						value: value,
						index: index
					}));
				}
			} else if(tokens.length === 4) {
				// Formats: set <name> <state> <val> <index?>
				var index = _.isNumber(_.last(tokens)) ? _.last(tokens) : undefined;
			}

		} else {
			console.log(tokens);
		}
	}

	, on_delta: function(delta) {
		if(delta instanceof red.ProgramDelta) {
			var program_str = delta.get_str();
			this.root = red.destringify(program_str);
			this.root.set("on", red.on_event);
			this.root.set("emit", red.emit);
			this.pointer = red.create("pointer", {stack: [this.root]});
			var root_pointer = this.pointer;
			this.root.set("find", function(find_root) {
				if(arguments.length === 0) {
					find_root = root_pointer;
				}
				return new red.Query({value: find_root});
			});
			this.output.html("");
			red.print(this.pointer, this.logger);
		} else if(delta instanceof red.CommandDelta) {
			var command = delta.get_command();

			if(delta.is_reverse()) {
				command._undo();
			} else {
				command._do();
			}

			this.output.html("");
			red.print(this.pointer, this.logger);
		} else {
			console.error("Unhandled delta", delta);
		}
	}
	
	, post_command: function(command) {
		var stringified_command = red.stringify(command);
		window.opener.postMessage({
			type: "command",
			command: stringified_command
		}, origin);
	}
});

}(red, jQuery));
