/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;
    
    ist.BasicObject = function (options, defer_initialization) {
		able.make_this_listenable(this);
        options = options || {};
        this._id = options.uid || uid();
        this._hash = uid.strip_prefix(this.id());
        this.options = options;
        ist.register_uid(this.id(), this);
        if (defer_initialization !== true) {
            this.initialize(options);
        }
    };
    (function (My) {
        var proto = My.prototype;
		able.make_proto_listenable(proto);

        My.builtins = { };

        ist.install_proto_builtins(proto, My.builtins);
        proto.initialize = function (options) {
			//options = options || this.options;
            ist.install_instance_builtins(this, options, My);
        };
		proto.clone = function() { };
		proto.begin_destroy = function () {
			this._emit("begin_destroy");
		};
        proto.destroy = function () {
			if(this.constructor === My) { this.begin_destroy(); }
			ist.unset_instance_builtins(this, My);
			ist.unregister_uid(this.id());
			this._emit("destroyed");
			able.destroy_this_listenable(this);
			this._destroyed = true;
        };
    
        proto.id = function () { return this._id; };
		proto.hash = function () { return this._hash; };
		proto.sid = function() { return parseInt(uid.strip_prefix(this.id()), 10); };
    
        proto.summarize = function () { return this.id(); };
    }(ist.BasicObject));

	var constraints = {};
	ist.registerConstraint = function(x) {
		var id = x._id;
		if(!constraints[id]) {
			constraints[id] = x;
			var oldDestroy = x.destroy;
			x.destroy = function() {
				ist.unregisterConstraint(x);
				delete x.destroy;
				return oldDestroy.apply(x, arguments);
			};
		}
		return id;
	};
	ist.findConstraint = function(id) {
		if(constraints.hasOwnProperty(id)) {
			return constraints[id];
		} else {
			debugger;
			return false;
		}
	};
	ist.unregisterConstraint = function(x) {
		var id = x._id;
		delete constraints[id];
	};
}(interstate));
