/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;
    
    red.StatefulObj = function (options, defer_initialization) {
        options = options || {};
        red.StatefulObj.superclass.constructor.apply(this, arguments);
    
        this.type = "red_stateful_obj";
    
        if (defer_initialization !== true) {
            this.do_initialize(options);
        }
    };
    (function (My) {
        _.proto_extend(My, red.Dict);
        var proto = My.prototype;
    
        proto.do_initialize = function (options) {
            My.superclass.do_initialize.apply(this, arguments);
            red.install_instance_builtins(this, options, My);
        };
    
        My.builtins = {
            "direct_statechart": {
                "default": function () { return red.create("statechart"); },
                getter_name: "get_own_statechart",
                settable: false,
				destroy: function(me) {
					me.destroy();
				}
            }
        };
        red.install_proto_builtins(proto, My.builtins);
        proto.destroy = function () {
			red.unset_instance_builtins(this, My);
            My.superclass.destroy.apply(this, arguments);
        };
    
        red.register_serializable_type("stateful_obj",
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
                        options[name] = red.deserialize.apply(red, ([serialized_option]).concat(rest_args));
                    });
                    this.do_initialize(options);
                };

                return rv;
            });
    }(red.StatefulObj));
    
    red.define("stateful_obj", function (options, defer_init) {
        var dict = new red.StatefulObj(options, defer_init);
        return dict;
    });

}(red));
