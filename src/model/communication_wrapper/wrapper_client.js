(function(red) {
var cjs = red.cjs, _ = red._;

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

var origin = window.location.protocol + "//" + window.location.host;
var MessageDistributionCenter = function() {
	able.make_this_listenable(this);
	window.addEventListener("message", _.bind(function(event) {
		var data = event.data;
		if(data.type === "wrapper_server") {
			this._emit("message", data.message, event.source);
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

var client_id = 0;
var message_id = 0;
red.WrapperClient = function(options) {
	this.server_window = options.server_window;
	this.cobj_id = options.cobj_id;

	this._id = client_id++;

	this.post({
		type: "register_listener",
		cobj_id: this.cobj_id
	});
};

(function(my) {
	var proto = my.prototype;
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
	proto.id = function() {
		return this._id;
	};
}(red.WrapperClient));

//=========

red.DictWrapperClient = function(options) {
	red.DictWrapperClient.superclass.constructor.apply(this, arguments);
	this._type = "dict";
};

(function(my) {
	_.proto_extend(my, red.WrapperClient);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};

	proto.get_children = function() {
		var callback = last(arguments);
		var request_id = this.post({
			type: "get",
			name: "get_children",
			arguments: []
		});
		register_response_listener(request_id, callback);
	};
}(red.DictWrapperClient));


red.get_wrapper_client = function(object_summary, server_window) {
	var otype = object_summary.type;
	var cobj_id = object_summary.id;
	var rv;

	if(otype === "dict") {
		rv = new red.DictWrapperClient({
			server_window: server_window,
			cobj_id: cobj_id
		});
	}

	return rv;
};


}(red));
