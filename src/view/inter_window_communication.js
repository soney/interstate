(function(red, $) {
var cjs = red.cjs, _ = red._;

var origin = window.location.protocol + "//" + window.location.host;

red.ProgramStateServer = function(options) {
	able.make_this_listenable(this);
	this.root = options.root;
	this.client_window = options.client_window;
	this.connected = false;

	var close_check_interval = window.setInterval(_.bind(function() {
		if(this.client_window.closed) {
			window.clearInterval(close_check_interval);
			this.on_client_closed();
		}
	}, this), 200);

	$(this.client_window).on("beforeunload", _.bind(function() {
		window.clearInterval(close_check_interval);
		this.on_client_closed();
	}, this));
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);

	proto.on_message = function(event) {
		//var event = jq_event.originalEvent;
		if(event.source === this.client_window) {
			var data = event.data;
			if(data === "ready") {
				this.post_delta(new red.ProgramDelta({
					root_pointer: this.option("root")
				}));
				this._add_state_listeners();
				this.post_delta(new red.CurrentStateDelta({
					states: this._states
				}));
				this.post_delta(new red.CurrentValuesDelta({
					root_pointer: this.option("root")
				}));
				this._emit("connected");
			} else {
				var type = data.type;
				if(type === "command") {
					var stringified_command = data.command;
					if((["undo", "redo", "reset"]).indexOf(stringified_command) >= 0) {
						this._emit("command", stringified_command);
					} else {
						var command = red.destringify(stringified_command);
						this._emit("command", command);
					}
				}
			}
		}
	};
	proto.add_state_listeners = function() {
		var on_transition_fire = _.bind(function(info) {
			var transition = info.target;

			this.post_delta(new red.TransitionFiredDelta({
				transition: transition,
				event: info.event
			}));
		}, this);

		this.register_state = function(state) { };
		this.unregister_state = function(state) { };

		this.register_transition = function(transition) {
			transition.on("fire", on_transition_fire);
		};
		this.unregister_transition = function(transition) {
			transition.off("fire", on_transition_fire);
		};

		this._states = [];
		this._transitions = [];
		red.each_registered_obj(function(obj, uid) {
			if(obj instanceof red.Statechart) {
				this._states.push(obj);
				this.register_state(obj);
			} else if(obj instanceof red.StatechartTransition) {
				this._transitions.push(obj);
				this.register_transition(obj);
			}
		}, this);

		this.$on_uid_registered = function(uid, obj) {
			if(obj instanceof red.Statechart) {
				this._states.push(obj);
				this.register_state(obj);
			} else if(obj instanceof red.StatechartTransition) {
				this._transitions.push(obj);
				this.register_transition(obj);
			}
		};

		this.$on_uid_unregistered = function(uid, obj) {
			if(obj instanceof red.Statechart) {
				var index = this._states.indexOf(obj);
				if(index >= 0) {
					this.unregister_state(obj);
					this._states.splice(index, 1);
				}
			} else if(obj instanceof red.StatechartTransition) {
				var index = this._transitions.indexOf(obj);
				if(index >= 0) {
					this.unregister_transition(obj);
					this._transitions.splice(index, 1);
				}
			}
		}

		red.on("uid_registered", this.$on_uid_registered, this);
		red.on("uid_unregistered", this.$on_uid_unregistered, this);
	};
	proto.remove_state_listeners = function() {
		red.off("uid_registered", this.$on_uid_registered);
		red.off("uid_unregistered", this.$on_uid_unregistered);

		if(this._states) {
			for(var i = 0; i<this._states.length; i++) {
				this.unregister_state(this._states[i]);
			}
			delete this._states;
		}

		if(this._transitions) {
			for(var i = 0; i<this._transitions.length; i++) {
				this.unregister_transition(this._transitions[i]);
			}
			delete this._transitions;
		}
	}

	proto.post = function(message) {
		if(this.connected) {
			this.client_window.postMessage(message, origin);
		} else {
			throw new Error("Trying to send a message to a disconnected client");
		}
	};

	proto.post_delta = function(delta) {
		var stringified_delta = red.stringify(delta, true);

		this.post({
			type: "delta",
			value: stringified_delta
		});
	};

	proto.on_client_closed = function() {
		this.cleanup_closed_client();
		this._emit("disconnected");
	};

	proto.cleanup_closed_client = function() {
		this.connected = false;
		this.remove_state_listeners();
	};

	proto.destroy = function() {
		this.cleanup_closed_client();
		able.destroy_this_listenable(this);
	};
}(red.ProgramStateServer));


red.ProgramStateClient = function(options) {
	able.make_this_listenable(this);
	this.server_window = window.opener;

	this.$on_message = _.bind(this.on_message, this);
	if(options.ready_func === true) {
		var old_ready = window.ready;
		window.ready = _.bind(function() {
			this.on_loaded();
			window.ready = old_ready;
		}, this);
	} else {
		if(window.document.readyState === "complete") {
			this.on_loaded();
		} else {
			window.addEventListener("load", _.bind(this.on_loaded, this));
		}
	}
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);

	proto.on_loaded = function() {
		
	};

	proto.on_message = function(event) {
		if(event.sender === this.server_window) {
			var data = event.data;
			var type = data.type;
			if(type === "delta") {
				var stringified_delta = message.value;
				var delta = red.destringify(stringified_delta, {
					inert: true,
					inert_shadows: true
				});
				this._emit("delta", delta);
				this.on_delta(delta);
			} else if(type === "color") {
				var color = message.value;
				$("html").css({
					"border-bottom": "10px solid " + color,
					height: "100%",
					"box-sizing": "border-box"
				});
			} else {
				console.error("Unhandled message type '" + type + "' for ", message);
			}
		}
	};

	proto.on_delta = function(delta) {
		if(delta instanceof red.ProgramDelta) {
			var external_root = delta.get_root();
			this.external_env = red.create("environment", {
				root: external_root
			});
			this.external_env.return_commands = true;
			this.root.set("external_root", external_root, {literal: true});
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
				var event = delta.get_event();
				transition.fire(event);
			} else {
				console.error("Could not find transition");
			}
		} else if(delta instanceof red.CurrentValuesDelta) {
			var values = delta.get_values();
			values.each(function(cached_value, pointer) {
				var obj = pointer.points_at();
				var obj_parent = pointer.points_at(-2);
				if(obj_parent instanceof red.Dict) {
					var prop_name = obj_parent.name_for_prop(obj, pointer.pop());
					if(prop_name) {
						obj_parent.set_cached_value(prop_name, cached_value);
					}
				}
			}, this);
		} else {
			console.error("Unhandled delta", delta);
		}
		this._emit("delta", delta);
	};


	proto.destroy = function() {
		able.destroy_this_listenable(this);
	};

	proto.post = function(message) {
		this.server_window.postMessage(message, origin);
	};
}(red.ProgramStateClient));


(function(red, $) {
var cjs = red.cjs, _ = red._;

$.widget("red.editor", {
	
	options: { }

	, _create: function() {
		this.add_message_listener();
		this.env = red.create("environment");
		this.load_viewer();
		var root_pointer = this.env.get_root_pointer();
		this.root = root_pointer.root();
		this.element.dom_output({
			root: root_pointer
		});
	}

	, load_viewer: function() {
		this.env

.top()
.cd("children")
	.set("obj", "<stateful>")
	.cd("obj")
		.set("(protos)", "INIT", "dom")
		.set("text", "<stateful_prop>")
		.set("text", "INIT", "'euclase view'")
		.up()
	.up()
;

	}

	, add_message_listener: function() {
		this.$on_message = _.bind(function(event) {
			if(event.source === window.opener) {
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
