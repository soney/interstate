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
	ist.__empty_files = false;
	ist.cjs.__debug = ist.__debug;
	ist.__debug_statecharts = ist.__debug;

	able.make_this_listenable(ist);
	able.make_proto_listenable(ist);

	ist.register_uid = function (id, obj) {
		uid_objs[id] = obj;
		ist._emit("uid_registered", id, obj);
	};
	ist.unregister_uid = function (id) {
		delete uid_objs[id];
		ist._emit("uid_unregistered", id);
	};
	ist.find_uid = function (uid) { return uid_objs[uid]; };

	var valid_prop_name_regex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
	ist.is_valid_prop_name = function(name) {
		return name.match(valid_prop_name_regex);
	};

	return ist;
}(this));
