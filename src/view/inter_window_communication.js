(function(red, $) {
var cjs = red.cjs, _ = red._;

var origin = window.location.protocol + "//" + window.location.host;

red.ProgramStateServer = function(options) {
	able.make_this_listenable(this);
	this.add_message_listeners();
	this.root = options.root;
	this.contextual_root = red.find_or_put_contextual_obj(this.root);
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
				var croot = this.contextual_root;
				this.post({
					type: "croot",
					summary: croot.summarize()
				});
			} else if(data === "loaded") {
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

	proto.post = function(message) {
		if(this.connected) {
			this.client_window.postMessage(message, origin);
		} else {
			throw new Error("Trying to send a message to a disconnected client");
		}
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
	};

	proto.destroy = function() {
		this.cleanup_closed_client();
		able.destroy_this_listenable(this);
		this.remove_message_listeners();
	};
}(red.ProgramStateServer));


red.ProgramStateClient = function(options) {
	able.make_this_listenable(this);
	this.server_window = options.server_window;

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
			if(type === "croot") {
				var summary = data.summary;

				this.root_client = red.get_wrapper_client(summary, this.server_window);

				this.root_client.get_children(function(value) {
					console.log(value);
				});

				this._emit("loaded", this.root_client);
				this.post("loaded");
			}
			this._emit("message", data);
		}
	};

	proto.destroy = function() {
		able.destroy_this_listenable(this);
		this.remove_message_listener();
		this.root_client.destroy();
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
