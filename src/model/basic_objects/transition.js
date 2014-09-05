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
                getter: function (me) { return me.get(); },
                setter: function (me, str) {
                    me.set(str);
                },
				destroy: function(me) {
					me.destroy(true);
				}
            },
			"type": {
				"default": function() { return "parsed"; }
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
                serialize: false,
            },
			"event": {
				"default": function() { return false; }
			}
        };
        ist.install_proto_builtins(proto, My.builtins);

        proto.initialize = function (options) {
			My.superclass.initialize.apply(this, arguments);
            ist.install_instance_builtins(this, options, My);
        };
        proto.destroy = function () {
			if(this.constructor === My) { this.begin_destroy(); }
			ist.unset_instance_builtins(this, My);

			My.superclass.destroy.apply(this, arguments);
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
			var old_state = this.from();
			if(old_state !== state) {
				cjs.wait();
				old_state._removeIncomingTransition(this);
				this.do_set_to(state);
				state._addIncomingTransition(this);
				this._emit("setTo", {type: "setTo", target: state});
				cjs.signal();
			}
		};
    }(ist.Transition));
}(interstate));
