/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ProgramStateServer = function (options) {
		able.make_this_listenable(this);
		this.root = options.root;
		if(this.root) {
			this.contextual_root = ist.find_or_put_contextual_obj(this.root);
		}
		this.connected = false;
		this.wrapper_servers = {};
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);

		proto.add_message_listeners = function () {
			this.comm_mechanism	.on("ready", this.on_ready, this)
								.on("message", this.on_message, this)
								.on("disconnect", this.on_disconnect, this)
		};
		proto.remove_message_listeners = function () {
			if(this.comm_mechanism) {
				this.comm_mechanism.off("message", this.on_message, this);
			}
		};
		proto.set_communication_mechanism = function(comm_mechanism) {
			if(this.comm_mechanism) {
				this.remove_message_listeners();
				delete this.comm_mechanism;
			}
			this.comm_mechanism = comm_mechanism;
			this.add_message_listeners();
		};

		proto.set_root = function(new_root) {
			this.destroy_every_wrapper_server();

			this.root = new_root;
			this.contextual_root = ist.find_or_put_contextual_obj(this.root);

			this.send_root();
		};

		proto.send_root = function() {
			var croot_summary = this.contextual_root ? this.contextual_root.summarize() : null;
			this.post({
				type: "croot",
				summary: croot_summary
			});
		};

		proto.on_ready = function() {
			this.connected = true;
			this.send_root();
		};

		proto.on_loaded = function() {
			this._emit("connected");
		};
		proto.on_disconnect = function() {
			_.each(this.wrapper_servers, function(wrapper_server, cobj_id) {
				if(!wrapper_server.has_clients()) {
					wrapper_server.destroy();
					delete this.wrapper_servers[cobj_id];
				}
			}, this);
			this.cleanup_closed_client();
			this._emit("disconnected");
		};

		proto.on_command = function(command) {
			if (type === "command") {
				var stringified_command = data.command;
				if ((["undo", "redo", "reset", "export", "upload", "store"]).indexOf(stringified_command) >= 0) {
					this._emit("command", stringified_command);
				} else {
					var command = ist.destringify(stringified_command);
					this._emit("command", command);
				}
			} else if(type === "wrapper_client") {
				var message = data.message;
				var mtype = message.type;
				var wrapper_server;
				if (mtype === "register_listener") {
					cobj_id = message.cobj_id;
					cobj = ist.find_uid(cobj_id);
					client_id = data.client_id;

					server = this.get_wrapper_server(cobj, client_id);
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
						//if(client_id === 8) debugger;
						this.post(full_message);
					}, this));
				} else if (mtype === "get_$" || mtype === "async_get") { // async request
					cobj_id = data.cobj_id;
					cobj = ist.find_uid(cobj_id);
					client_id = data.client_id;
					var request_id = data.message_id;
					if(cobj) {
						server = this.get_wrapper_server(cobj, client_id);

						var create_constraint = data.message.type === "get_$";

						server.request(data.message.getting, _.bind(function (response) {
							this.post({
								type: "response",
								request_id: request_id,
								client_id: client_id,
								response: response
							});
						}, this), create_constraint, client_id);
					} else {
						this.post({
							type: "response",
							request_id: request_id,
							client_id: client_id,
							error: "cobj_destroyed"
						});
					}
				} else if(mtype === "destroy_$") {
					cobj_id = data.cobj_id;
					client_id = data.client_id;

					if (this.wrapper_servers.hasOwnProperty(cobj_id)) {
						wrapper_server = this.wrapper_servers[cobj_id];
						wrapper_server.client_destroyed(data.message.getting, client_id);
					}
				} else if(mtype === "destroy") {
					cobj_id = data.cobj_id;
					client_id = data.client_id;

					if (this.wrapper_servers.hasOwnProperty(cobj_id)) {
						wrapper_server = this.wrapper_servers[cobj_id];
						wrapper_server.remove_client_id(client_id);
						if(!wrapper_server.has_clients()) {
							wrapper_server.destroy();
							delete this.wrapper_servers[cobj_id];
						}
					}
				} else if(mtype === "pause") {
					cobj_id = data.cobj_id;
					client_id = data.client_id;

					if (this.wrapper_servers.hasOwnProperty(cobj_id)) {
						wrapper_server = this.wrapper_servers[cobj_id];
						wrapper_server.client_paused(cobj_id);
					}
				} else if(mtype === "resume") {
					if (this.wrapper_servers.hasOwnProperty(cobj_id)) {
						wrapper_server = this.wrapper_servers[cobj_id];
						wrapper_server.client_resumed(cobj_id);
					}
				}
			}
			this._emit("message", data);
		};

		proto.get_wrapper_server = function(object, client_id) {
			var id = object.id();
			var rv;
			if (this.wrapper_servers.hasOwnProperty(id)) {
				rv = this.wrapper_servers[id];
				rv.add_client_id(client_id);
				return rv;
			} else {
				var listen_to;
				if (object instanceof ist.State) {
					listen_to = ["add_transition", "add_substate", "remove_substate",
										"rename_substate", "move_substate", "make_concurrent",
										/*"on_transition", "off_transition",*/ "destroy",
										"active", "inactive", "run", "stop"];
				} else if (object instanceof ist.StatechartTransition) {
					listen_to = ["setTo", "setFrom", "remove", "destroy", "fire", "enable", "disable"];
				} else if (object instanceof ist.ParsedEvent) {
					listen_to = ["setString"];
				} else {
					listen_to = [];
				}
				
				rv = new ist.WrapperServer({
					object: object,
					listen_to: listen_to,
					client_ids: [client_id]
				});
				rv.on("destroy", this.wrapper_server_destroyed, this, rv, id);

				this.wrapper_servers[id] = rv;
				return rv;
			}
		};

		proto.wrapper_server_destroyed = function(wrapper_server, id) {
			wrapper_server.off("destroy", this.wrapper_server_destroyed);
			delete this.wrapper_servers[id];
		};

		proto.post = function (message) {
			if (this.connected) {
				this.comm_mechanism.post(message);
			} else {
				throw new Error("Trying to send a message to a disconnected client");
			}
		};

		proto.is_connected = function () {
			return this.connected;
		};

		proto.cleanup_closed_client = function () {
			this.connected = false;
		};

		proto.destroy_every_wrapper_server = function() {
			_.each(this.wrapper_servers, function(wrapper_server, cobj_id) {
				wrapper_server.destroy();
				delete this.wrapper_servers[cobj_id];
			}, this);
		};

		proto.destroy = function (dont_destroy_comm_wrapper) {
			this.cleanup_closed_client();
			able.destroy_this_listenable(this);
			this.remove_message_listeners();

			this.destroy_every_wrapper_server();

			delete this.wrapper_servers;
			delete this.root;
			delete this.contextual_root;

			if(dont_destroy_comm_wrapper !== false && this.comm_mechanism) {
				this.comm_mechanism.destroy();
				delete this.comm_mechanism;
			}
		};
	}(ist.ProgramStateServer));

}(interstate, jQuery));
