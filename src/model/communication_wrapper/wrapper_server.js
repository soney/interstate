/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,window,Box2D,RedMap */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	var id = 0;
	var ACTIVE = {},
		PAUSED = {};
	red.WrapperServer = function (options) {
		this._id = id++;
		able.make_this_listenable(this);
		this.object = options.object;
		this.object.on("begin_destroy", this.on_begin_destroy, this);
		this.object.on("destroyed", this.destroy, this);
		this._type = "none";
		this._event_type_listeners = options.listen_to || [];

		this.client_count = 0;
		this.client_ids = {};
		_.each(options.client_ids, function(client_id) {
			this.add_client_id(client_id);
		}, this);

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

		proto.id = function() { return this._id; };
		if(red.__debug) {
			proto.sid = function() { return parseInt(uid.strip_prefix(this.id()), 10); };
		}

		proto.add_client_id = function(client_id) {
			if(!this.client_ids.hasOwnProperty(client_id)) {
				this.client_ids[client_id] = ACTIVE;
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
			return this.client_count > 0;
		};

		proto.add_emission_listeners = function () {
			var object = this.get_object();
			_.each(this._event_type_listeners, function (event_type) {
				object.on(event_type, this.on_emit, this);
			}, this);
		};

		proto.remove_emission_listeners = function () {
			var object = this.get_object();
			_.each(this._event_type_listeners, function (event_type) {
				object.off(event_type, this.on_emit, this);
			}, this);
		};

		proto.client_paused = function(client_id) {
			if(this.client_ids.hasOwnProperty(client_id)) {
				this.client_ids[client_id] = PAUSED;
			}
		};

		proto.client_resumed = function(client_id) {
			if(this.client_ids.hasOwnProperty(client_id)) {
				this.client_ids[client_id] = ACTIVE;
			}
		};
		proto.on_begin_destroy = function() {
			//console.log("on_begin_destroy", this.object);
			//debugger;
			this.object.off("begin_destroy", this.on_begin_destroy, this);
			this.remove_emission_listeners();
			this.clear_fn_call_constraints();
		};
		proto.clear_fn_call_constraints = function() {
			this.fn_call_constraints.each(function(constraint_info, getting) {
				var constraint = constraint_info.constraint;
				constraint.destroy();
				this.fn_call_constraints.remove(getting);
			}, this);
		};

		proto.destroy = function () {
			//console.log("destroy", this.object);
			this._emit("destroy");
			this.object.off("begin_destroy", this.on_begin_destroy, this);
			this.object.off("destroyed", this.destroy, this);
			this.remove_emission_listeners();
			this.clear_fn_call_constraints();
			this.fn_call_constraints.destroy();
			delete this.fn_call_constraints;
			able.destroy_this_listenable(this);
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

		proto.client_destroyed = function(pre_processed_getting, client_id) {
			var getting = process_args(pre_processed_getting);
			var constraint_info = this.fn_call_constraints.get(getting);
			
			if(constraint_info.clients.hasOwnProperty(client_id)) {
				delete constraint_info.clients[client_id];
				constraint_info.client_count--;
				if(constraint_info.client_count <= 0) {
					constraint_info.constraint.destroy();
					this.fn_call_constraints.remove(getting);
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
						old_destroy.call(constraint, true); // silent in case getter is syncronous
					};

					add_to_clients = false;

					var clients = {};
					clients[client_id] = ACTIVE;
					return {
						constraint: constraint,
						client_count: 1,
						clients: clients
					};
				}, this);

				if(add_to_clients) {
					if(!constraint_info.clients.hasOwnProperty(client_id)) {
						constraint_info.clients[client_id] = ACTIVE;
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
		} else if(value instanceof red.ParsedFunction) {
			rv = {
				__type__: "summarized_obj",
				__value__: "function"
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
}(red));
