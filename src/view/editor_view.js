(function(red, $) {
var cjs = red.cjs, _ = red._;
var origin = window.location.protocol + "//" + window.location.host;

$.widget("red.editor", {
	
	options: { }

	, _create: function() {
		this.add_message_listener();
		this.env = red.create("environment");
		var root_pointer = this.env.get_root_pointer();
		this.root = root_pointer.root();
		this.element.dom_output({
			root: root_pointer
		});
	}

	, load_viewer: function() {
		this.env

.top()
.set("dict_view", "<stateful>")
.cd("dict_view")
	.set("(protos)", "INIT", "[dom]")
	.set("text", "<stateful_prop>")
	.set("text", "INIT", "'hello'")
	.up()
;

	}

	, add_message_listener: function() {
		this.$on_message = _.bind(function(event) {
			if(event.source === window.opener) {
				var message = event.data;
				var type = message.type;
				if(type === "delta") {
					var stringified_delta = message.value;
					var delta = red.destringify(stringified_delta);

					this.on_delta(delta);
				} else {
					console.error("Unhandled message type '" + type + "' for ", message);
				}
			}
		}, this);
		window.addEventListener("message", this.$on_message);
	}
	, remove_message_listener: function() {
		window.removeEventListener("message", this.$on_message);
	}

	, _destroy: function() {
		this.remove_message_listener();
	}

	, on_delta: function(delta) {
		if(delta instanceof red.ProgramDelta) {
			var external_root = delta.get_root();
			this.external_env = red.create("environment", {
				root: external_root
			});
			this.external_env.return_commands = true;
			this.root.set("external_root", external_root, {literal: true});
			this.env.print();
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
