(function(red) {
var cjs = red.cjs, _ = red._;

var origin = window.location.protocol + "//" + window.location.host;
var MessageDistributionCenter = function() {
	able.make_this_listenable(this);
	window.addEventListener("message", _.bind(function(event) {
		var data = event.data;
		if(data.type === "wrapper_client") {
			var client_id = data.client_id;
			this._emit("message", data.message, event);
		}
	}, this));
};
able.make_proto_listenable(MessageDistributionCenter.prototype);


var get_channel_listener = function(client_window, client_id) {
	return {
		type: "channel",
		client_window: client_window,
		client_id: client_id
	};
};

var sdc = new MessageDistributionCenter();
sdc.on("message", function(message, event) {
	var type = message.type;

	var client_window = event.source,
		client_id = event.data.client_id;
	if(type === "register_listener") {
		var cobj_id = message.cobj_id;
		var cobj = red.find_uid(cobj_id);
		var server = red.get_wrapper_server(cobj);

		server.register_listener(get_channel_listener(client_window, client_id));
	} else if(type === "get") { // async request
		var cobj_id = event.data.cobj_id;
		var cobj = red.find_uid(cobj_id);
		var server = red.get_wrapper_server(cobj);

		var request_id = event.data.message_id;

		var processed_getting = process_args(message.getting);

		server.on_request(processed_getting, function(response) {
			var summarized_response = summarize_value(response);
			client_window.postMessage({
				type: "response",
				request_id: request_id,
				client_id: client_id,
				response: summarized_response
			}, origin);
		});
	}
});

var chop = function(args) {
	return _.first(args, args.length-1);
};
var last = function(args) {
	return _.last(args);
};

var make_async = function(object_func_name) {
	return function() {
		var args = chop(arguments),
			callback = last(arguments);

		var value = this.object[object_func_name].apply(this.object, args);
		callback(value);
	};
};

var argeq = function(arg1, arg2) {
	return arg1 === arg2;
};
red.WrapperServer = function(options) {
	able.make_this_listenable(this);
	this.object = options.object;
	this._type = "none";
	this.client_listeners = [];

	this.fn_call_constraints = cjs.map({
		hash: function(args) {
			return args[0];
		},
		equals: function(args1, args2) {
			var len = args1.length
			if(len !== args2.length) {
				return false;
			} else {
				for(var i = 0; i<len; i++) {
					if(!argeq(args1[i], args2[i])) {
						return false;
					}
				}
				return true;
			}
		}
	});
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);

	proto.destroy = function() { };

	proto.type = function() {
		return this._type;
	};
	proto.get_object = function(){
		return this.object;
	};
	proto.register_listener = function(listener_info) {
		this.client_listeners.push(listener_info);
	};

	proto.on_request = function(getting, callback) {
		var constraint = this.fn_call_constraints.get_or_put(getting, function() {
			var fn_name = getting[0];
			var args = _.rest(getting);
			var object = this.get_object();
			var constraint = new cjs.Constraint(function() {
				var rv = object[fn_name].apply(object, args);
				return rv;
			});
			constraint.onChange(_.bind(function() {
				this.post({
					type: "changed",
					getting: getting
				});
			}, this));
			return constraint;
		}, this);

		callback(constraint.get());
	};

	proto.post = function(data) {
		var len = this.client_listeners.length;
		var full_message = {
			type: "wrapper_server",
			server_message: data
		};
		for(var i = 0; i<len; i++) {
			var cl = this.client_listeners[i];
			if(cl.type === "channel") {
				var client_window = cl.client_window,
					client_id = cl.client_id;
				client_window.postMessage(_.extend({
					client_id: client_id
				}, full_message), origin);
			}
		}
	};

/*
	proto.summarize = function() {
		var object = this.get_object();
		var summarized_object = object.summarize();
		var type = this.get_type();
		return {
			cobject: summarized_object,
			type: type
		};
	};

	my.desummarize = function(obj) {
		var pointer = red.Pointer.desummarize(obj.pointer);
		var object = red.find_uid(obj.object_uid);
		return red.find_or_put_contextual_obj(object, pointer);
	};
	*/

}(red.WrapperServer));



var process_args = function(args) { return _.map(args, process_arg); };
var process_arg = function(arg) {
	return arg;
};
var summarize_value = function(value) {
	var rv;
	if(value instanceof red.ContextualObject) {
		var id = value.id();
		rv = {
			__type__: "summarized_obj",
			__value__: "contextual_obj",
			object_summary: value.summarize()
		};
	} else if(value instanceof red.StartState) {
		rv = {
			__type__: "summarized_obj",
			__value__: "state",
			object_summary: {
					type: 'start_state',
					id: value.id()
				}
		};
	} else if(value instanceof red.Statechart) {
		rv = {
			__type__: "summarized_obj",
			__value__: "state",
			object_summary: {
					type: 'statechart',
					id: value.id()
				}
		};
	} else if(value instanceof red.StatechartTransition) {
		rv = {
			__type__: "summarized_obj",
			__value__: "transition",
			object_summary: {
					type: 'transition',
					id: value.id()
				}
		};
	} else if(value instanceof red.Event) {
		rv = {
			__type__: "summarized_obj",
			__value__: "event",
			object_summary: {
					type: 'event',
					id: value.id(),
					event_type: value.type()
				}
		};
	} else if(value instanceof red.Cell) {
		rv = {
			__type__: "summarized_obj",
			__value__: "contextual_obj",
			object_summary: {
					type: 'raw_cell',
					id: value.id()
				}
		};
	} else if(value instanceof red.WrapperClient) {
		rv = {
			__type__: "summarized_obj",
			__value__: "client_wrapper"
		};
	} else if(cjs.is_$(value)) {
		rv = {
			__type__: "summarized_obj",
			__value__: "constraint"
		};
	} else if(_.isArray(value)) {
		rv = _.map(value, summarize_value);
	} else if(_.isFunction(value)) {
		rv = {
			__type__: "summarized_obj",
			__value__: "function"
		};
	} else if(_.isObject(value)) {
		rv = {};
		_.each(value, function(v, k) { rv[k] = summarize_value(v); })
	} else {
		rv = value;
	}
	return rv;
};

var wrapper_servers = {};

red.register_wrapper_server = function(object, server) {
	wrapper_servers[object.id()] = server;
};

red.get_wrapper_server = function(object) {
	var id = object.id();
	if(wrapper_servers.hasOwnProperty(id)) {
		return wrapper_servers[id];
	} else {
		var rv;
		
		rv = new red.WrapperServer({
			object: object
		});

		wrapper_servers[id] = rv;
		return rv;
	}
};
}(red));
