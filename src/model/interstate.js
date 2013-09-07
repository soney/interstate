/*jslint nomen: true */
/*global cjs,esprima,_,able,uid */

var interstate = (function (root) {
    "use strict";
	var ist = function () { },
        factories = {},
        uid_objs = {};
    
	ist.cjs = cjs.noConflict();
	ist.esprima = esprima;
	ist._ = _.noConflict();
	ist.version = "<%= version %>";
	ist.build_time = "<%= build_time %>";
	ist.__debug = false;
	ist.cjs.__debug = ist.__debug;
	ist.__debug_statecharts = ist.__debug;

	able.make_this_listenable(ist);
	able.make_proto_listenable(ist);

	ist.register_uid = function (uid, obj) {
		uid_objs[uid] = obj;
		ist._emit("uid_registered", uid, obj);
	};
	ist.unregister_uid = function (uid) {
		delete uid_objs[uid];
		ist._emit("uid_unregistered", uid);
	};
	ist.find_uid = function (uid) {
		return uid_objs[uid];
	};
	ist.each_registered_obj = function (func, context) {
		ist._.each(uid_objs, func, context);
	};

	ist.is_valid_prop_name = function(name) {
		return name.match(/^[a-zA-Z_$][0-9a-zA-Z_$]*$/);
	};

	return ist;
}(this));
