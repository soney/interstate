/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;
    
    ist.StatefulObj = function (options, defer_initialization) {
        options = options || {};
        ist.StatefulObj.superclass.constructor.apply(this, arguments);
    
        this.type = "ist_stateful_obj";
    
        if (defer_initialization !== true) {
            this.do_initialize(options);
        }
    };
    (function (My) {
        _.proto_extend(My, ist.Dict);
        var proto = My.prototype;
    
        proto.do_initialize = function (options) {
            My.superclass.do_initialize.apply(this, arguments);
            ist.install_instance_builtins(this, options, My);
        };
    
        My.builtins = {
            "direct_statechart": {
                "default": function () { return new ist.Statechart(); },
                getter_name: "get_own_statechart",
                settable: false,
				destroy: function(me) {
					me.destroy(true);
				}
            }
        };
        ist.install_proto_builtins(proto, My.builtins);
        proto.destroy = function () {
			ist.unset_instance_builtins(this, My);
            My.superclass.destroy.apply(this, arguments);
        };
    
        ist.register_serializable_type("stateful_obj",
            function (x) {
                return x instanceof My;
            },
            My.superclass.serialize,
            function (obj) {
                var rest_args = _.rest(arguments);
                var builtins = _.extend({}, My.builtins, My.superclass.constructor.builtins);

                var serialized_options = {};
                _.each(builtins, function (builtin, name) {
                    serialized_options[name] = obj[name];
                });

                var rv = new My({uid: obj.uid}, true);
                rv.initialize = function () {
                    var options = {};
                    _.each(serialized_options, function (serialized_option, name) {
                        options[name] = ist.deserialize.apply(ist, ([serialized_option]).concat(rest_args));
                    });
                    this.do_initialize(options);
                };

                return rv;
            });
    }(ist.StatefulObj));
	/*
    
    ist.define("stateful_obj", function (options, defer_init) {
        var dict = new ist.StatefulObj(options, defer_init);
        return dict;
    });

*/
}(interstate));
