/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;
    
    ist.POINTERS_PROPERTY = {};
    ist.MANIFESTATIONS_PROPERTY = {};
    
    ist.is_inherited = function (pcontext) {
        return ist.inherited_root(pcontext) !== undefined;
    };
    ist.inherited_root = function (pcontext) {
        var child, parent;
        child = pcontext.pointsAt();
        var inh = false,
            child_src,
            i;
        for (i = pcontext.length() - 2; i >= 0; i -= 1) {
            parent = pcontext.pointsAt(i);
            child_src = parent.src_for_prop(child, pcontext.slice(0, i + 1));
            if (child_src === parent) {
                if (inh) {
                    return pcontext.slice(0, i + 3);
                }
            } else if (child_src !== undefined) {
                inh = true;
            }
    
            child = parent;
        }
        return undefined;
    };
    
    ist.Dict = function (options, defer_initialization) {
        options = _.extend({
            value: {},
            keys: [],
            values: [],
            has_protos: true,
			has_copies: true
        }, options);

        ist.Dict.superclass.constructor.call(this, options, defer_initialization);

		if(this.sid() === 827) debugger;
    
        this.type = "ist_dict";
    };
    
    (function (My) {
		_.proto_extend(My, ist.BasicObject);

        var proto = My.prototype;
    
        proto.initialize = function (options) {
            My.superclass.initialize.apply(this, arguments);
            ist.install_instance_builtins(this, options, My);

            var direct_props = this.direct_props();
            direct_props.setValueEqualityCheck(function (info1, info2) {
                return info1.value === info2.value;
            });
        };
    
        My.builtins = {
            "direct_protos": {
                "default": function () { return cjs.array(); },
                getter_name: "direct_protos",
                setter_name: "_set_direct_protos",
                env_visible: true,
                env_name: "prototypes",
				destroy: function(me) {
					me.destroy(true);
				}
            },
    
            "direct_attachments": {
                "default": function () { return []; },
                getter_name: "direct_attachments",
				destroy: function(me) {
					if (cjs.isArrayConstraint(me)) {
						me.forEach(function(attachment) {
							attachment.destroy(true);
						});
						me.destroy(true);
					} else if(_.isArray(me)) {
						_.each(me, function(attachment) {
							attachment.destroy(true);
						});
					}
				}
            },
    
            "direct_props": {
                "default": function () {
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

                    var rv = cjs.map({
                        keys: keys,
                        values: values,
                        value: value
                    });

                    return rv;
                },
                getter_name: "direct_props",
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
    
            "copies": {
                start_with: function () { 
					return cjs.constraint(new ist.Cell({str: ""}));
				},
                env_visible: false,
                env_name: "copies",
                getter: function (me) { return me.get(); },
                setter: function (me, val) {
					var old_val = me.get();
					if(old_val && old_val.destroy) {
						old_val.destroy(true);
					}
					me.set(val, true);
				},
				destroy: function(me) {
					var val = me.get();
					if(val && val.destroy) {
						val.destroy();
					}
					me.destroy(true);
				}
            }
        };
    
        ist.install_proto_builtins(proto, My.builtins);

        
        //
        // === DIRECT PROTOS ===
        //
    
        proto.has_protos = function () {
            return this.options.has_protos;
        };

		proto.has_copies = function() {
			return this.options.has_copies;
		};
    
        
        //
        // === DIRECT PROPERTIES ===
        //
    
        proto.set = proto.set_prop = proto._set_direct_prop = function (name, value, options) {
            var index,
				info = _.extend({
					value: value,
					owner: this
				}, options);
            this.direct_props().put(name, info, info.index);
            return this;
        };
        proto.unset = proto.unset_prop = proto._unset_direct_prop = function (name) {
            this.direct_props().remove(name);
            return this;
        };
        proto._get_direct_prop = function (name) {
            var info = this._get_direct_prop_info(name);
            if (info) {
                return info.value;
            } else {
                return undefined;
            }
        };
        proto._get_direct_prop_info = function (name) {
            return this.direct_props().get(name);
        };
        proto._has_direct_prop = function (name) {
            return this.direct_props().has(name);
        };
        proto.move = proto.move_prop = proto._move_direct_prop = function (name, to_index) {
            this.direct_props().move(name, to_index);
            return this;
        };
        proto.index = proto.prop_index = proto._direct_prop_index = function (name) {
            return this.direct_props().indexOf(name);
        };
        proto.rename = proto._rename_direct_prop = function (from_name, to_name) {
            if (this._has_direct_prop(to_name)) {
                throw new Error("Already a property with name " + to_name);
            } else {
                var direct_props = this.direct_props();
                var keyIndex = direct_props.indexOf(from_name);
                if (keyIndex >= 0) {
                    var prop_val = direct_props.get(from_name);
                    cjs.wait();
                    direct_props.remove(from_name)
                                .put(to_name, prop_val, keyIndex);
                    cjs.signal();
                } else {
                    throw new Error("No such property " + from_name);
                }
            }
        };
    
        proto._get_direct_prop_names = function () {
            return this.direct_props().keys();
        };
        
        //
        // === BUILTIN PROPERTIES ===
        //
        
        proto.get_builtins = function () {
            var builtins = _.clone(this.constructor.builtins);
            var supah = this.constructor.superclass;
            while (supah) {
                _.extend(builtins, supah.constructor.builtins);
                supah = supah.superclass;
            }
            return builtins;
        };
        
		var protos_array = ["prototypes"], empty_array = [];
        proto._get_builtin_prop_names = function () {
			return this.has_protos() ? protos_array : empty_array;
			/*
            var rv = [];
            _.each(this.get_builtins(), function (val, name) {
                if (val.env_visible === true) {
                    if (name === "direct_protos" && !this.has_protos()) {
                        return;
                    }
                    name = val.env_name || name;
                    rv.push(name);
                }
            }, this);
            return rv;
			*/
        };
        proto._get_builtin_prop_info = function (prop_name) {
            var builtins = this.get_builtins();
            var builtin_name;
            for (builtin_name in builtins) {
                if (builtins.hasOwnProperty(builtin_name)) {
                    var builtin = builtins[builtin_name];
                    if (builtin.env_visible === true) {
                        var env_name = builtin.env_name || builtin_name;
                        if (prop_name === env_name) {
                            var getter_name = builtin.getter_name || "get_" + builtin_name;
                            return {value: this[getter_name]()};
                        }
                    }
                }
            }
        };
        proto._get_builtin_prop = function (prop_name) {
            var info = this._get_builtin_prop_info(prop_name);
            if (info) {
                return info.value;
            } else {
                return undefined;
            }
        };
        proto._has_builtin_prop = function (prop_name) {
			return prop_name === "prototypes" && this.has_protos();
			/*
            var rv = false;
            return _.any(this.get_builtins(), function (val, name) {
                if (val.env_visible === true) {
                    name = val.env_name || name;
                    if (name === prop_name) {
                        return true;
                    }
                }
                return false;
            });
			*/
        };
        
        //
        // === DIRECT ATTACHMENTS ===
        //
    
        proto._get_direct_attachments = function () {
            var direct_attachments = this.direct_attachments();
            if (cjs.isArrayConstraint(direct_attachments)) {
                return this.direct_attachments().toArray();
            } else if (_.isArray(direct_attachments)) {
                return direct_attachments;
            } else {
                return [direct_attachments];
            }
        };

		proto.clone = function() {
			return ist.deserialize(ist.serialize(this, false));
		};
    
        //
        // === BYE BYE ===
        //
    
        proto.destroy = function () {
			if(this.sid() === 827) debugger;
			if(this.constructor === My) { this.begin_destroy(); }
			ist.unset_instance_builtins(this, My);
			My.superclass.destroy.apply(this, arguments);
        };
    
        proto.toString = function () {
            return "dict:" + this.uid;
        };
    
        proto.serialize = function (include_uid) {
            var rv = {
                has_protos: this.has_protos(),
				has_copies: this.has_copies()
            };
            if (include_uid) { rv.uid = this.id(); }
    
            var args = _.toArray(arguments);
            _.each(this.get_builtins(), function (builtin, name) {
                var getter_name = builtin._get_getter_name();
                rv[name] = ist.serialize.apply(ist, ([this[getter_name]()]).concat(args));
            }, this);
    
            return rv;
        };
        ist.register_serializable_type("dict",
            function (x) {
                return x instanceof My && x.constructor === My;
            },
            proto.serialize,
            function (obj) {
                var rest_args = _.rest(arguments);
                var serialized_options = {};
                _.each(My.builtins, function (builtin, name) {
                    serialized_options[name] = obj[name];
                });

                var rv = new My({uid: obj.uid, has_protos: obj.has_protos, has_copies: obj.has_copies}, true),
					old_initialize = proto.initialize;
                rv.initialize = function () {
					delete this.initialize;
                    var options = {};
                    _.each(serialized_options, function (serialized_option, name) {
                        options[name] = ist.deserialize.apply(ist, ([serialized_option]).concat(rest_args));
                    });
					old_initialize.call(this, options);
                };

                return rv;
            });
    }(ist.Dict));
}(interstate));
