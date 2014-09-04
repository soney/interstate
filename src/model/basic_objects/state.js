/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;

	var START_STATE_NAME = "(start)";
    
    ist.State = function (options, defer_initialization) {
        options = _.extend({
            value: {},
            keys: [],
            values: []
        }, options);

		ist.State.superclass.constructor.call(this, options, defer_initialization);
    };
    (function (My) {
		_.proto_extend(My, ist.BasicObject);
        var proto = My.prototype;

        My.builtins = {
            is_start: {
                "default": function () { return false; },
				getter_name: "isStart"
            },
            "parent": {
                serialize: false,
				getter_name: "parent"
            },
            "root": {
				"default": function() { return this; },
                serialize: false,
				getter_name: "root"
            },
            "concurrent": {
                start_with: function () { return cjs(false); },
                getter: function (me) { return me.get(); },
				getter_name: "isConcurrent",
                setter: function (me, is_concurrent) {
                    me.set(concurrent);
                },
				destroy: function(me) {
					me.destroy(true);
				}
            },
            "incoming_transitions": {
                "default": function () {
					return cjs.array();
				},
				getter_name: "_raw_incoming_transitions",
				destroy: function(me) {
					me.destroy(true);
				}
            },
            "outgoing_transitions": {
                "default": function () {
					return cjs.array();
				},
				getter_name: "_raw_outgoing_transitions",
				destroy: function(me) {
					me.destroy(true);
				}
            },
            "substates": {
                "default": function () {
					if(this.isStart()) {
						return false;
					} else {
						var keys = this.options.keys,
							values = _.map(this.options.values, function(v) {
										return {
											value: v,
											owner: this
										};
									}, this),
							value = {};

						_.each(this.options.value, function(v, k) {
							value[k] = {
								value: v,
								owner: this
							};
						}, this);

						if(!value[START_STATE_NAME]) {
							var transition = new ist.Transition({type: "start"}),
								start_state = new My({
									is_start: true,
									parent: this,
									incoming_transitions: cjs([transition]),
									outgoing_transitions: cjs([transition])
								});

							transition.do_set_from(start_state);
							transition.do_set_to(start_state);

							value[START_STATE_NAME] = start_state;
						}

						var rv = cjs.map({
							keys: keys,
							values: values,
							value: value,
							valuehash: function(x) { return x.hash(); }
						});

						return rv;
					}
                },
				destroy: function(me) {
					me.forEach(function(prop_val, name) {
						if(prop_val.value.destroy) {
							prop_val.value.destroy(true);
						}
						delete prop_val.owner;
						delete prop_val.value;
					});
					me.destroy(true);
				}
            },
        };
        ist.install_proto_builtins(proto, My.builtins);

        proto.initialize = function (options) {
			My.superclass.initialize.apply(this, arguments);
            ist.install_instance_builtins(this, options, My);
        };
        proto.destroy = function () {
			My.superclass.destroy.apply(this, arguments);
        };
		proto.addSubstate = function(name) {
			var state = new My({parent: this}),
				substates = this.get_substates();

			substates.put(name, state);
		};
		proto.removeSubstate = function(name) {
			var substates = this.get_substates();
			substates.unset(name);
		};
		proto.renameSubstate = function(name, new_name) {
			var substates = this.get_substates();
			substates.rename(name, new_name);
		};
		proto.moveSubstate = function(name, index) {
			var substates = this.get_substates();
			substates.move(name, new_name);
		};
		proto.getSubstates = function() {
			var substates = this.get_substates();
			if(substates) {
				return substates.entries();
			} else {
				return [];
			}
		};
		proto.getSubstate = function(name) {
			if(name instanceof My) { return name; }

			var keys = name.split("."),
				currState = this,
				substates,
				i, len = keys.length;

			for(i=0; i<len; i++) {
				substates = currState.get_substates();
				currState = substates.get(name);

				if(!currState) { return false; }
			}
			return currState;
		};
		proto.getStartState = function() {
			return this.getSubstate(START_STATE_NAME);
		};
		proto._removeOutgoingTransition = function(transition) {
			var outgoing_transitions = this._raw_outgoing_transitions(),
				transition_index = outgoing_transitions.indexOf(transition);
			if(transition_index >= 0) { outgoing_transitions.splice(transition_index, 1); }
		};
		proto._removeIncomingTransition = function(transition) {
			var incoming_transitions = this._raw_incoming_transitions(),
				transition_index = incoming_transitions.indexOf(transition);
			if(transition_index >= 0) { incoming_transitions.splice(transition_index, 1); }
		};
		proto._addOutgoingTransition = function(transition) {
			var outgoing_transitions = this._raw_outgoing_transitions();
			outgoing_transitions.push(transition);
		};
		proto._addIncomingTransition = function(transition) {
			var incoming_transitions = this._raw_incoming_transitions();
			incoming_transitions.push(transition);
		};
		proto.addTransition = function(from_state_name, to_state_name, transition_info) {
			var from_state = this.getSubstate(from_state_name),
				to_state = this.getSubstate(to_state_name);
			if(from_state && to_state && !from_state.isStart()) {
				var options = _.extend({
						from: from_state,
						to: to_state,
						root: this.root()
					}, transition_info),
					transition = new ist.Transition(options);

				cjs.wait();
				from_state._addOutgoingTransition(transition);
				to_state._addIncomingTransition(transition);
				cjs.signal();
				return transition;
			}
		};
		proto.getIncomingTransitions = function() {
			var incoming_transitions = this._raw_incoming_transitions();
			return incoming_transitions.toArray();
		};
		proto.getOutgoingTransitions = function() { 
			var outgoing_transitions = this._raw_outgoing_transitions();
			return outgoing_transitions.toArray();
		};
		proto.getNameForSubstate = function(substate) {
			var substates = this.get_substates();
			return substates.keyForValue(substate);
		};
		proto.clearOutgoingTransitions = function() {
			var outgoing_transitions = this._raw_outgoing_transitions();
			outgoing_transitions.splice(0, outgoing_transitions.length());
		};
    }(ist.State));
}(interstate));
