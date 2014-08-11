/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.programStateCommands = ["undo", "redo", "reset", "export", "upload", "store", "begin_define_path"];

	ist.ProgramStateClient = function (options) {
		able.make_this_listenable(this);
		this.comm_mechanism = options.comm_mechanism;
		this.wrapper_clients = {};
		this.clients = {};
		this.response_listeners = {};
		this.pending_responses = {};
		this.loaded = false;

		if (options.ready_func === true) {
			var old_ready = window.ready;
			window.ready = _.bind(function () {
				this.on_loaded();
				window.ready = old_ready;
			}, this);
		} else {
			if (window.document.readyState === "complete") {
				_.defer(_.bind(this.on_loaded, this), this);
			} else {
				window.addEventListener("load", _.bind(this.on_loaded, this));
			}
		}

		this.info_servers = {};
		this.comm_mechanism	.on("croot", this.on_croot, this)
							.on("response", this.on_response, this)
							.on("cobj_links", this.on_cobj_links, this)
							.on("wrapper_server", this.on_wrapper_server, this)
							.on("stringified_root", this.post_forward, this)
							.on("get_ptr_response", this.post_forward, this)
							.on("inspect", this.post_forward, this)
							.on("stringified_obj", this.post_forward, this);
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);

		proto.on_loaded = function () {
			if(!this.loaded) {
				this.loaded = true;
				this.add_message_listener();
				this.post({
					type: "ready"
				});
			}
		};

		proto.add_message_listener = function () {
			this.comm_mechanism.on("message", this.on_message, this);
		};
		proto.remove_message_listener = function () {
			this.comm_mechanism.off("message", this.on_message, this);
		};

		proto.disconnect = function() {
			this.destroy_every_client();
			this.post({type: "disconnect"});
		};

		proto.destroy_every_client = function() {
			_.each(this.clients, function(client, client_id) {
				client.destroy();
				delete this.clients[client_id];
			}, this);
		};

		proto.post_forward = function(event) {
			this._emit(event.type, event);
		};

		var DEREGISTERED = {};
		proto.on_croot = function(message) {
			if(this.root_client) {
				this._emit("root_changed", message);
			}

			var summary = message.summary,
				info_server_info = message.info_servers;

			if(summary) {
				this.root_client = this.get_wrapper_client(summary);
				_.each(message.info_servers, function(id, name) {
					this.info_servers[name] = new ist.RemoteConstraintClient(id);
					this.info_servers[name].set_communication_mechanism(this.comm_mechanism);
				}, this);
			}

			this._emit("loaded", this.root_client, this.info_servers);
			this.post({type: "loaded"});
			
			this.clist = $("<div />").appendTo(this.element).component_list({
				info_servers: this.info_servers
			});
		};
		proto.on_wrapper_server = function(message) {
			if(this.clients) { // I haven't been destroyed
				var server_message = message.server_message,
					client_id = server_message.client_id,
					smtype = server_message.type,
					client = this.clients[client_id];

				if(client) {
					if (smtype === "changed") {
						client.on_change.apply(client, server_message.getting);
					} else if (smtype === "emit") {
						client.on_emit.apply(client, ([server_message.event_type]).concat(server_message.args));
					}
				}
			}
		};
		proto.on_response = function(message) {
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
		};
		proto.on_cobj_links = function(message) {
			this._emit("cobj_links", message);
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
			var rv;
			if(this.wrapper_clients.hasOwnProperty(cobj_id)) {
				rv = this.wrapper_clients[cobj_id];
				rv.object_summary = object_summary;
				return rv;
			} else {
				var otype = object_summary.type;

				var obj_id = object_summary.obj_id;
				rv = new ist.WrapperClient({
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

				var on_destroy = _.bind(function() {
					rv.off("wc_destroy", on_destroy);
					this.destroy_wrapper_client(client_id, cobj_id);
				}, this);

				rv.on("wc_destroy", on_destroy);

				return rv;
			}
		};

		proto.destroy_wrapper_client = function(client_id, cobj_id) {
			delete this.clients[client_id];
			delete this.wrapper_clients[cobj_id];
		};

		proto.destroy = function (dont_destroy_comm_wrapper) {
			this.disconnect();
			able.destroy_this_listenable(this);
			this.remove_message_listener();

			this.destroy_every_client();
			delete this.wrapper_clients;
			delete this.clients;

			delete this.root_client;

			if(dont_destroy_comm_wrapper !== false && this.comm_mechanism) {
				this.comm_mechanism.destroy();
				delete this.comm_mechanism;
			}
		};

		proto.post = function (message, callback) {
			this.comm_mechanism.post(message, callback);
		};

		proto.post_command = function (command, callback) {
			var stringified_command;
			if (ist.programStateCommands.indexOf(command) >= 0) {
				stringified_command = command;
			} else {
				stringified_command = ist.stringify(command);
			}
			this.post({
				type: "command",
				command: stringified_command
			}, callback);
			return stringified_command;
		};
	}(ist.ProgramStateClient));

	ist.indirectClient = function(client_constraint) {
		var client_val = cjs.get(client_constraint),
			old_client = client_val,
			prop_names = _.rest(arguments),
			client_is_valid, rv, is_arr = prop_names.length !== 1;

		if (client_val instanceof ist.WrapperClient) {
			client_val.signal_interest();
			client_is_valid = true;
		} else {
			client_is_valid = false;
		}

		if(is_arr) {
			rv = cjs.map({
				keys: _.map(prop_names, function(prop_name) {
					return _.isArray(prop_name) ? prop_name[0] : prop_name;
				}),
				values: _.map(prop_names, function(prop_name) {
					var args = _.isArray(prop_name) ? prop_name : [prop_name];
					return (client_val instanceof ist.WrapperClient) ? client_val.get_$.apply(client_val, args) : false;
				})
			});
		} else {
			var args = _.isArray(prop_names[0]) ? prop_names[0] : [prop_names[0]];
			rv = cjs.constraint((client_val instanceof ist.WrapperClient) ? client_val.get_$.apply(client_val, args) : false);
		}
		
		var on_change_fn = function() {
			old_client = client_val;
			var client_was_valid = old_client instanceof ist.WrapperClient;

			client_val = cjs.get(client_constraint);
			client_is_valid = client_val instanceof ist.WrapperClient;

			if(is_arr) {
				_.each(prop_names, function(prop_name) {
					if(client_val instanceof ist.WrapperClient) {
						var args = _.isArray(prop_name) ? prop_name : [prop_name];
						rv.put(args[0], client_val.get_$.apply(client_val, args));

						if(rv.do_debug) {
							console.log(prop_name, args);
						}
					} else {
						rv.remove(prop_name);
					}
				});
			} else {
				if(client_val instanceof ist.WrapperClient) {
					var args = _.isArray(prop_names[0]) ? prop_names[0] : [prop_names[0]];
					rv.set(client_val.get_$.apply(client_val, args));
				} else {
					rv.set(false);
				}
			}

			if(client_is_valid && !client_was_valid) {
				client_val.signal_interest();
			} else if(client_was_valid && !client_is_valid) {
				old_client.signal_destroy();
			} else if(client_was_valid && client_is_valid) {
				if(old_client !== client_val) {
					old_client.signal_destroy();
					client_val.signal_interest();
				}
			}
		};

		if(cjs.isConstraint(client_constraint)) {
			client_constraint.onChange(on_change_fn);
		}

		var old_destroy = rv.destroy;
		rv.destroy = function() {
			if(cjs.isConstraint(client_constraint)) {
				client_constraint.offChange(on_change_fn);
			}
			old_destroy.apply(rv, arguments);
			if(client_val instanceof ist.WrapperClient) {
				client_val.signal_destroy();
			}
		};

		return rv;
	};
}(interstate, jQuery));
