/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

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
			var server_message = message.server_message;
			var client_id = server_message.client_id;

			var smtype = server_message.type;
			var client = this.clients[client_id];
			if(client) {
				if (smtype === "changed") {
					client.on_change.apply(client, server_message.getting);
				} else if (smtype === "emit") {
					client.on_emit.apply(client, ([server_message.event_type]).concat(server_message.args));
				}
				//console.log(smtype);
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
		/*
		proto.on_message = function (message) {
			var type = message.type;

			if (type === "croot") {
				if(this.root_client) {
					this._emit("root_changed", message);
				}

				var summary = message.summary;

				if(summary) {
					this.root_client = this.get_wrapper_client(summary);
				}

				this._emit("loaded", this.root_client);
				this.post("loaded");
			} else if (type === "wrapper_server") {
				var server_message = message.server_message;
				var client_id = server_message.client_id;

				var smtype = server_message.type;
				var client = this.clients[client_id];
				if(client) {
					if (smtype === "changed") {
						client.on_change.apply(client, server_message.getting);
					} else if (smtype === "emit") {
						client.on_emit.apply(client, ([server_message.event_type]).concat(server_message.args));
					}
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
			} else if(type === "cobj_links") {
				this._emit("cobj_links", message);
			}

			this._emit("message", message);
		};
		*/

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
			if ((["undo", "redo", "reset", "export", "upload", "store"]).indexOf(command) >= 0) {
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
		var client_val = client.get(),
			old_client = client_val,
			prop_names = _.rest(arguments),
			client_is_valid = !!client, rv, is_arr = prop_names.length !== 1;

		if(is_arr) {
			rv = cjs.map({
				keys: prop_names,
				values: _.map(prop_names, function(prop_name) {
					return client_val ? client_val.get_$(prop_name) : false;
				})
			});
		} else {
			rv = cjs.constraint(client_val ? client_val.get_$(prop_names[0]) : false);
		}

		client.onChange(function() {
			var client_was_valid = client_is_valid;
			client_val = client.get();
			if(is_arr) {
				rv.each(function(old_value, prop_name) {
				});
				/*
				rv = cjs.map({
					keys: prop_names,
					values: _.map(prop_names, function(prop_name) {
						return client_val ? client_val.get_$(prop_name) : false;
					})
				});
				*/
			} else {
				var old_value = rv.get();
			/*

				rv = cjs.constraint(client_val ? client_val.get_$(prop_names[0]) : false);
				*/
			}
		/*
			client_val = client.get();
			if(client_val) {
				client_is_valid = true;
				client_val.signal_interest();
			} else {
			}
			*/
		});

		return rv;
	};
	/*
			var client = this.option("client"),
				client_val = client.get(),
				old_client = client_val;

			var client_is_valid;

			var elem = this.element;
			this.client_state = cjs.fsm('unset', 'initialedit', 'set')
									.addTransition('unset', 'initialedit', cjs.on('click', this.element))
									.addTransition('initialedit', 'set', function(dt) {
										elem.on('confirm_value', dt);
									})
									.addTransition('initialedit', 'unset', function(dt) {
										elem.on('cancel_value', dt);
									})
									.on('initialedit->set', function(event) {
										this._set_value_for_state(event.value);
									}, this)
									.on("unset->initialedit", this._emit_begin_editing, this)
									.on("initialedit->*", this._emit_done_editing, this);

			this.$$STR = false;
			this.$$SE = false;
			if(client_val) {
				client_is_valid = true;
				client_val.signal_interest();
				this.$$STR = client_val.get_$("get_str");
				this.$$SE = client_val.get_$("get_syntax_errors");
				this.$$STR.signal_interest();
				this.$$SE.signal_interest();
				this.client_state._setState('set');
			} else {
				this.client_state._setState('unset');
				client_is_valid = false;
			}
			this.$str = cjs(this.$$STR);
			this.$syntax_errors = cjs(this.$$SE);


			client.onChange(function() {
				var client_was_valid = client_is_valid,
					client_val = client.get();
				if(this.$$STR) {
					this.$$STR.signal_destroy();
					this.$$SE.signal_destroy();
				}
				if(client_val) {
					client_is_valid = true;
					this.$$STR = client_val.get_$("get_str");
					this.$$SE = client_val.get_$("get_syntax_errors");
					this.client_state._setState('set');
				} else {
					client_is_valid = false;
					this.$$STR = false;
					this.$$SE = false;
					this.client_state._setState('unset');
				}
				this.$str.set(this.$$STR);
				this.$syntax_errors.set(this.$$SE);

				if(client_is_valid && !client_was_valid) {
					client_val.signal_interest();
				} else if(client_was_valid && !client_is_valid) {
					old_client.signal_destroy();
				} else if(client_was_valid && client_is_valid) {
					old_client.signal_destroy();
					client_val.signal_interest();
				}
				old_client = client_val;
			}, this);
			*/
}(interstate, jQuery));
