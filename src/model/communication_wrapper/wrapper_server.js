(function(red) {
var cjs = red.cjs, _ = red._;

var origin = window.location.protocol + "//" + window.location.host;
var MessageDistributionCenter = function() {
	able.make_this_listenable(this);
	window.addEventListener("message", _.bind(function(event) {
		var data = event.data;
		if(data.type === "wrapper_client") {
			this._emit("message", data.message, event.source);
		}
	}, this));
};
able.make_proto_listenable(MessageDistributionCenter.prototype);

var sdc = new MessageDistributionCenter();

sdc.on

var post = function(to_window, message) {
	to_window.postMessage(message, origin);
};


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

red.WrapperServer = function(options) {
	able.make_this_listenable(this);
	this.object = options.object;
	red.register_wrapper_server(this.object, this);
	this._type = "none";
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);

	proto.destroy = function() { };

	proto.type = function() {
		return this._type;
	};
	proto.get_object = function(){
		return this.object();
	};

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

}(red.WrapperServer));


//=========


red.StateWrapperServer = function(options) {
	red.StateWrapperServer.superclass.constructor.apply(this, arguments);
	this._type = "state";
};

(function(my) {
	_.proto_extend(my, red.WrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
	proto._is_active = make_async("is_active");
}(red.StateWrapperServer));

//=========

red.TransitionWrapperServer = function(options) {
	red.TransitionWrapperServer.superclass.constructor.apply(this, arguments);
	this._type = "transition";
	this.object.on("fire");
};

(function(my) {
	_.proto_extend(my, red.WrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};

	proto.on_fire = function() {
		this.post("fire");
	};
}(red.TransitionWrapperServer));

//=========

red.DictWrapperServer = function(options) {
	red.DictWrapperServer.superclass.constructor.apply(this, arguments);
	this.$children = new cjs.Constraint(this._children);
	this._type = "dict";
};

(function(my) {
	_.proto_extend(my, red.WrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};

	proto._children = make_async("children");
	proto._has = make_async("has");
	proto._get = make_async("get");
	proto._getget = make_async("getget");
}(red.DictWrapperServer));


//=========

red.StatefulObjectWrapperServer = function(options) {
	red.StatefulObjectWrapperServer.superclass.constructor.apply(this, arguments);
	this._type = "stateful";
};

(function(my) {
	_.proto_extend(my, red.DictWrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.StatefulObjectWrapperServer));


//=========


red.CellWrapperServer = function(options) {
	red.CellWrapperServer.superclass.constructor.apply(this, arguments);
	this._type = "cell";
};

(function(my) {
	_.proto_extend(my, red.WrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
	proto._val = make_async("val");
}(red.CellWrapperServer));


//=========

red.StatefulPropWrapperServer = function(options) {
	red.StatefulPropWrapperServer.superclass.constructor.apply(this, arguments);
	this._type = "stateful_prop";
};

(function(my) {
	_.proto_extend(my, red.WrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
	proto._val = make_async("val");
}(red.StatefulPropWrapperServer));


//=========

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

		if(object instanceof red.ContextualDict) {
			rv = new red.DictWrapperServer(object);
		}

		wrapper_servers[id] = rv;
		return rv;
	}
};
}(red));
