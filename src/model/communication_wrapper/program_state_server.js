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
		this.command_stack = options.command_stack;
		this.connected = false;
		this.wrapper_servers = {};
		this.constraint_servers = {};

		this.full_programs = ist.getSavedProgramMap();
		this.program_components = ist.getSavedProgramMap("component");
		this.$dirty_program = options.dirty_program;

		this.$programs = cjs(function() {
								return this.full_programs.keys();
							}, {context: this});

		this.$components = cjs(function() {
								return this.program_components.keys();
							}, {context: this});
		this.info_servers = {
			programs: new ist.RemoteConstraintServer(this.$programs),
			components: new ist.RemoteConstraintServer(this.$components),
			loaded_program: new ist.RemoteConstraintServer(ist.loaded_program_name),
			undo_description: new ist.RemoteConstraintServer(this.command_stack.$undo_description),
			redo_description: new ist.RemoteConstraintServer(this.command_stack.$redo_description),
			dirty_program: new ist.RemoteConstraintServer(this.$dirty_program)
		};
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);

		proto.add_message_listeners = function () {
			this.comm_mechanism	.on("ready", this.on_ready, this)
								.on("loaded", this.on_loaded, this)
								.on("message", this.on_message, this)
								.on("get_constraint_server", this.on_get_constraint_server, this)
								.on("disconnect", this.on_disconnect, this)
								.on("command", this.on_command, this)
								.on("wrapper_client", this.on_wrapper_client, this)
								.on("remove_storage", this.on_remove_storage, this)
								.on("save_curr", this.post_forward, this)
								.on("save_curr_as", this.post_forward, this)
								.on("create_program", this.post_forward, this)
								.on("download_program", this.download_program, this)
								.on("upload_program", this.download_program, this)
								.on("load_program", this.load_program, this)
								.on("stringified_root", this.post_forward, this)
								.on("load_file", this.post_forward, this)
								.on("save_component", this.post_forward, this)
								.on("copy_component", this.post_forward, this)
								.on("rename_program", this.post_forward, this)
								.on("add_highlight", this.post_forward, this)
								.on("remove_highlight", this.post_forward, this)
								.on("get_ptr", this.get_ptr, this)
								;
		};
		proto.remove_message_listeners = function () {
			if(this.comm_mechanism) {
				this.comm_mechanism	.off("ready", this.on_ready, this)
									.off("loaded", this.on_loaded, this)
									.off("message", this.on_message, this)
									.off("get_constraint_server", this.on_get_constraint_server, this)
									.off("disconnect", this.on_disconnect, this)
									.off("command", this.on_command, this)
									.off("wrapper_client", this.on_wrapper_client, this)
									.off("remove_storage", this.on_remove_storage, this)
									.off("save_curr", this.post_forward, this)
									.off("save_curr_as", this.post_forward, this)
									.off("create_program", this.post_forward, this)
									.off("download_program", this.download_program, this)
									.off("upload_program", this.download_program, this)
									.off("load_program", this.load_program, this)
									.off("stringified_root", this.post_forward, this)
									.off("load_file", this.post_forward, this)
									.off("save_component", this.post_forward, this)
									.off("copy_component", this.post_forward, this)
									.off("rename_program", this.post_forward, this)
									.off("get_ptr", this.get_ptr, this)
									;
			}
		};
		proto.post_forward = function(event) {
			this._emit(event.type, event);
		};
		proto.on_remove_storage = function(event) {
			ist.rm(event.name, event.storage_type==="component" ? "component" : "");
		};
		proto.on_save_curr = function(event) {
			ist.save(this.root, event.name, event.storage_type==="component" ? "component" : "");
		};
		proto.get_ptr = function(event) {
			var cobj_id = event.cobj_id,
				cobj = ist.find_uid(cobj_id);

			if(cobj) {
				var pointer = cobj.get_pointer();

				this.post({
					type: "get_ptr_response",
					cobj_id: cobj_id,
					cobjs: _.map(pointer.getContextualObjects(), function(x) {
						return x.summarize();
					})
				});
			}
		};
		proto.download_program = function(event) {
			this._emit("download_program", event.name, event.storage_type==="component" ? "component" : "");
		};
		proto.upload_program = function(event) {
			console.log("upload", event);
		};
		proto.load_program = function(event) {
			this._emit("load_program", event.name);
		};

		proto.set_communication_mechanism = function(comm_mechanism) {
			if(this.comm_mechanism) {
				this.remove_message_listeners();
				delete this.comm_mechanism;
			}
			this.comm_mechanism = comm_mechanism;
			this.add_message_listeners();
			_.each(_.values(this.info_servers).concat(_.values(this.constraint_servers)), function(info_server) {
				info_server.set_communication_mechanism(comm_mechanism);
			});
		};

		proto.set_root = function(new_root) {
			this.destroy_every_wrapper_server();

			this.root = new_root;
			this.contextual_root = ist.find_or_put_contextual_obj(this.root);

			this.send_info();
		};

		proto.send_info = function() {
			var croot_summary = this.contextual_root ? this.contextual_root.summarize() : null,
				info_servers = {};
			_.each(this.info_servers, function(info_server, name) {
				info_servers[name] = info_server.id();
			});
			this.post({
				type: "croot",
				summary: croot_summary,
				info_servers: info_servers
			});
		};

		proto.on_ready = function() {
			this.connected = true;
			this.send_info();
		};

		proto.on_get_constraint_server = function(info) { 
			var client_id = info.client_id,
				constraint_id = info.constraint_id,
				constraintServer;
			if(this.constraint_servers.hasOwnProperty(constraint_id)) {
				constraintServer = this.constraint_servers[constraint_id];
			} else {
				var constraint = ist.findConstraint(constraint_id);

				constraintServer = this.constraint_servers[constraint_id] = new ist.RemoteConstraintServer(constraint);
				constraintServer.set_communication_mechanism(this.comm_mechanism);
			}

			this.post({
				type: "constraint_server_id_response",
				client_id: client_id,
				server_id: constraintServer.id()
			});
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

		proto.on_command = function(data) {
			var stringified_command = data.command;
			if (ist.programStateCommands.indexOf(stringified_command) >= 0) {
				this._emit("command", stringified_command);
			} else {
				var command = ist.destringify(stringified_command);
				this._emit("command", command);
			}
		};
		proto.on_wrapper_client = function(wc_message) {
			var message = wc_message.message;
			var mtype = message.type;
			var wrapper_server, cobj_id, client_id, server, cobj;
			if (mtype === "register_listener") {
				cobj_id = message.cobj_id;
				cobj = ist.find_uid(cobj_id);
				client_id = wc_message.client_id;

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
					this.post(full_message);
				}, this));
			} else if (mtype === "get_$" || mtype === "async_get") { // async request
				cobj_id = wc_message.cobj_id;
				cobj = ist.find_uid(cobj_id);
				client_id = wc_message.client_id;
				var request_id = wc_message.message_id;
				if(cobj) {
					server = this.get_wrapper_server(cobj, client_id);

					var create_constraint = message.type === "get_$";

					server.request(message.getting, _.bind(function (response) {
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
				cobj_id = wc_message.cobj_id;
				client_id = wc_message.client_id;

				if (this.wrapper_servers.hasOwnProperty(cobj_id)) {
					wrapper_server = this.wrapper_servers[cobj_id];
					wrapper_server.client_destroyed(message.getting, client_id);
				}
			} else if(mtype === "destroy") {
				cobj_id = wc_message.cobj_id;
				client_id = wc_message.client_id;

				if (this.wrapper_servers.hasOwnProperty(cobj_id)) {
					wrapper_server = this.wrapper_servers[cobj_id];
					wrapper_server.remove_client_id(client_id);
					if(!wrapper_server.has_clients()) {
						wrapper_server.destroy();
						delete this.wrapper_servers[cobj_id];
					}
				}
			} else if(mtype === "pause") {
				cobj_id = wc_message.cobj_id;
				client_id = wc_message.client_id;

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
				if (object instanceof ist.ParsedEvent) {
					listen_to = ["setString"];
				} else {
					listen_to = ['destroy', 'begin_destroy'];
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
				//console.log(message);
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

			_.each(this.info_servers, function(info_server) {
				info_server.destroy();
			});

			this.$programs.destroy();
			this.$components.destroy();
			delete this.$programs._options;
			delete this.$components._options;
			delete this.wrapper_servers;
			delete this.root;
			delete this.contextual_root;
			delete this.command_stack;

			if(dont_destroy_comm_wrapper !== false && this.comm_mechanism) {
				this.comm_mechanism.destroy();
				delete this.comm_mechanism;
			}
		};
	}(ist.ProgramStateServer));

}(interstate, jQuery));
