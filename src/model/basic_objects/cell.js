/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;
    
    red.Cell = function (options, defer_initialization) {
        options = options || {};
        this._id = options.uid || uid();
        red.register_uid(this._id, this);
        if (defer_initialization !== true) {
            this.do_initialize(options);
        }
    };
    (function (My) {
        var proto = My.prototype;
        My.builtins = {
            "str": {
                start_with: function () { return cjs.$(""); },
                getter: function (me) { return me.get(); },
                setter: function (me, str) {
                    me.set(str, true);
                },
				destroy: function(me) {
					me.destroy();
				}
            },
            "ignore_inherited_in_first_dict": {
                "default": function () { return false; }
            },
            "contextual_values": {
                "default": function () {
                    return cjs.map({
                        equals: red.check_pointer_equality,
                        hash: "hash"
                    });
                },
                settable: false,
                serialize: false,
				destroy: function(me) {
					me.each(function (value) {
						value.destroy();
					});
					me.destroy();
				}

            }
        };
        red.install_proto_builtins(proto, My.builtins);
        proto.do_initialize = function (options) {
            var self = this;
            red.install_instance_builtins(this, options, My);
            this._tree = cjs.$(function () {
                var str = self.get_str();
                return red.parse(str);
            });
        };
    
        proto.get_ignore_inherited_in_contexts = function (pcontext) {
            var i;
            if (this.get_ignore_inherited_in_first_dict()) {
                for (i = pcontext.length() - 1; i >= 0; i -= 1) {
                    var item = pcontext.points_at(i);
                    if (item instanceof red.Dict) {
                        return [item];
                    }
                }
            }
            return [];
        };
    
        proto.get_value = function (pcontext) {
            var tree = this._tree.get();
			if(tree instanceof red.Error) {
				return tree;
			} else {
				return red.get_parsed_val(tree, {
					context: pcontext,
					ignore_inherited_in_contexts: this.get_ignore_inherited_in_contexts(pcontext)
				});
			}
        };
        proto.constraint_in_context = function (pcontext) {
            var contextual_values = this.get_contextual_values();
    
            var val = contextual_values.get_or_put(pcontext, function () {
                var ignore_inherited_in_contexts = this.get_ignore_inherited_in_contexts(pcontext);
    
                var rv = cjs.$(function () {
                    var node = this._tree.get();
                    return red.get_parsed_$(node, {
                        context: pcontext,
                        ignore_inherited_in_contexts: ignore_inherited_in_contexts,
						get_constraint: false
                    });
                }, {
					context: this
				});
                return rv;
            }, this);
    
            return val;
        };
        proto.destroy = function () {
            this._tree.destroy();
			delete this._tree;

			red.unset_instance_builtins(this, My);
			red.unregister_uid(this.id());
        };
    
        proto.id = proto.hash = function () { return this._id; };
    
        proto.summarize = function () {
            return this.id();
        };
    
        red.register_serializable_type("cell",
            function (x) {
                return x instanceof My;
            },
            function (include_uid) {
                var rv = { };
                if (include_uid) { rv.uid = this.id(); }

                var self = this;
                _.each(My.builtins, function (builtin, name) {
                    if (builtin.serialize !== false) {
                        var getter_name = builtin.getter_name || "get_" + name;
                        rv[name] = red.serialize(self[getter_name]());
                    }
                });

                return rv;
            },
            function (obj) {
                var rest_args = _.rest(arguments);
                
                var serialized_options = {};
                _.each(My.builtins, function (builtin, name) {
                    if (builtin.serialize !== false) {
                        serialized_options[name] = obj[name];
                    }
                });

                var rv = new My({uid: obj.uid}, true);
                rv.initialize = function () {
                    var options = { };
                    _.each(serialized_options, function (serialized_option, name) {
                        options[name] = red.deserialize.apply(red, ([serialized_option]).concat(rest_args));
                    });
                    this.do_initialize(options);
                };

                return rv;
            });
    }(red.Cell));
	/*
    
    red.define("cell", function (options) {
        var cell = new red.Cell(options);
        return cell;
    });
	*/

}(red));
