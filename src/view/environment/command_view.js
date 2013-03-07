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
		var tokens = aware_split(value).map(function(token) {
			return token.trim();
		});
		var command;
		if(value === "undo" || value === "redo") {
			command = value;
		} else {
			command = this.external_env[tokens[0]].apply(this.external_env, _.rest(tokens));
		}
		this.post_command(command);
		this.output.html("");
		this.external_env.print(this.logger);
	}

	, on_delta: function(delta) {
		if(delta instanceof red.ProgramDelta) {
			var program_str = delta.get_str();
			this.external_env = red.create("environment", {
				root: red.destringify(program_str)
			});
			this.external_env.return_commands = true;
			
			this.output.html("");
			this.external_env.print(this.logger);
		} else if(delta instanceof red.CommandDelta) {
			var command = delta.get_command();
			if(command === "undo") {
				this.external_env.undo();
			} else if(command === "redo") {
				this.external_env.redo();
			} else {
				this.external_env._do(command);
			}

			this.output.html("");
			this.external_env.print(this.logger);
		} else {
			console.error("Unhandled delta", delta);
		}
	}
	
	, post_command: function(command) {
		var stringified_command;
		if(command === "undo" || command === "redo") {
			stringified_command = command;
		} else {
			stringified_command = red.stringify(command);
		}
		window.opener.postMessage({
			type: "command",
			command: stringified_command
		}, origin);
	}
	, get_current_statechart: function() {
		var statechart;
		var SOandC = red.find_stateful_obj_and_context(this.pointer);
		var owner = SOandC.stateful_obj;
		statechart = owner.get_own_statechart();
		if(!statechart) {
			throw new Error("Could not find statechart");
		}
		return statechart;
	}
});

}(red, jQuery));
