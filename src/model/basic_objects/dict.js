(function(red) {
var cjs = red.cjs, _ = red._;

red.POINTERS_PROPERTY = {};
red.MANIFESTATIONS_PROPERTY = {};

red.is_inherited = function(pcontext) {
	return red.inherited_root(pcontext) !== undefined;
};
red.inherited_root = function(pcontext) {
	var child, parent;
	child = pcontext.points_at();
	var inh = false,
		child_src;
	for(var i = pcontext.length() - 2; i>= 0; i--) {
		parent = pcontext.points_at(i);
		child_src = parent.src_for_prop(child, pcontext.slice(0, i+1));
		if(child_src === parent) {
			if(inh) {
				return pcontext.slice(0, i+3);
			}
		} else if(child_src !== undefined) {
			inh = true;
		}

		child = parent;
	}
	return undefined;
};

red.Dict = function(options, defer_initialization) {
	options = _.extend({
		value: {},
		keys: [],
		values: [],
		has_protos: true
	}, options);

	this.type = "red_dict";
	this._id = options.uid || uid();
	this.options = options;
	red.register_uid(this._id, this);
	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
};

(function(my) {
	var proto = my.prototype;

	proto.do_initialize = function(options) {
		red.install_instance_builtins(this, options, my);
		var direct_props = this.direct_props();
		direct_props.set_value_equality_check(function(info1, info2) {
			return info1.value === info2.value;
		});
	};

	my.builtins = {
		"direct_protos": {
			default: function() { return cjs.array(); }
			, getter_name: "direct_protos"
			, setter_name: "_set_direct_protos"
			, env_visible: true
			, env_name: "prototypes"
		}

		, "direct_attachments": {
			default: function() { return cjs.array(); }
			, getter_name: "direct_attachments"
		}

		, "direct_props": {
			default: function() {
				var rv = cjs.map({
					keys: this.options.keys,
					values: this.options.values,
					value: this.options.value
				});
				return rv;
				}
			, getter_name: "direct_props"
		}

		, "copies": {
			start_with: function() { return cjs.$(); }
			, env_visible: false
			, env_name: "copies"
			, getter: function(me) { return me.get(); }
			, setter: function(me, val) { me.set(val, true); }
		}
	};

	red.install_proto_builtins(proto, my.builtins);
	
	//
	// === DIRECT PROTOS ===
	//

	proto.has_protos = function() {
		return this.options.has_protos;
	};

	
	//
	// === DIRECT PROPERTIES ===
	//

	proto.set = proto.set_prop = proto._set_direct_prop = function(name, value, options) {
		var index;
		var info = _.extend({
			value: value,
			owner: this
		}, options);
		this.direct_props().put(name, info, info.index);
		return this;
	};
	proto.unset = proto.unset_prop = proto._unset_direct_prop = function(name) {
		this.direct_props().remove(name);
		return this;
	};
	proto._get_direct_prop = function(name) {
		var info = this._get_direct_prop_info(name);
		if(info) {
			return info.value;
		} else {
			return undefined;
		}
	};
	proto._get_direct_prop_info = function(name) {
		return this.direct_props().get(name);
	};
	proto._has_direct_prop = function(name) {
		return this.direct_props().has(name);
	};
	proto.move = proto.move_prop = proto._move_direct_prop = function(name, to_index) {
		this.direct_props().move(name, to_index);
		return this;
	};
	proto.index = proto.prop_index = proto._direct_prop_index = function(name) {
		return this.direct_props().indexOf(name);
	};
	proto.rename = proto._rename_direct_prop = function(from_name, to_name) {
		if(this._has_direct_prop(to_name)) {
			throw new Error("Already a property with name " + to_name);
		} else {
			var direct_props = this.direct_props();
			var keyIndex = direct_props.indexOf(from_name);
			if(keyIndex >= 0) {
				var prop_val = direct_props.get(from_name);
				cjs.wait();
				direct_props.wait()
							.remove(from_name)
							.put(to_name, prop_val, keyIndex)
							.signal();
				cjs.signal();
			} else {
				throw new Error("No such property " + from_name);
			}
		}
	};

	proto._get_direct_prop_names = function() {
		return this.direct_props().keys();
	};
	
	//
	// === BUILTIN PROPERTIES ===
	//
	
	proto.get_builtins = function() {
		var builtins = _.clone(this.constructor.builtins);
		var supah = this.constructor.superclass;
		while(supah) {
			_.extend(builtins, supah.constructor.builtins);
			supah = supah.superclass;
		}
		return builtins;
	};
	
	proto._get_builtin_prop_names = function() {
		var rv = [];
		_.each(this.get_builtins(), function(val, name) {
			if(val.env_visible === true) {
				if(name === "direct_protos" && !this.has_protos()) {
					return;
				}
				name = val.env_name || name;
				rv.push(name);
			}
		}, this);
		return rv;
	};
	proto._get_builtin_prop_info = function(prop_name) {
		var builtins = this.get_builtins();
		for(var builtin_name in builtins) {
			if(builtins.hasOwnProperty(builtin_name)) {
				var builtin = builtins[builtin_name];
				if(builtin.env_visible === true) {
					var env_name = builtin.env_name || builtin_name;
					if(prop_name === env_name) {
						var getter_name = builtin.getter_name || "get_"+builtin_name;
						return {value: this[getter_name]()};
					}
				}
			}
		}
	};
	proto._get_builtin_prop = function(prop_name) {
		var info = this._get_builtin_prop_info(prop_name);
		if(info) {
			return info.value;
		} else {
			return undefined;
		}
	};
	proto._has_builtin_prop = function(prop_name) {
		var rv = false;
		return _.any(this.get_builtins(), function(val, name) {
			if(val.env_visible === true) {
				name = val.env_name || name;
				if(name === prop_name) {
					return true;
				}
			}
			return false;
		});
	};
	
	//
	// === DIRECT ATTACHMENTS ===
	//

	proto._get_direct_attachments = function() {
		var direct_attachments = this.direct_attachments();
		if(direct_attachments instanceof cjs.ArrayConstraint) {
			return this.direct_attachments().toArray();
		} else if(_.isArray(direct_attachments)) {
			return direct_attachments;
		} else {
			return [direct_attachments];
		}
	};

	proto.id = proto.hash = function() { return this._id; };

	//
	// === BYE BYE ===
	//

	proto.destroy = function() {
		this._direct_props.destroy();
		this._direct_protos.destroy();
		this._direct_attachments.destroy();
		this._direct_attachment_instances.destroy();
		this.prop_val.destroy();
	};

	proto.toString = function() {
		return "dict:" + this.uid;
	};

	proto.serialize = function(include_uid) {
		var rv = {
			has_protos: this.has_protos()
		};
		if(include_uid) { rv.uid = this.id(); }

		var args = _.toArray(arguments);
		_.each(this.get_builtins(), function(builtin, name) {
			var getter_name = builtin._get_getter_name();
			rv[name] = red.serialize.apply(red, ([this[getter_name]()]).concat(args));
		}, this);

		return rv;
	};
	red.register_serializable_type("dict",
									function(x) { 
										return x instanceof my && x.constructor === my;
									},
									proto.serialize,
									function(obj) {
										var rest_args = _.rest(arguments);
										var serialized_options = {};
										_.each(my.builtins, function(builtin, name) {
											serialized_options[name] = obj[name];
										});

										var rv = new my({uid: obj.uid, has_protos: obj.has_protos}, true);
										rv.initialize = function() {
											var options = {};
											_.each(serialized_options, function(serialized_option, name) {
												options[name] = red.deserialize.apply(red, ([serialized_option]).concat(rest_args));
											});
											this.do_initialize(options);
										};

										return rv;
									});
}(red.Dict));

red.define("dict", function(options) {
	var dict = new red.Dict(options);
	return dict;
});
}(red));
