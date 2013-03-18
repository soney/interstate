(function(red) {
var cjs = red.cjs, _ = red._;

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
	this.object = options.object;
	red.register_wrapper_server(this.object, this);
};

(function(my) {
	var proto = my.prototype;
	proto.destroy = function() { };

	proto.post = function() {
	};
	
}(red.WrapperServer));


//=========


red.StateWrapperServer = function(options) {
	red.StateWrapperServer.superclass.constructor.apply(this, arguments);
};

(function(my) {
	_.proto_extend(my, red.WrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
	proto.async = make_async("is_active");
}(red.StateWrapperServer));

//=========

red.TransitionWrapperServer = function(options) {
	red.TransitionWrapperServer.superclass.constructor.apply(this, arguments);
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
};

(function(my) {
	_.proto_extend(my, red.WrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.DictWrapperServer));


//=========

red.StatefulObjectWrapperServer = function(options) {
	red.StatefulObjectWrapperServer.superclass.constructor.apply(this, arguments);
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
};

(function(my) {
	_.proto_extend(my, red.WrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.CellWrapperServer));


//=========

red.StatefulPropWrapperServer = function(options) {
	red.StatefulPropWrapperServer.superclass.constructor.apply(this, arguments);
};

(function(my) {
	_.proto_extend(my, red.WrapperServer);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.StatefulPropWrapperServer));


//=========

var wrapper_servers = {};

red.register_wrapper_server = function(object, server) {
	wrapper_servers[object] = server;
};

red.get_wrapper_server = function(object) {
};
}(red));
