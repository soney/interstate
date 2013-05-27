/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,jQuery,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.ProgramStateClient = function (options) {
		able.make_this_listenable(this);
		this.comm_mechanism = options.comm_mechanism;
		this.wrapper_clients = {};
		this.clients = {};
		this.response_listeners = {};
		this.pending_responses = {};

		if (options.ready_func === true) {
			var old_ready = window.ready;
			window.ready = _.bind(function () {
				this.on_loaded();
				window.ready = old_ready;
			}, this);
		} else {
			if (window.document.readyState === "complete") {
				this.on_loaded();
			} else {
				window.addEventListener("load", _.bind(this.on_loaded, this));
			}
		}
		$(window).on("beforeunload", _.bind(function () {
			this.disconnect();
		}, this));
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);

		proto.on_loaded = function () {
			this.add_message_listener();
			this.post("ready");
		};

		proto.add_message_listener = function () {
			this.$on_message = _.bind(this.on_message, this);
			this.comm_mechanism.on("message", this.$on_message);
		};
		proto.remove_message_listener = function () {
			this.comm_mechanism.off("message", this.$on_message);
		};

		proto.disconnect = function() {
			this.post("disconnect");
		};

		var DEREGISTERED = {};
		proto.on_message = function (message) {
			var type = message.type;

			if (type === "croot") {
				var summary = message.summary;

				if(summary) {
					this.root_client = this.get_wrapper_client(summary);
				}

				this._emit("loaded", this.root_client);
				this.post("loaded");
			} else if (type === "wrapper_server") {
				this._emit("message", message);
				var server_message = message.server_message;
				var client_id = server_message.client_id;

				var smtype = server_message.type;
				var client;
				if (smtype === "changed") {
					client = this.clients[client_id];
					client.on_change.apply(client, server_message.getting);
				} else if (smtype === "emit") {
					client = this.clients[client_id];
					client.on_emit.apply(client, ([server_message.event_type]).concat(server_message.args));
				}
			} else if (type === "response") {
				var request_id = message.request_id,
					response = message.response;
				if (this.response_listeners.hasOwnProperty(request_id)) {
					var response_listener = this.response_listeners[request_id];
					if(response_listener !== DEREGISTERED) {
						response_listener(response);
					}
					delete this.response_listeners[request_id];
				} else {
					this.pending_responses[request_id] = response;
				}
			}

			this._emit("message", message);
		};

		proto.register_response_listener = function (id, listener) {
			if (this.pending_responses.hasOwnProperty(id)) {
				listener(this.pending_responses[id]);
				delete this.pending_responses[id];
			} else {
				this.response_listeners[id] = listener;
			}
		};
		proto.deregister_response_listener = function(id) {
			if (this.pending_responses.hasOwnProperty(id)) {
				delete this.pending_responses[id];
			}
			if (this.response_listeners.hasOwnProperty(id)) {
				this.response_listeners[id] = DEREGISTERED; // don't want it added to pending when we get a response
			}
		};

		proto.get_wrapper_client = function(object_summary) {
			var cobj_id = object_summary.id;
			if (this.wrapper_clients.hasOwnProperty(cobj_id)) {
				return this.wrapper_clients[cobj_id];
			} else {
				var otype = object_summary.type;
				var rv;

				var obj_id = object_summary.obj_id;
				rv = new red.WrapperClient({
					comm_mechanism: this.comm_mechanism,
					cobj_id: cobj_id,
					obj_id: obj_id,
					type: otype,
					object_summary: object_summary,
					program_state_client: this
				});

				var client_id = rv.id();

				this.clients[client_id] = rv;
				this.wrapper_clients[cobj_id] = rv;
				rv.on_ready();

				var on_destroy = $.proxy(function() {
					rv.off("destroy", on_destroy);
					this.destroy_wrapper_client(client_id, cobj_id);
				}, this);

				rv.on("destroy", on_destroy);

				return rv;
			}
		};

		proto.destroy_wrapper_client = function(client_id, cobj_id) {
			delete this.clients[client_id];
			delete this.wrapper_clients[cobj_id];
		};

		proto.destroy = function () {
			_.each(this.wrapper_clients, function(wc) {
				wc.destroy();
			}, this);
			able.destroy_this_listenable(this);
			this.remove_message_listener();
			this.root_client.destroy();
		};

		proto.post = function (message) {
			this.comm_mechanism.post(message);
		};

		proto.post_command = function (command) {
			var stringified_command;
			if ((["undo", "redo", "reset"]).indexOf(command) >= 0) {
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
