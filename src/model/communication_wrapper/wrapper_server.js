/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._,
		origin = window.location.protocol + "//" + window.location.host;

		
	var process_arg = function (arg) {
		return arg;
	};
	var process_args = function (args) { return _.map(args, process_arg); };

	var summarize_value = function (value) {
		var rv;
		if (value instanceof red.ContextualObject) {
			var id = value.id();
			rv = {
				__type__: "summarized_obj",
				__value__: "contextual_obj",
				object_summary: {
					type: value.type(),
					id: value.id(),
					obj_id: value.get_object().id()
				}
			};
		} else if (value instanceof red.StartState) {
			rv = {
				__type__: "summarized_obj",
				__value__: "state",
				object_summary: {
					type: 'start_state',
					id: value.id()
				}
			};
		} else if (value instanceof red.Statechart) {
			rv = {
				__type__: "summarized_obj",
				__value__: "state",
				object_summary: {
					type: 'statechart',
					id: value.id()
				}
			};
		} else if (value instanceof red.StatechartTransition) {
			rv = {
				__type__: "summarized_obj",
				__value__: "transition",
				object_summary: {
					type: 'transition',
					id: value.id()
				}
			};
		} else if (value instanceof red.Event) {
			rv = {
				__type__: "summarized_obj",
				__value__: "event",
				object_summary: {
					type: 'event',
					id: value.id(),
					event_type: value.type()
				}
			};
		} else if (value instanceof red.Cell) {
			rv = {
				__type__: "summarized_obj",
				__value__: "contextual_obj",
				object_summary: {
					type: 'raw_cell',
					id: value.id()
				}
			};
		} else if (value instanceof red.WrapperClient) {
			rv = {
				__type__: "summarized_obj",
				__value__: "client_wrapper"
			};
		} else if (cjs.is_$(value)) {
			rv = {
				__type__: "summarized_obj",
				__value__: "constraint"
			};
		} else if (_.isArray(value)) {
			rv = _.map(value, summarize_value);
		} else if (_.isFunction(value)) {
			rv = {
				__type__: "summarized_obj",
				__value__: "function"
			};
		} else if (cjs.is_$(value)) {
			rv = {
				__type__: "summarized_obj",
				__value__: "cjs_object"
			};
		} else if (_.isElement(value)) {
			rv = {
				__type__: "summarized_obj",
				__value__: "dom_elem"
			};
		} else if (_.isObject(value)) {
			rv = {};
			_.each(value, function (v, k) { rv[k] = summarize_value(v); });
		} else {
			rv = value;
		}
		return rv;
	};

	var MessageDistributionCenter = function () {
		able.make_this_listenable(this);
		window.addEventListener("message", _.bind(function (event) {
			var data = event.data;
			if (data.type === "wrapper_client") {
				var client_id = data.client_id;
				this._emit("message", data.message, event);
			}
		}, this));
	};
	able.make_proto_listenable(MessageDistributionCenter.prototype);


	var get_channel_listener = function (client_window, client_id) {
		return {
			type: "channel",
			client_window: client_window,
			client_id: client_id
		};
	};

	var sdc = new MessageDistributionCenter();
	sdc.on("message", function (message, event) {
		var type = message.type,
			client_window = event.source,
			client_id = event.data.client_id;
		var cobj, cobj_id, server;
		if (type === "register_listener") {
			cobj_id = message.cobj_id;
			cobj = red.find_uid(cobj_id);
			server = red.get_wrapper_server(cobj);

			server.register_listener(get_channel_listener(client_window, client_id));
		} else if (type === "get_$" || type === "async_get") { // async request
			cobj_id = event.data.cobj_id;
			cobj = red.find_uid(cobj_id);
			server = red.get_wrapper_server(cobj);

			var request_id = event.data.message_id;
			var processed_getting = process_args(message.getting);
			var create_constraint = type === "get_$";

			server.on_request(processed_getting, function (response) {
				var summarized_response = summarize_value(response);
				client_window.postMessage({
					type: "response",
					request_id: request_id,
					client_id: client_id,
					response: summarized_response
				}, origin);
			}, create_constraint);
		}
	});

	var chop = function (args) {
		return _.first(args, args.length - 1);
	};
	var last = function (args) {
		return _.last(args);
	};

	var make_async = function (object_func_name) {
		return function () {
			var args = chop(arguments),
				callback = last(arguments);

			var value = this.object[object_func_name].apply(this.object, args);
			callback(value);
		};
	};

	var argeq = function (arg1, arg2) {
		return arg1 === arg2;
	};
	red.WrapperServer = function (options) {
		this.object = options.object;
		this._type = "none";
		this.client_listeners = [];
		this._event_type_listeners = options.listen_to || [];

		this.$on_emit = _.bind(this.on_emit, this);
		this.add_emission_listeners();

		this.fn_call_constraints = cjs.map({
			hash: function (args) {
				return args[0];
			},
			equals: function (args1, args2) {
				var i;
				var len = args1.length;
				if (len !== args2.length) {
					return false;
				} else {
					for (i = 0; i < len; i += 1) {
						if (!argeq(args1[i], args2[i])) {
							return false;
						}
					}
					return true;
				}
			}
		});
	};

	(function (my) {
		var proto = my.prototype;

		proto.add_emission_listeners = function () {
			var object = this.get_object();
			var listener = this.$on_emit;
			_.each(this._event_type_listeners, function (event_type) {
				object.on(event_type, listener);
			});
		};

		proto.remove_emission_listeners = function () {
			var object = this.get_object();
			var listener = this.$on_emit;
			_.each(this._event_type_listeners, function (event_type) {
				object.off(event_type, listener);
			});
		};

		proto.destroy = function () {
			this.remove_emission_listeners();
		};

		proto.type = function () {
			return this._type;
		};
		proto.get_object = function () {
			return this.object;
		};
		proto.register_listener = function (listener_info) {
			this.client_listeners.push(listener_info);
		};

		proto.on_emit = function () {
			this.remote_emit.apply(this, arguments);
		};

		proto.remote_emit = function () {
			var event_type = _.last(arguments);
			var args = _.first(arguments, arguments.length - 1);
			args = _.map(args, summarize_value);
			this.post({
				type: "emit",
				event_type: event_type,
				args: args
			});
		};

		proto.on_request = function (getting, callback, create_constraint) {
			var fn_name = getting[0];
			var args = _.rest(getting);
			var object = this.get_object();

			if (create_constraint) {
				var constraint = this.fn_call_constraints.get_or_put(getting, function () {
					var constraint = new cjs.Constraint(function () {
						var rv = object[fn_name].apply(object, args);
						return rv;
					});
					constraint.onChange(_.bind(function () {
						this.post({
							type: "changed",
							getting: getting
						});
					}, this));
					return constraint;
				}, this);

				callback(constraint.get());
			} else {
				var rv = object[fn_name].apply(object, args);
				callback(rv);
			}
		};

		proto.post = function (data) {
			var i, len = this.client_listeners.length;
			var full_message = {
				type: "wrapper_server",
				server_message: data
			};
			for (i = 0; i < len; i += 1) {
				var cl = this.client_listeners[i];
				if (cl.type === "channel") {
					var client_window = cl.client_window,
						client_id = cl.client_id;
					client_window.postMessage(_.extend({
						client_id: client_id
					}, full_message), origin);
				}
			}
		};

	}(red.WrapperServer));

	var wrapper_servers = {};

	red.register_wrapper_server = function (object, server) {
		wrapper_servers[object.id()] = server;
	};

	red.get_wrapper_server = function (object) {
		var id = object.id();
		if (wrapper_servers.hasOwnProperty(id)) {
			return wrapper_servers[id];
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

			wrapper_servers[id] = rv;
			return rv;
		}
	};
}(red));
