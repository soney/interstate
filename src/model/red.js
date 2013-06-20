/*jslint nomen: true */
/*global cjs,esprima,_,able,uid */

var red = (function (root) {
    "use strict";
	var red = function () { },
        factories = {},
        uid_objs = {};
    
	red.cjs = cjs.noConflict();
	red.esprima = esprima;
	red._ = _.noConflict();
	red.version = "<%= version %>";
	red.build_time = "<%= build_time %>";

	red.__debug_statecharts = true;

	able.make_this_listenable(red);
	able.make_proto_listenable(red);

	red.define = function (type, factory) {
		factories[type] = factory;
	};
    
	red.create = function (type) {
		if (factories.hasOwnProperty(type)) {
			var factory = factories[type],
                args = [].slice.call(arguments, 1);
			
            return factory.apply(root, args);
		} else {
			return undefined;
		}
	};

    
	red.register_uid = function (uid, obj) {
		uid_objs[uid] = obj;
		red._emit("uid_registered", uid, obj);
	};
	red.unregister_uid = function (uid) {
		delete uid_objs[uid];
		red._emit("uid_unregistered", uid);
	};
	red.find_uid = function (uid) {
		return uid_objs[uid];
	};
	red.each_registered_obj = function (func, context) {
		red._.each(uid_objs, func, context);
	};

	red.is_valid_prop_name = function(name) {
		return name.match(/^[a-zA-Z_$][0-9a-zA-Z_$]*$/);
	};

	return red;
}(this));
