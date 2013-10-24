/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;
    
    ist.StatefulProp = function (options, defer_initialization) {
		able.make_this_listenable(this);
        options = options || {};
    
        this._id = options.uid || uid();
        ist.register_uid(this._id, this);
    
        if (defer_initialization !== true) {
            this.do_initialize(options);
        }
    };
    (function (My) {
        var proto = My.prototype;
		able.make_proto_listenable(proto);
    
        proto.do_initialize = function (options) {
            ist.install_instance_builtins(this, options, My);
            this.get_direct_values().setHash("hash");
            //this.used_start_transition = options.used_start_transition === true;
            //this._can_inherit = options.can_inherit !== false;
            //this._ignore_inherited_in_contexts = _.isArray(options.ignore_inherited_in_contexts) ? options.ignore_inherited_in_contexts : [];
            //this._check_on_nullify = options.check_on_nullify === true;
        };
    
        My.builtins = {
            "direct_values": {
                "default": function () { return cjs.map(); },
                env_visible: false,
				destroy: function(me) {
					me.forEach(function(val) {
						val.destroy(true);
					});
					me.destroy(true);
				}
            },
    
            "can_inherit": {
                "default": function () { return true; }
            },
    
            "statechart_parent": {
                "default": function () {
                    return "parent";
                },
				destroy: function(me) {
				}
            }
        };
    
        ist.install_proto_builtins(proto, My.builtins);
    
        //
        // === PARENTAGE ===
        //
    
        var state_basis = function (state) {
            var basis = state.basis();
            if (_.isUndefined(basis)) {
                basis = state;
            }
            return basis;
        };
    
    
        //
        // === DIRECT VALUES ===
        //
        proto.set = proto._set_direct_value_for_state = function (state, value) {
            state = state_basis(state);
            this.get_direct_values().put(state, value);
        };
		proto.clone = function(cprop) {
			var infos = cprop.get_values();
			var keys = [];
			var vals = [];
			_.each(infos, function(info) {
				keys.push(info.state.basis());
				vals.push(info.value.clone());
			});
			var direct_values = cjs.map({
				keys: keys,
				values: vals
			});
			var rv = new ist.StatefulProp({
				direct_values: direct_values
			});
			return rv;
		};
        proto.unset = proto._unset_direct_value_for_state = function (state) {
            var dvs = this.get_direct_values();
            state = state_basis(state);
            var val = dvs.get(state);
			/*
            if (val) {
                val.destroy();
            }
			*/
            dvs.remove(state);
        };
        proto._direct_value_for_state = function (state) {
            state = state_basis(state);
            return this.get_direct_values().get(state);
        };
        proto._has_direct_value_for_state = function (state) {
            state = state_basis(state);
            return this.get_direct_values().has(state);
        };
        
        proto.id = proto.hash = function () { return this._id; };
		if(ist.__debug) {
			proto.sid = function() { return parseInt(uid.strip_prefix(this.id()), 10); };
		}
    
        proto.destroy = function () {
			ist.unset_instance_builtins(this, My);
			ist.unregister_uid(this.id());
			able.destroy_this_listenable(this);
        };
    
        ist.register_serializable_type("stateful_prop",
            function (x) {
                return x instanceof My;
            },
            function (include_uid) {
                var args = _.toArray(arguments);
                var rv = {
                    //direct_values: ist.serialize.apply(ist, ([this.get_direct_values()]).concat(arg_array))
                    //can_inherit: ist.serialize.apply(ist, ([this._can_inherit]).concat(args))
                    //ignore_inherited_in_contexts: ist.serialize.apply(ist, ([this._ignore_inherited_in_contexts]).concat(args))
                    //, check_on_nullify: ist.serialize.apply(ist, ([this._check_on_nullify]).concat(args))
                };
                _.each(My.builtins, function (builtin, name) {
                    if (builtin.serialize !== false) {
                        var getter_name = builtin._get_getter_name();
                        rv[name] = ist.serialize.apply(ist, ([this[getter_name]()]).concat(args));
                    }
                }, this);
                if (include_uid) {
                    rv.uid = this.id();
                }
                return rv;
            },
            function (obj, options) {
                var rv = new My({uid: obj.uid}, true);
    
                var serialized_options = {};
                _.each(My.builtins, function (builtin, name) {
                    if (builtin.serialize !== false) {
                        serialized_options[name] = obj[name];
                    }
                });
    
                var rest_args = _.rest(arguments, 2);
                rv.initialize = function () {
                    options = _.extend({
                        //direct_values: ist.deserialize.apply(ist, ([obj.direct_values]).concat(rest_args))
                    //	can_inherit: ist.deserialize.apply(ist, ([obj.can_inherit, options]).concat(rest_args))
                    //	, ignore_inherited_in_contexts: ist.deserialize.apply(ist, ([obj.ignore_inherited_in_contexts, options]).concat(rest_args))
                    //	, check_on_nullify: ist.deserialize.apply(ist, ([obj.check_on_nullify, options]).concat(rest_args))
                    }, options);
                    _.each(serialized_options, function (serialized_option, name) {
                        options[name] = ist.deserialize.apply(ist, ([serialized_option, options]).concat(rest_args));
                    });
                    this.do_initialize(options);
					options = null;
                };
                return rv;
            });
    }(ist.StatefulProp));
	/*
    
    ist.define("stateful_prop", function (options) {
        var prop = new ist.StatefulProp(options);
        return prop;
    });

*/
}(interstate));
