/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;

	var START_STATE_NAME = "(start)";
	ist.START_SATATE_NAME = START_STATE_NAME;
    
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
                //serialize: false,
				getter_name: "parent"
            },
            "root": {
				"default": function() { return this; },
                //serialize: false,
				getter_name: "root"
            },
            "concurrent": {
                start_with: function () { return cjs(false); },
                getter: function (me) { return me.get(); },
				getter_name: "isConcurrent",
                setter: function (me, is_concurrent) {
                    me.set(is_concurrent);
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
					me.forEach(function(t) {
						t.destroy(true);
					});
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
							var transition = new ist.Transition({eventType: "start", root: this.root()}),
								start_state = new My({
									is_start: true,
									parent: this,
									root: this.root(),
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
					if(me) {
						me.forEach(function(prop_val, name) {
							if(prop_val.destroy) {
								prop_val.destroy(true);
							}
						});
						me.destroy(true);
					}
				},
				getter_name: "_get_substates"
            },
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
		proto.addSubstate = function(name, index) {
			var state = new My({parent: this, root: this.root()}),
				substates = this._get_substates();

			substates.put(name, state, index);
			return state;
		};
		proto.removeSubstate = function(name) {
			var substates = this._get_substates(),
				substate = substates.get(name);

			if(substate) {
				var incoming_transitions = substate.getIncomingTransitions(),
					outgoing_transitions = substate.getIncomingTransitions();
				_.each(_.unique(incoming_transitions.concat(outgoing_transitions)), function(transition) {
					transition.remove();
				});
			}

			substates.remove(name);
		};
		proto.renameSubstate = function(from_name, to_name) {
			var substates = this._get_substates(),
				keyIndex = substates.indexOf(from_name);

			if (keyIndex >= 0) {
				var prop_val = substates.get(from_name);
				cjs.wait();
				substates.remove(from_name)
							.put(to_name, prop_val, keyIndex);
				cjs.signal();
			} else {
				throw new Error("No such property " + from_name);
			}
		};
		proto.moveSubstate = function(name, index) {
			var substates = this._get_substates();
			substates.move(name, new_name);
		};
		proto.getSubstates = function() {
			var substates = this._get_substates();
			if(substates) {
				return substates.entries();
			} else {
				return [];
			}
		};
		proto.getSubstate = function(name) {
			if(name instanceof My) { return name; }
			else if(this.isStart()) { return false; }

			var keys = name.split("."),
				currState = this,
				substates,
				i, len = keys.length;

			for(i=0; i<len; i++) {
				substates = currState._get_substates();
				currState = substates ? substates.get(keys[i]) : false;

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
			var from_state, to_state;
			if(from_state_name instanceof ist.Transition) {
				var transition = from_state_name;
				from_state = transition.from();
				to_state = transition.to();

				cjs.wait();
				from_state._addOutgoingTransition(transition);
				to_state._addIncomingTransition(transition);
				cjs.signal();
				return transition;
			} else {
				from_state = this.getSubstate(from_state_name);
				to_state = this.getSubstate(to_state_name);

				if(from_state && to_state && !from_state.isStart()) {
					if(_.isString(transition_info)) {
						transition_info = {
							str: transition_info
						};
					} else if(transition_info instanceof ist.Event) {
						transition_info = {
							eventType: "event",
							event: transition_info
						};
					}

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
			var substates = this._get_substates();
			return substates.keyForValue(substate);
		};
		proto.clearOutgoingTransitions = function() {
			var outgoing_transitions = this._raw_outgoing_transitions();
			outgoing_transitions.splice(0, outgoing_transitions.length());
		};
		proto.getStateIndex = function(stateName) {
			var substates = this._get_substates();

			return substates.indexOf(stateName);
		};
		proto.isRoot = function() {
			return !this.parent();
		};
		proto.getLineage = function (until_state) {
			var curr_node = this,
				parentage = [],
				i = 0;

			do {
				parentage[i] = curr_node;
				i += 1;
				if (curr_node === until_state) { break; }
				curr_node = curr_node.parent();
			} while (curr_node);

			return parentage.reverse();
		};
		proto.startsAt = function(stateName) {
			var state = this.getSubstate(stateName),
				startState = this.getStartState();
			if(state && startState) {
				_.each(startState.getOutgoingTransitions(), function(transition) {
					transition.setTo(state);
				});
			}
		};
		proto.findTransitions = function (from_name, to_name, index) {
			var from = this.getSubstate(from_name),
				to = this.getSubstate(to_name);

			if (!from || !to) {
				return undefined;
			}

			var transitions = _.filter(from.getOutgoingTransitions(), function(transition) {
					return transition.to() === to;
				});

			if (_.isNumber(index)) {
				return transitions[index];
			} else {
				return transitions;
			}
		};

        ist.register_serializable_type("state",
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
    }(ist.State));
}(interstate));
