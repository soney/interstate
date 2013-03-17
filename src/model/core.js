var red = (function(root) {
	var red = function() { };
	red.cjs = cjs.noConflict();
	red.esprima = esprima;
	red._ = _.noConflict();
	red.__debug = true;

	able.make_this_listenable(red);
	able.make_proto_listenable(red);

	var factories = {};
	red.define = function(type, factory) {
		factories[type] = factory;
	};
	red.create = function(type) {
		if(factories.hasOwnProperty(type)) {
			var factory = factories[type];
			var args = [].slice.call(arguments, 1);
			return factory.apply(root, args);
		} else {
			return undefined;
		}
	};
	var uid_objs = {};
	var prefix = uid.get_prefix();
	red.register_uid = function(uid, obj) {
		uid_objs[uid] = obj;
		red._emit("uid_registered", uid, obj);
	};
	red.unregister_uid = function(uid) {
		delete uid_objs[uid];
		red._emit("uid_unregistered", uid, obj);
	};
	red.find_uid = function(uid) {
		return uid_objs[uid];
	};
	red.each_registered_obj = function(func, context) {
		red._.each(uid_objs, func, context);
	};

	return red;
}(this));
