(function(red) {
var cjs = red.cjs, _ = red._;

var origin = window.location.protocol + "//" + window.location.host;
var MessageDistributionCenter = function() {
	able.make_this_listenable(this);
	window.addEventListener("message", _.bind(function(event) {
		var data = event.data;
		if(data.type === "wrapper_server") {
			this._emit("message", data.message, event.source);
		}
	}, this));
};
able.make_proto_listenable(MessageDistributionCenter.prototype);

var cdc = new MessageDistributionCenter();

red.WrapperClient = function(options) {
	this.server_window = options.server_window;
	this.cobj_id = options.cobj_id;

	this.post({
		type: "register_listener",
		cobj_id: this.cobj_id
	});
};

(function(my) {
	var proto = my.prototype;
	proto.destroy = function() { };
	proto.post = function(message) {
		this.server_window.postMessage({
			type: "wrapper_client",
			message: message
		}, origin);
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
