(function(red) {
var cjs = red.cjs, _ = red._;
var origin = window.location.protocol + "//" + window.location.host;

var chop = function(args) {
	return _.first(args, args.length-1);
};
var last = function(args) {
	return _.last(args);
};

this.pending_responses = {};
this.response_listeners = {};

var register_response_listener = function(id, listener) {
	if(this.pending_responses.hasOwnProperty(id)) {
		listener(pending_responses[id]);
		delete pending_responses[id];
	} else {
		response_listeners[id] = listener;
	}
};

var MessageDistributionCenter = function() {
	able.make_this_listenable(this);
	window.addEventListener("message", _.bind(function(event) {
		var data = event.data;
		if(data.type === "wrapper_server") {
			this._emit("message", data.message, event.source);
			var client_id = data.client_id;
			var server_message = data.server_message;

			var type = server_message.type;
			if(type === "changed") {
				var client = clients[client_id];
				client.on_change.apply(client, server_message.getting);
			} else if(type === "emit") {
				var client = clients[client_id];
				client.on_emit.call(client, server_message.args);
			}
		} else if(data.type === "response") {
			var data = event.data,
				request_id = data.request_id,
				response = data.response;
			if(response_listeners.hasOwnProperty(request_id)) {
				response_listeners[request_id](response);
				delete response_listeners[request_id];
			} else {
				pending_responses[request_id] = response;
			}
		}
	}, this));
};
able.make_proto_listenable(MessageDistributionCenter.prototype);

var cdc = new MessageDistributionCenter();


var clients = {};

var client_id = 0;
var message_id = 0;

red.WrapperClient = function(options) {
	able.make_this_listenable(this);
	this.server_window = options.server_window;
	this.cobj_id = options.cobj_id;
	this._type = options.type;
	this.object_summary = options.object_summary;

	this._id = client_id++;
	clients[this._id] = this;

	this.fn_call_constraints = new Map({
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

	this.post({
		type: "register_listener",
		cobj_id: this.cobj_id
	});
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);

	proto.destroy = function() { };
	proto.post = function(message) {
		var m_id = message_id++;
		this.server_window.postMessage({
			type: "wrapper_client",
			client_id: this.id(),
			message: message,
			message_id: m_id,
			cobj_id: this.cobj_id
		}, origin);
		return m_id;
	};
	proto.id = function() { return this._id; };
	proto.type = function() { return this._type; };

	proto.get = function() {
		var args = summarize_args(arguments);
		var to_update = false;
		var constraint = this.fn_call_constraints.get_or_put(args, function() {
			var rv = new cjs.SettableConstraint();
			to_update = true;
			return rv;
		});
		if(to_update) {
			this.update(args);
		}
		return constraint.get();
	};


	proto.update = function(args) {
		var constraint = this.fn_call_constraints.get_or_put(args, function() {
			return new cjs.SettableConstraint();
		});

		var request_id = this.post({
			type: "get",
			getting: args
		});
		register_response_listener(request_id, _.bind(function(value) {
			var processed_value = this.process_value(value);
			constraint.set(processed_value);
		}, this));
	};

	proto.on_change = function() {
		var args = summarize_args(arguments);
		//var constraint = this.fn_call_constraints.get(args);
		//if(constraint) { constraint.invalidate(); }
		// Why update now when you can update when ready?
		
		this.update(args);
	};
	proto.on_emit = function(args) {
		var args = this.process_value(args);
		this._emit.apply(this, args);
	};
	proto.process_value = function(value) {
		if(value && value.__type__ && value.__type__ === "summarized_obj") {
			var val = value.__value__;
			if(val === "function") {
				return "(native function)";
			} else if(val === "contextual_obj") {
				var object_summary = value.object_summary;
				var wrapper_client = red.get_wrapper_client(object_summary, this.server_window);
				return wrapper_client;
			} else if(val === "state") {
				var object_summary = value.object_summary;
				var wrapper_client = red.get_wrapper_client(object_summary, this.server_window);
				return wrapper_client;
			} else if(val === "transition") {
				var object_summary = value.object_summary;
				var wrapper_client = red.get_wrapper_client(object_summary, this.server_window);
				return wrapper_client;
			} else if(val === "event") {
				var object_summary = value.object_summary;
				var wrapper_client = red.get_wrapper_client(object_summary, this.server_window);
				return wrapper_client;
			} else if(val === "client_wrapper") {
				return "(communication wrapper)";
			} else if(val === "constraint") {
				return "(cjs constraint)";
			}

			return val;
		} else if(_.isArray(value)) {
			return _.map(value, _.bind(this.process_value, this));
		} else if(_.isObject(value)) {
			var rv = {};
			_.each(value, function(v, k) { rv[k] = this.process_value(v); }, this)
			return rv;
		} else {
			return value;
		}
	};
}(red.WrapperClient));

var summarize_arg = function(arg) {
	return arg;
};
var argeq = function(arg1, arg2) {
	return arg1 === arg2;
};
var summarize_args = function(args) { return _.map(args, summarize_arg); };

var wrapper_clients = {};

red.register_wrapper_client = function(object, client) {
	wrapper_clients[object.id()] = client;
};

red.get_wrapper_client = function(object_summary, server_window) {
	var cobj_id = object_summary.id;
	if(wrapper_clients.hasOwnProperty(cobj_id)) {
		return wrapper_clients[cobj_id];
	} else {
		var otype = object_summary.type;
		var rv;

		rv = new red.WrapperClient({
			server_window: server_window,
			cobj_id: cobj_id,
			type: otype,
			object_summary: object_summary
		});

		wrapper_clients[cobj_id] = rv;
		return rv;
	}
};


}(red));
