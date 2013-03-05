(function(red) {
var cjs = red.cjs, _ = red._;

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
	this.options = options;

	this.type = "red_dict";
	this.uid = options.uid || uid();
	red.register_uid(this.uid, this);
	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
	this.prop_val = cjs.memoize(this._prop_val, {
		hash: function(args) { // name, pcontext
			return args[0] + args[1].hash();
		},
		equals: function(args1, args2) { // name, pcontext
			return args1[0] === args2[0] &&
					red.check_pointer_equality(args1[1], args2[1]);
		}
	});
};

(function(my) {
	var proto = my.prototype;

	proto.do_initialize = function(options) {
		red.install_instance_builtins(this, options, my);
		this.direct_attachment_instances().set_hash("hash");
	};

	my.builtins = {
		"direct_protos": {
			default: function() { return cjs.array(); }
			, getter_name: "direct_protos"
			, setter_name: "_set_direct_protos"
			, env_visible: true
			, env_name: "protos"
		}

		, "direct_attachments": {
			default: function() { return cjs.array(); }
			, getter_name: "direct_attachments"
		}

		, "direct_attachment_instances": {
			default: function() { return cjs.map(); }
			, getter_name: "direct_attachment_instances"
			, serialize: false
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

		, "manifestations": {
			start_with: function() { return cjs.$(); }
			, env_visible: false
			, getter: function(me) { return me.get(); }
			, setter: function(me, val) { me.set(val, true); }
		}
		, "contextual_manifestation_maps": {
			default: function() { return cjs.map({
				equals: red.check_pointer_equality,
				hash: "hash"
			}); }
			, settable: false
			, serialize: false
		}
	};

	red.install_proto_builtins(proto, my.builtins);
	
	//
	// === DIRECT PROTOS ===
	//

	proto.has_protos = function() {
		return this.options.has_protos;
	};

	proto._get_direct_protos = function(pointer) {
		var protos_pointer = pointer.push(this.direct_protos());
		var direct_proto_pointers = protos_pointer.val();
		if(!_.isArray(direct_proto_pointers)) {
			direct_proto_pointers = [direct_proto_pointers];
		}

		var rv = _.filter(direct_proto_pointers, function(direct_proto_pointer) {
			return (direct_proto_pointer instanceof red.Pointer) && (direct_proto_pointer.points_at() instanceof red.Dict);
		});

		return rv;
	};

	//
	// === ALL PROTOS ===
	//

	proto._get_all_protos = function(pointer) {
		var direct_protos = this._get_direct_protos(pointer);
		var proto_set = new Set({
			value: direct_protos
			, hash: "hash"
			, equals: red.check_pointer_equality
		});
		proto_set.each(function(proto_pointer, i) {
			var proto_dict = proto_pointer.points_at();
			var proto_dict_protos = proto_dict._get_direct_protos(proto_pointer);
			proto_set.add_at.apply(proto_set, [i+1].concat(proto_dict_protos));
		});
		var protos = proto_set.toArray();
		return protos;
	};

	proto._get_proto_vals = function(pointer) {
		var proto_pointers = this._get_all_protos(pointer);
		return _.map(proto_pointers, function(proto_pointer) {
			return proto_pointer.points_at();
		});
	};
	
	//
	// === DIRECT PROPERTIES ===
	//

	proto.set = proto.set_prop = proto._set_direct_prop = function(name, value, index) {
		this.direct_props().put(name, value, index);
		return this;
	};
	proto.unset = proto.unset_prop = proto._unset_direct_prop = function(name) {
		this.direct_props().remove(name);
		return this;
	};
	proto._get_direct_prop = function(name) {
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
	// === FULLY INHERITED PROPERTIES ===
	//
	
	proto._get_inherited_prop = function(prop_name, pointer) {
		var protos = this._get_proto_vals(pointer);
		for(var i = 0; i<protos.length; i++) {
			var protoi = protos[i];
			if(protoi._has_direct_prop(prop_name)) {
				return protoi._get_direct_prop(prop_name);
			}
		}
		return undefined;
	};
	proto._get_all_inherited_props = function(prop_name, pointer) {
		var rv = [];
		var protos = this._get_proto_vals(pointer);
		for(var i = 0; i<protos.length; i++) {
			var protoi = protos[i];
			if(protoi._has_direct_prop(prop_name)) {
				rv.push(protoi._get_direct_prop(prop_name));
			}
		}
		return rv;
	};
	proto._has_inherited_prop = function(prop_name, pointer) {
		var protos = this._get_proto_vals(pointer);
		for(var i = 0; i<protos.length; i++) {
			var protoi = protos[i];
			if(protoi._has_direct_prop(prop_name)) {
				return true;
			}
		}
		return false;
	};
	proto._get_inherited_prop_names = function(pointer) {
		var prop_name_set = new Set({});

		_.forEach(this._get_proto_vals(pointer), function(protoi) {
			prop_name_set.add.apply(prop_name_set, protoi._get_direct_prop_names());
		});
		prop_name_set.remove.apply(prop_name_set, this._get_direct_prop_names());

		var rv = prop_name_set.toArray();
		return rv;
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
	proto._get_builtin_prop = function(prop_name) {
		var builtins = this.get_builtins();
		for(var builtin_name in builtins) {
			if(builtins.hasOwnProperty(builtin_name)) {
				var builtin = builtins[builtin_name];
				if(builtin.env_visible === true) {
					var env_name = builtin.env_name || builtin_name;
					if(prop_name === env_name) {
						var getter_name = builtin.getter_name || "get_"+builtin_name;
						return this[getter_name]();
					}
				}
			}
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
	// === SPECIAL_CONTEXT_PROPERTIES ===
	//
	
	proto._has_special_context_prop = function(prop_name, pcontext) {
		return this._get_special_context_prop(prop_name, pcontext) !== undefined;
	};

	proto._get_special_context_prop_names = function(pcontext) {
		var rv = [];
		var my_index = pcontext.indexOf(this);
		if(my_index >= 0) {
			var special_contexts = pcontext.special_contexts(my_index);
			var len = special_contexts.length;
			for(var i = 0; i<len; i++) {
				var special_context = special_contexts[i];
				var context_obj = special_context.get_context_obj();
				rv.push.apply(rv, _.keys(context_obj));
			}
		}
		return rv;
	};

	proto._get_special_context_prop = function(prop_name, pcontext) {
		var my_index = pcontext.indexOf(this);
		if(my_index >= 0) {
			var special_contexts = pcontext.special_contexts(my_index);
			var len = special_contexts.length;
			for(var i = 0; i<len; i++) {
				var special_context = special_contexts[i];
				var context_obj = special_context.get_context_obj();
				if(context_obj.hasOwnProperty(prop_name)) {
					return context_obj[prop_name];
				}
			}
		}
		return undefined;
	};

	//
	// === PROPERTIES ===
	//

	proto._get_prop = function(prop_name, pcontext) {
		if(this._has_builtin_prop(prop_name)) {
			return this._get_builtin_prop(prop_name);
		} else if(this._has_direct_prop(prop_name)) {
			return this._get_direct_prop(prop_name);
		} else if(this._has_special_context_prop(prop_name, pcontext)) {
			return this._get_special_context_prop(prop_name, pcontext);
		} else {
			return this._get_inherited_prop(prop_name, pcontext);
		}
	};

	proto.get_prop_pointer = function(prop_name, pcontext) {
		var prop = this._get_prop(prop_name, pcontext);
		if(prop === undefined) {
			return undefined;
		} else {
			return pcontext.push(prop);
		}
	};

	proto._has_prop = function(prop_name, pcontext) {
		if(this._has_builtin_prop(prop_name)) {
			return true;
		} else if(this._has_direct_prop(prop_name)) {
			return true;
		} else if(this._has_inherited_prop(prop_name, pcontext)) {
			return true;
		} else if(this._has_special_context_prop(prop_name, pcontext)) {
			return true;
		} else {
			return false;
		}
	};
	proto.get_prop_names = function(pcontext, exclude_builtins) {
		var builtin_prop_names = exclude_builtins === true ? [] : this._get_builtin_prop_names();
		var direct_prop_names = this._get_direct_prop_names();
		var special_context_prop_names = this._get_special_context_prop_names(pcontext);
		var inherited_prop_names = this._get_inherited_prop_names(pcontext);
		return special_context_prop_names.concat(builtin_prop_names, direct_prop_names, inherited_prop_names);
	};
	proto.get_prop_pointers = function(pcontext) {
		var prop_names = this.get_prop_names(pcontext);
		var prop_pointers = _.map(prop_names, function(prop_name) {
			return this.get_prop_pointer(prop_name, pcontext);
		}, this);
		return prop_pointers;
	};
	proto.name_for_prop = function(value, pcontext) {
		var rv = this.direct_props().keyForValue(value);
		if(_.isUndefined(rv) && pcontext) {
			var protos = this._get_proto_vals(pcontext);
			for(var i = 0; i<protos.length; i++) {
				var protoi = protos[i];
				rv = protoi.name_for_prop(value, false);
				if(!_.isUndefined(rv)) {
					break;
				}
			}
		}
		return rv;
	};
	proto.src_for_prop = function(value, pcontext) {
		var rv = this.direct_props().keyForValue(value);
		if(rv) {
			return this;
		} else if(pcontext) {
			var protos = this._get_proto_vals(pcontext);
			for(var i = 0; i<protos.length; i++) {
				var protoi = protos[i];
				rv = protoi.src_for_prop(value, false);
				if(!_.isUndefined(rv)) {
					return protoi;
				}
			}
		}
		return undefined;
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
	
	
	//
	// === DIRECT ATTACHMENT INSTANCES ===
	//

	proto.create_or_get_direct_attachment_instance = function(attachment, pcontext) {
		var direct_attachment_instances = this.direct_attachment_instances();

		var create_attachment_instance = function() {
			var attachment_instance = attachment.create_instance(pcontext);
			return attachment_instance;
		};

		var attachment_instances = direct_attachment_instances.get_or_put(attachment, function() {
			return cjs.map({
						equals: red.check_pointer_equality,
						hash: "hash",
						keys: [pcontext],
						values: [create_attachment_instance()]
					});
		}, this);

		var attachment_instance = attachment_instances.get_or_put(pcontext, create_attachment_instance);

		return attachment_instance;
	};
	
	//
	// === ALL ATTACHMENTS ===
	//

	proto._get_all_attachments_and_srcs = function(pcontext) {
		var direct_attachments = this._get_direct_attachments(pcontext);
		var direct_attachments_and_srcs = _.map(direct_attachments, function(direct_attachment) {
			return {
						attachment: direct_attachment
						, holder: this
			};
		}, this);

		var protos = this._get_proto_vals(pcontext);
		var attachments_and_srcs = new Set({
			hash: function(item) {
				return item.attachment.hash();
			},
			equals: function(a, b) {
				return a.attachment === b.attachment;
			},
			value: direct_attachments_and_srcs
		});

		_.each(protos, function(protoi) {
			if(protoi instanceof red.Dict) {
				var attachments = protoi._get_direct_attachments(pcontext);
				attachments_and_srcs.add.apply(attachments_and_srcs, _.map(attachments, function(attachment) {
					return {
						attachment: attachment
						, holder: protoi
					};
				}));
			}
		});
		return attachments_and_srcs.toArray();
	};
	proto.get_attachment_instances = proto._get_all_attachment_instances = function(pcontext) {
		var attachments_and_srcs = this._get_all_attachments_and_srcs(pcontext);
		return _.map(attachments_and_srcs, function(attachment_and_src) {
			var holder = attachment_and_src.holder;
			var attachment = attachment_and_src.attachment;

			return holder.create_or_get_direct_attachment_instance(attachment, pcontext);
		});
	};
	proto.get_attachment_instance = function(type, pcontext) {
		var attachment_instances = this._get_all_attachment_instances(pcontext);
		for(var i = 0; i<attachment_instances.length; i++) {
			var attachment_instance = attachment_instances[i];
			if(attachment_instance.type === type) {
				return attachment_instance;
			}
		}
		return undefined;
	};
	proto._prop_val = function(name, pcontext) {
		var prop_pointer = this.get_prop_pointer(name, pcontext);
		if(prop_pointer) {
			return prop_pointer.val();
		} else {
			return undefined;
		}
	};

	proto.clone = function(options) {
	};

	proto.serialize = function(include_uid) {
		var rv = {
			has_protos: this.has_protos()
		};
		if(include_uid) { rv.uid = this.uid; }

		var self = this;
		var args = arguments;
		_.each(this.get_builtins(), function(builtin, name) {
			if(builtin.serialize !== false) {
				var getter_name = builtin.getter_name || "get_" + name;
				rv[name] = red.serialize.apply(red, ([self[getter_name]()]).concat(args));
			}
		});

		return rv;
	};
	my.deserialize = function(obj) {
		var serialized_options = {};
		_.each(my.builtins, function(builtin, name) {
			if(builtin.serialize !== false) {
				serialized_options[name] = obj[name];
			}
		});

		var rv = new red.Dict({uid: obj.uid, has_protos: obj.has_protos}, true);
		rv.initialize = function() {
			var options = {};
			_.each(serialized_options, function(serialized_option, name) {
				options[name] = red.deserialize(serialized_option);
			});
			this.do_initialize(options);
		};

		return rv;
	};

	//
	// === MANIFESTATIONS ===
	//
	
	proto.get_manifestation_map_for_context = function(pcontext) {
		var mm = this.get_contextual_manifestation_maps().get_or_put(pcontext, function(context) {
			return cjs.map({
				hash: function(item) {
					return item;
				}
			});
		});
		return mm;
	};

	proto.get_manifestation_obj = function(pcontext, basis, index) {
		var mm = this.get_manifestation_map_for_context(pcontext);
		cjs.wait();
		var dict = mm.get_or_put(basis, function() {
			var manifestation_obj = new red.ManifestationContext(this, basis, index);
			return manifestation_obj;
		}, this);
		cjs.signal();
		return dict;
	};

	proto.get_manifestation_pointers = function(pcontext) {
		var my_index = pcontext.indexOf(this);
		var special_contexts = pcontext.special_contexts(my_index);

		if(_.some(special_contexts, function(sc) { return sc instanceof red.ManifestationContext})) {
			return null;
		}

		var manifestations = this.get_manifestations();
		var manifestations_pointer = pcontext.push(manifestations);
		var manifestations_value = manifestations_pointer.val();

		if(_.isNumber(manifestations_value)) {
			var arr = []
			for(var i = 0; i<manifestations_value; i++) {
				arr[i] = i;
			}
			manifestations_value = arr;
		}

		if(_.isArray(manifestations_value)) {
			var manifestation_pointers = _.map(manifestations_value, function(manifestation_value, index) {
				var manifestation_obj = this.get_manifestation_obj(pcontext, manifestation_value, index);
				var manifestation_pointer = pcontext.push_special_context(manifestation_obj);

				return manifestation_pointer;
			}, this);
			return manifestation_pointers;
		} else {
			return null;
		}
	};

	proto.clean_manifestation_objs = function() {
	};

	proto.hash = function() {
		return this.uid;
	};

	//
	// === BYE BYE ===
	//

	proto.destroy = function() {
		this._direct_props.destroy();
		this._direct_protos.destroy();
		this._direct_attachments.destroy();
		this._direct_attachment_instances.destroy();
	};
	
}(red.Dict));

red.define("dict", function(options) {
	var dict = new red.Dict(options);
	return dict;
});
}(red));
