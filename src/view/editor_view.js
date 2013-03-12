(function(red, $) {
var cjs = red.cjs, _ = red._;
var origin = window.location.protocol + "//" + window.location.host;

$.widget("red.editor", {
	
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
		if(value === "undo" || value === "redo" || value === "reset") {
			command = value;
			this.post_command(command);
		} else {
			command = this.external_env[tokens[0]].apply(this.external_env, _.rest(tokens));
			if(command instanceof red.Command) {
				this.post_command(command);
			}
		}

		this.output.html("");
		this.external_env.print(this.logger);
	}

	, on_delta: function(delta) {
		if(delta instanceof red.ProgramDelta) {
			var root = delta.get_root();
			this.external_env = red.create("environment", {
				root: root
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
			} else if(command === "reset") {
				this.external_env.reset();
			} else {
				this.external_env._do(command);
			}

			this.output.html("");
			this.external_env.print(this.logger);
		} else if(delta instanceof red.CurrentStateDelta) {
			var state_info = delta.get_state_info();
			_.each(state_info, function(si) {
				var substate = si.substate,
					superstate = si.superstate;
				superstate.set_active_substate(substate);
			});
		} else if(delta instanceof red.TransitionFiredDelta) {
			var transition = delta.get_transition();
			if(transition) {
				transition.fire();
			} else {
				console.error("Could not find transition");
			}
		} else if(delta instanceof red.CurrentValuesDelta) {
			console.log(delta);
		} else {
			console.error("Unhandled delta", delta);
		}
	}
	
	, post_command: function(command) {
		var stringified_command;
		if(command === "undo" || command === "redo" || command === "reset") {
			stringified_command = command;
		} else {
			stringified_command = red.stringify(command);
		}
		window.opener.postMessage({
			type: "command",
			command: stringified_command
		}, origin);
	}
});

}(red, jQuery));
