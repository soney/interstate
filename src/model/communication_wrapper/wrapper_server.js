/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,window,Box2D,RedMap */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
		
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
		} else if (window.Box2D && value instanceof Box2D.Dynamics.b2World) {
			rv = {
				__type__: "summarized_obj",
				__value__: "box2d_world"
			};
		} else if (_.isObject(value)) {
			rv = {};
			_.each(value, function (v, k) { rv[k] = summarize_value(v); });
		} else {
			rv = value;
		}
		return rv;
	};

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
	var id = 0;
	red.WrapperServer = function (options) {
		this.id = id++;
		able.make_this_listenable(this);
		this.object = options.object;
		this._type = "none";
		this._event_type_listeners = options.listen_to || [];

		this.client_count = 0;
		this.client_ids = {};
		_.each(options.client_ids, function(client_id) {
			this.add_client_id(client_id);
		}, this);

		this.$on_emit = _.bind(this.on_emit, this);
		this.add_emission_listeners();

		this.fn_call_constraints = new RedMap({
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
		able.make_proto_listenable(proto);

		proto.add_client_id = function(client_id) {
			if(!this.client_ids.hasOwnProperty(client_id)) {
				this.client_ids[client_id] = true;
				this.client_count++;
			}
		};

		proto.remove_client_id = function(client_id) {
			if(this.client_ids.hasOwnProperty(client_id)) {
				delete this.client_ids[client_id];
				this.client_count--;
			}
		};

		proto.has_clients = function() {
			return this.client_count === 0;
		};

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

		proto.on_emit = function () {
			this.remote_emit.apply(this, arguments);
		};

		proto.remote_emit = function () {
			var event_type = _.last(arguments);
			var args = _.first(arguments, arguments.length - 1);
			args = _.map(args, summarize_value);
			this._emit("emit", {
				event_type: event_type,
				args: args
			});
		};

		proto.client_destroyed = function(getting, client_id) {
			var constraint_info = this.fn_call_constraints.get(getting);
			
			if(constraint_info.clients.hasOwnProperty(client_id)) {
				constraint_info.client_count--;
				if(constraint_info.client_count <= 0) {
					constraint_info.constraint.destroy();
				}
			}
		};

		proto.request = function (pre_processed_getting, callback, create_constraint, client_id) {
			var getting = process_args(pre_processed_getting);
			var fn_name = getting[0];
			var args = _.rest(getting);
			var object = this.get_object();

			if (create_constraint) {
				var add_to_clients = true;
				var self = this;
				var constraint_info = this.fn_call_constraints.get_or_put(getting, function () {
					var constraint = new cjs.Constraint(function () {
						var rv = object[fn_name].apply(object, args);
						return rv;
					});
					var on_change_listener = _.bind(function () {
						this._emit("changed", getting);
					}, this);
					constraint.onChange(on_change_listener);

					var old_destroy = constraint.destroy;
					constraint.destroy = function() {
						constraint.offChange(on_change_listener);
						self.fn_call_constraints.remove(getting);
						old_destroy.call(constraint);
					};

					add_to_clients = false;

					var clients = {};
					clients[client_id] = true;
					return {
						constraint: constraint,
						client_count: 1,
						clients: clients
					};
				}, this);

				if(add_to_clients) {
					if(!constraint_info.hasOwnProperty(client_id)) {
						constraint_info.clients[client_id] = true;
						constraint_info.client_count++;
					}
				}
				var constraint = constraint_info.constraint;

				callback(summarize_value(constraint.get()));
			} else {
				var rv = object[fn_name].apply(object, args);
				callback(summarize_value(rv));
			}
		};
	}(red.WrapperServer));
}(red));
