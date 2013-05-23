/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,window,RedMap */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var summarize_arg = function (arg) { return arg; };
	var summarize_args = function (args) { return _.map(args, summarize_arg); };
	var chop = function (args) {
		return _.first(args, args.length - 1);
	};
	var last = function (args) {
		return _.last(args);
	};

	var argeq = function (arg1, arg2) {
		return arg1 === arg2;
	};


	var client_id = 0;
	var message_id = 0;

	red.WrapperClient = function (options) {
		able.make_this_listenable(this);
		this.semaphore = 0;
		this.comm_mechanism = options.comm_mechanism;
		this.cobj_id = options.cobj_id;
		this.obj_id = options.obj_id;
		this._type = options.type;
		this.object_summary = options.object_summary;
		this.program_state_client = options.program_state_client;

		this._id = client_id;
		client_id += 1;

		this.fn_call_constraints = new RedMap({
			hash: function (args) {
				return args[0];
			},
			equals: function (args1, args2) {
				var i, len = args1.length;
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

		this.$on_message = _.bind(this.on_message, this);
	};

	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);

		proto.on_ready = function() {
			this.post({
				type: "register_listener",
				cobj_id: this.cobj_id
			});
		};
		proto.signal_interest = function() {
			this.semaphore++;
		};
		proto.signal_destroy = function() {
			if(--this.semaphore <= 0) {
				this.destroy();
			}
		};

		proto.on_message = function(message) {
		};

		proto.destroy = function () {
			this.post({
				type: "destroy"
			});
			able.destroy_this_listenable(this);
		};

		proto.post = function (message) {
			var m_id = message_id;
			if(m_id === 47) { debugger; }
			message_id += 1;
			this.comm_mechanism.post({
				type: "wrapper_client",
				client_id: this.id(),
				message: message,
				message_id: m_id,
				cobj_id: this.cobj_id
			});
			return m_id;
		};
		proto.id = function () { return this._id; };
		proto.type = function () { return this._type; };

		proto.async_get = function () {
			// doesn't store the value in a constraint; uses a callback when it's ready instead
			var args = summarize_args(_.first(arguments, arguments.length - 1));
			var callback = _.last(arguments);

			var request_id = this.post({
				type: "async_get",
				getting: args
			});
			this.program_state_client.register_response_listener(request_id, _.bind(function (value) {
				var processed_value = this.process_value(value);
				callback(processed_value);
			}, this));
		};

		proto.get_$ = function () {
			var args = summarize_args(arguments);
			var to_update = false;
			var self = this;
			var constraint = this.fn_call_constraints.get_or_put(args, function () {
				var rv = new cjs.SettableConstraint();
				var old_destroy = rv.destroy;
				rv.destroy = function() {
					self.fn_call_constraints.remove(args);
					self.post({
						getting: args,
						type: "destroy_$"
					});
					old_destroy.call(rv);
				};
				var semaphore = 0;
				rv.signal_interest = function() { semaphore++; };
				rv.signal_destroy = function() {
					if(--semaphore <= 0) {
						rv.destroy();
					}
				};

				to_update = true;
				return rv;
			});
			constraint.signal_interest();
			if (to_update) {
				this.update(args, constraint);
			}
			return constraint;
		};


		proto.update = function (args, constraint) {
			constraint = constraint || this.fn_call_constraints.get(args);

			var request_id = this.post({
				type: "get_$",
				getting: args
			});
			this.program_state_client.register_response_listener(request_id, _.bind(function (value) {
				var processed_value = this.process_value(value);
				constraint.set(processed_value);
			}, this));
		};

		proto.on_change = function () {
			var args = summarize_args(arguments);
			//var constraint = this.fn_call_constraints.get(args);
			//if (constraint) { constraint.invalidate(); }
			// Why update now when you can update when ready?
			
			this.update(args);
		};
		proto.on_emit = function (event_type) {
			var args = _.rest(arguments);
			args = this.process_value(args);

			this._emit.apply(this, ([event_type]).concat(args));
		};
		proto.process_value = function (value) {
			if (value && value.__type__ && value.__type__ === "summarized_obj") {
				var val = value.__value__;
				var object_summary, wrapper_client;
				if (val === "function") {
					return "(native function)";
				} else if (val === "cjs_object") {
					return "(native object)";
				} else if (val === "contextual_obj") {
					object_summary = value.object_summary;
					wrapper_client = this.program_state_client.get_wrapper_client(object_summary, this.comm_mechanism);
					return wrapper_client;
				} else if (val === "state") {
					object_summary = value.object_summary;
					wrapper_client = this.program_state_client.get_wrapper_client(object_summary, this.comm_mechanism);
					return wrapper_client;
				} else if (val === "transition") {
					object_summary = value.object_summary;
					wrapper_client = this.program_state_client.get_wrapper_client(object_summary, this.comm_mechanism);
					return wrapper_client;
				} else if (val === "event") {
					object_summary = value.object_summary;
					wrapper_client = this.program_state_client.get_wrapper_client(object_summary, this.comm_mechanism);
					return wrapper_client;
				} else if (val === "client_wrapper") {
					return "(communication wrapper)";
				} else if (val === "constraint") {
					return "(cjs constraint)";
				} else if(val === "dom_elem") {
					return "(dom element)";
				}

				return val;
			} else if (_.isArray(value)) {
				return _.map(value, _.bind(this.process_value, this));
			} else if (_.isObject(value)) {
				var rv = {};
				_.each(value, function (v, k) { rv[k] = this.process_value(v); }, this);
				return rv;
			} else {
				return value;
			}
		};
	}(red.WrapperClient));
}(red));
