/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,jQuery,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.ProgramStateServer = function (options) {
		able.make_this_listenable(this);
		this.comm_mechanism = options.comm_mechanism;
		this.add_message_listeners();
		this.root = options.root;
		this.contextual_root = red.find_or_put_contextual_obj(this.root);
		this.client_window = options.client_window;
		this.connected = false;
		this.wrapper_servers = {};

		var close_check_interval = window.setInterval(_.bind(function () {
			if (this.client_window.closed) {
				window.clearInterval(close_check_interval);
				this.on_client_closed();
			}
		}, this), 200);

		$(this.client_window).on("beforeunload", _.bind(function () {
			window.clearInterval(close_check_interval);
			this.on_client_closed();
		}, this));
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);

		proto.add_message_listeners = function () {
			this.$on_message = _.bind(this.on_message, this);
			this.comm_mechanism.on("message", this.$on_message);
		};
		proto.remove_message_listeners = function () {
			this.comm_mechanism.off("message", this.$on_message);
		};

		proto.on_message = function (data) {
			var cobj, cobj_id, server, client_id;
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
				if (type === "command") {
					var stringified_command = data.command;
					if ((["undo", "redo", "reset"]).indexOf(stringified_command) >= 0) {
						this._emit("command", stringified_command);
					} else {
						var command = red.destringify(stringified_command);
						this._emit("command", command);
					}
				} else if(type === "wrapper_client") {
					var message = data.message;
					var mtype = message.type;
					if (mtype === "register_listener") {
						cobj_id = message.cobj_id;
						cobj = red.find_uid(cobj_id);
						client_id = data.client_id;

						server = this.get_wrapper_server(cobj);
						server.on("emit", _.bind(function(evt) {
							var full_message = {
								type: "wrapper_server",
								server_message: _.extend({type: "emit", client_id: client_id}, evt)
							};
							this.post(full_message);
						},this)).on("changed", _.bind(function(getting) {
							var full_message = {
								type: "wrapper_server",
								server_message: {
									type: "changed",
									cobj_id: cobj_id,
									getting: getting,
									client_id: client_id
								}
							};
							this.post(full_message);
						}, this));
						/*
						server.register_listener();
						console.log(server);
						/*
						server.register_listener(get_channel_listener(client_window, client_id));
						*/
					} else if (mtype === "get_$" || mtype === "async_get") { // async request
						cobj_id = data.cobj_id;
						cobj = red.find_uid(cobj_id);
						server = this.get_wrapper_server(cobj);

						var request_id = data.message_id;
						client_id = data.client_id;
						var create_constraint = data.message.type === "get_$";

						server.request(data.message.getting, _.bind(function (response) {
							this.post({
								type: "response",
								request_id: request_id,
								client_id: client_id,
								response: response
							});
						}, this), create_constraint);
					}
				}
			}
		};

		proto.get_wrapper_server = function(object) {
			var id = object.id();
			if (this.wrapper_servers.hasOwnProperty(id)) {
				return this.wrapper_servers[id];
			} else {
				var rv;

				var listen_to;
				if (object instanceof red.State) {
					listen_to = ["add_transition", "add_substate", "remove_substate",
										"rename_substate", "move_substate", "make_concurrent",
										/*"on_transition", "off_transition",*/ "destroy",
										"active", "inactive"];
				} else if (object instanceof red.StatechartTransition) {
					listen_to = ["setTo", "setFrom", "remove", "destroy", "fire"];
				} else if (object instanceof red.ParsedEvent) {
					listen_to = ["setString"];
				} else {
					listen_to = [];
				}
				
				rv = new red.WrapperServer({
					object: object,
					listen_to: listen_to
				});

				this.wrapper_servers[id] = rv;
				return rv;
			}
		};

		proto.post = function (message) {
			if (this.connected) {
				this.comm_mechanism.post(message);
			} else {
				throw new Error("Trying to send a message to a disconnected client");
			}
		};

		proto.on_client_closed = function () {
			this.cleanup_closed_client();
			this._emit("disconnected");
		};

		proto.is_connected = function () {
			return this.connected;
		};

		proto.cleanup_closed_client = function () {
			this.connected = false;
		};

		proto.destroy = function () {
			this.cleanup_closed_client();
			able.destroy_this_listenable(this);
			this.remove_message_listeners();
		};
	}(red.ProgramStateServer));

}(red, jQuery));
