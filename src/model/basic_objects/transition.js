/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;

    ist.Transition = function (options, defer_initialization) {
		ist.Transition.superclass.constructor.apply(this, arguments);
		this.type = options.type;
    };
    (function (My) {
		_.proto_extend(My, ist.BasicObject);
        var proto = My.prototype;

        My.builtins = {
            "str": {
                start_with: function () { return cjs(""); },
                getter: function (me) {
					return me.get();
				},
                setter: function (me, str) {
                    me.set(str);
                },
				destroy: function(me) {
					me.destroy(true);
				},
				getter_name: "getStr",
				setter_name: "setStr"
            },
			"eventType": {
				"default": function() { return "parsed"; },
				"getter_name": "eventType"
			},
            "from": {
                start_with: function () { return cjs(false); },
                getter: function (me) { return me.get(); },
                setter: function (me, state) {
                    me.set(state);
                },
				destroy: function(me) {
					me.destroy(true);
				},
				setter_name: "do_set_from"
            },
            "to": {
                start_with: function () { return cjs(false); },
                getter: function (me) { return me.get(); },
                setter: function (me, state) {
                    me.set(state);
                },
				destroy: function(me) {
					me.destroy(true);
				},
				setter_name: "do_set_to"
            },
            "root": {
                //serialize: false,
				getter_name: "root"
            },
			"event": {
				"default": function() { return false; },
				getter_name: "getEvent"
			}
        };
        ist.install_proto_builtins(proto, My.builtins);

        proto.initialize = function (options) {
			My.superclass.initialize.apply(this, arguments);
            ist.install_instance_builtins(this, options, My);
            this._tree = cjs(function () {
                var str = this.getStr();
                return ist.parse(str);
            }, {
				context: this
			});
        };
		proto.getTree = function() {
			return this._tree.get();
		};
        proto.destroy = function () {
			if(this.constructor === My) { this.begin_destroy(); }
			ist.unset_instance_builtins(this, My);

			this._tree.destroy();

			My.superclass.destroy.apply(this, arguments);
        };
        proto.constraint_in_context = function (pcontext) {
			var tree = this.getTree();
			return ist.get_parsed_$(tree, {
						context: pcontext,
						//ignore_inherited_in_contexts: this.get_ignore_inherited_in_contexts(pcontext),
						get_constraint: true,
						only_parse_first: true
						//inherited_from_cobj: inherited_from_cobj
					});
        };

		proto.get_syntax_errors = function() {
            var tree = getTree();
			return tree instanceof ist.Error ? [tree.message()] : [];
		};

		proto.from = function() { return this.get_from(); };
		proto.to = function() { return this.get_to(); };

		proto.setFrom = function(state) {
			var old_state = this.from();
			if(old_state !== state) {
				cjs.wait();
				old_state._removeOutgoingTransition(this);
				this.do_set_from(state);
				state._addOutgoingTransition(this);
				this._emit("setFrom", {type: "setFrom", target: state});
				cjs.signal();
			}
		};

		proto.setTo = function(state) {
			var old_state = this.to();
			if(old_state !== state) {
				cjs.wait();
				old_state._removeIncomingTransition(this);
				this.do_set_to(state);
				state._addIncomingTransition(this);
				this._emit("setTo", {type: "setTo", target: state});
				cjs.signal();
			}
		};
		proto.remove = function(also_destroy) {
			var from = this.from(),
				to = this.to();
			if(from.isStart()) { // don't remove self; just set to to self
				this.setTo(from);
			} else {
				from._removeOutgoingTransition(this);
				to._removeIncomingTransition(this);
			}
		};
		proto.getLineage = function() {
			var from_lineage = this.from().getLineage();
			return from_lineage.concat(this);
		};

        ist.register_serializable_type("transition",
            function (x) {
                return x instanceof My;
            },
            function (include_uid) {
                var rv = { };
                if (include_uid) { rv.uid = this.id(); }

                _.each(My.builtins, function (builtin, name) {
                    if (builtin.serialize !== false) {
                        var getter_name = builtin.getter_name || "get_" + name;
                        rv[name] = ist.serialize(this[getter_name]());
                    }
                }, this);

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
				var old_initialize = proto.initialize;
                rv.initialize = function () {
					delete this.initialize;
                    var options = { };
                    _.each(serialized_options, function (serialized_option, name) {
                        options[name] = ist.deserialize.apply(ist, ([serialized_option]).concat(rest_args));
                    });
					old_initialize.call(this, options);
                };

                return rv;
            });
    }(ist.Transition));
}(interstate));
