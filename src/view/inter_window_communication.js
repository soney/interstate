(function(red, $) {
var cjs = red.cjs, _ = red._;

var origin = window.location.protocol + "//" + window.location.host;

red.ProgramStateServer = function(options) {
	able.make_this_listenable(this);
	this.add_message_listeners();
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

	proto.add_message_listeners = function() {
		this.$on_message = _.bind(this.on_message, this);
		window.addEventListener("message", this.$on_message);
	};
	proto.remove_message_listeners = function() {
		window.removeEventListener("message", this.$on_message);
	};

	proto.on_message = function(event) {
		if(event.source === this.client_window) {
			var data = event.data;
			if(data === "ready") {
				this.connected = true;
				this.post_delta(new red.ProgramDelta({
					root_pointer: red.create("pointer", {stack: [this.root]})
				}));
				this.add_state_listeners();
				this.post_delta(new red.CurrentStateDelta({
					states: this._states
				}));
				this.post_delta(new red.CurrentValuesDelta({
					root_pointer: red.create("pointer", {stack: [this.root]})
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

	proto.is_connected = function() { 
		return this.connected;
	};

	proto.cleanup_closed_client = function() {
		this.connected = false;
		this.remove_state_listeners();
	};

	proto.destroy = function() {
		this.cleanup_closed_client();
		able.destroy_this_listenable(this);
		this.remove_message_listeners();
	};
}(red.ProgramStateServer));


red.ProgramStateClient = function(options) {
	able.make_this_listenable(this);
	this.server_window = window.opener;

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
		this.add_message_listener();
		this.post("ready");
	};

	proto.add_message_listener = function() {
		this.$on_message = _.bind(this.on_message, this);
		window.addEventListener("message", this.$on_message);
	};
	proto.remove_message_listener = function() {
		window.removeEventListener("message", this.$on_message);
	};

	proto.on_message = function(event) {
		if(event.source === this.server_window) {
			var data = event.data;
			var type = data.type;
			if(type === "delta") {
				var stringified_delta = data.value;
				var delta = red.destringify(stringified_delta, {
					inert: true,
					inert_shadows: true
				});
				this.on_delta(delta);
			}
			this._emit("message", data);
		}
	};

	proto.on_delta = function(delta) {
		if(delta instanceof red.ProgramDelta) {
			var external_root = delta.get_root();
			this.external_env = red.create("environment", {
				root: external_root
			});
			this.external_env.return_commands = true;
		} else if(delta instanceof red.CommandDelta) {
			var command = delta.get_command();
			if((["undo", "redo", "reset"]).indexOf(command) >= 0) {
				this.external_env[command]();
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
			this._emit("root_loaded", this.get_root());
		} else {
			console.error("Unhandled delta", delta);
		}
		this._emit("delta", delta);
	};

	proto.get_root = function() {
		var root_pointer = this.external_env.get_root_pointer();
		var root = root_pointer.root();
		return root;
	};

	proto.get_external_env = function() {
		return this.external_env;
	};

	proto.destroy = function() {
		able.destroy_this_listenable(this);
		this.remove_message_listener();
	};

	proto.post = function(message) {
		this.server_window.postMessage(message, origin);
	};

	proto.post_command = function(command) {
		var stringified_command;
		if((["undo", "redo", "reset"]).indexOf(command) >= 0) {
			stringified_command = command;
		} else {
			stringified_command = red.stringify(command);
		}
		this.post({
			type: "command",
			command: stringified_command
		});
	};
}(red.ProgramStateClient));

}(red, jQuery));
