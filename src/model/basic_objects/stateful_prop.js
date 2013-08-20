/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;
    
    red.StatefulProp = function (options, defer_initialization) {
		able.make_this_listenable(this);
        options = options || {};
    
        this._id = options.uid || uid();
        red.register_uid(this._id, this);
    
        if (defer_initialization !== true) {
            this.do_initialize(options);
        }
    };
    (function (My) {
        var proto = My.prototype;
		able.make_proto_listenable(proto);
    
        proto.do_initialize = function (options) {
            red.install_instance_builtins(this, options, My);
            this.get_direct_values().set_hash("hash");
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
					me.each(function(val) {
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
    
        red.install_proto_builtins(proto, My.builtins);
    
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
			var values = cprop.get_values();
			var keys = [];
			var vals = [];
			_.each(values, function(info) {
				keys.push(info.state.basis());
				vals.push(info.value.clone());
			});
			var direct_values = cjs.map({
				keys: keys,
				values: values
			});
			var rv = new red.StatefulProp({
				direct_values: direct_values
			});
			console.log(rv);
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
    
        proto.destroy = function () {
			red.unset_instance_builtins(this, My);
			red.unregister_uid(this.id());
			able.destroy_this_listenable(this);
        };
    
        red.register_serializable_type("stateful_prop",
            function (x) {
                return x instanceof My;
            },
            function (include_uid) {
                var args = _.toArray(arguments);
                var rv = {
                    //direct_values: red.serialize.apply(red, ([this.get_direct_values()]).concat(arg_array))
                    //can_inherit: red.serialize.apply(red, ([this._can_inherit]).concat(args))
                    //ignore_inherited_in_contexts: red.serialize.apply(red, ([this._ignore_inherited_in_contexts]).concat(args))
                    //, check_on_nullify: red.serialize.apply(red, ([this._check_on_nullify]).concat(args))
                };
                _.each(My.builtins, function (builtin, name) {
                    if (builtin.serialize !== false) {
                        var getter_name = builtin._get_getter_name();
                        rv[name] = red.serialize.apply(red, ([this[getter_name]()]).concat(args));
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
                        //direct_values: red.deserialize.apply(red, ([obj.direct_values]).concat(rest_args))
                    //	can_inherit: red.deserialize.apply(red, ([obj.can_inherit, options]).concat(rest_args))
                    //	, ignore_inherited_in_contexts: red.deserialize.apply(red, ([obj.ignore_inherited_in_contexts, options]).concat(rest_args))
                    //	, check_on_nullify: red.deserialize.apply(red, ([obj.check_on_nullify, options]).concat(rest_args))
                    }, options);
                    _.each(serialized_options, function (serialized_option, name) {
                        options[name] = red.deserialize.apply(red, ([serialized_option, options]).concat(rest_args));
                    });
                    this.do_initialize(options);
					options = null;
                };
                return rv;
            });
    }(red.StatefulProp));
	/*
    
    red.define("stateful_prop", function (options) {
        var prop = new red.StatefulProp(options);
        return prop;
    });

*/
}(red));
