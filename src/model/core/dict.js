(function(red) {
var cjs = red.cjs, _ = red._;

var RedDict = function(options, defer_initialization) {
	options = _.extend({
		value: {},
		keys: [],
		values: []
	}, options);
	this.options = options;

	this.type = "red_dict";
	this.id = _.uniqueId();
	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
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

		, "default_context": {
			start_with: function() { return cjs.$(); }
			, getter: function(me) { return me.get(); }
			, setter: function(me, context) { me.set(context, true); }
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
				equals: red.check_context_equality,
				hash: "hash"
			}); }
			, settable: false
			, serialize: false
		}
		, "manifestation_of": {
			default: function() { return false; }
			, settable: false
			, serialize: false
		}
	};

	red.install_proto_builtins(proto, my.builtins);
	
	//
	// === DIRECT PROTOS ===
	//

	proto._get_direct_protos = function(context) {
		var protos = red.get_contextualizable(this.direct_protos(), context);
		var rv;
		if(_.isArray(protos)) {
			rv = _.map(protos, function(x) {
						return red.get_contextualizable(x, context);
					});
		} else {
			rv = red.get_contextualizable(protos, context);

			if(!_.isArray(rv)) {
				rv = [rv];
			}
		}

		rv = _.filter(rv, function(x) {
			return x instanceof red.RedDict;
		});
		return rv;
	};

	//
	// === ALL PROTOS ===
	//

	proto.get_protos = proto._get_all_protos = function(context) {
		var direct_protos = this._get_direct_protos(context);
		var proto_set = new Set({
			value: direct_protos
			, hash: "hash"
		});
		proto_set.each(function(x, i) {
			var c = x.get_default_context();
			var dp = x._get_direct_protos(c);
			proto_set.add_at.apply(proto_set, [i+1].concat(dp));
		});
		var protos = proto_set.toArray();
		return protos;
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
	
	proto._get_inherited_prop = function(prop_name, context) {
		var protos = this._get_all_protos(context);
		for(var i = 0; i<protos.length; i++) {
			var protoi = protos[i];
			if(protoi._has_direct_prop(prop_name)) {
				return protoi._get_direct_prop(prop_name);
			}
		}
		return undefined;
	};
	proto._get_all_inherited_props = function(prop_name, context) {
		var rv = [];
		var protos = this._get_all_protos(context);
		for(var i = 0; i<protos.length; i++) {
			var protoi = protos[i];
			if(protoi._has_direct_prop(prop_name)) {
				rv.push(protoi._get_direct_prop(prop_name));
			}
		}
		return rv;
	};
	proto._has_inherited_prop = function(prop_name, context) {
		var protos = this._get_all_protos(context);
		for(var i = 0; i<protos.length; i++) {
			var protoi = protos[i];
			if(protoi._has_direct_prop(prop_name)) {
				return true;
			}
		}
		return false;
	};
	proto._get_inherited_prop_names = function(context) {
		var rv = [];
		_.forEach(this._get_all_protos(context), function(protoi) {
			rv.push.apply(rv, protoi._get_direct_prop_names());
		});
		rv = _.unique(rv);
		rv = _.difference(rv, this._get_direct_prop_names());
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
				name = val.env_name || name;
				rv.push(name);
			}
		});
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
	// === PROPERTIES ===
	//

	proto.get_prop = function(prop_name, context) {
		if(this._has_builtin_prop(prop_name)) {
			return this._get_builtin_prop(prop_name);
		} else if(this._has_direct_prop(prop_name)) {
			return this._get_direct_prop(prop_name);
		} else {
			return this._get_inherited_prop(prop_name, context);
		}
	};
	proto.has_prop = function(prop_name, context) {
		if(this._has_builtin_prop(prop_name)) {
			return true;
		} else if(this._has_direct_prop(prop_name)) {
			return true;
		} else if(this._has_inherited_prop(prop_name, context)) {
			return true;
		} else {
			return false;
		}
	};
	proto.get = proto.prop_val = function(prop_name, context) {
		var val = this.get_prop(prop_name, context);
		if(!(context instanceof red.RedContext)) {
			context = this.get_default_context();
		}
		if(this instanceof red.RedStatefulObj && val instanceof red.RedStatefulProp) {
			var stateful_val = val.get_value_for_context(context);
			var entry = stateful_val.get();
			var from_state = stateful_val.get_from_state();
			if(from_state) {
				var state_event = from_state._last_run_event.get();
				context = context.push(red.create("dict", { value: {
																event: state_event
															}
														}));
			}

			val = entry;
		}
		return red.get_contextualizable(val, context);
	};
	proto.get_prop_names = function(context) {
		var builtin_prop_names = this._get_builtin_prop_names();
		var direct_prop_names = this._get_direct_prop_names();
		var inherited_prop_names = this._get_inherited_prop_names(context);
		return builtin_prop_names.concat(direct_prop_names, inherited_prop_names);
	};
	proto.get_prop_values = function(context) {
		var prop_names = this.get_prop_names(context);
		var prop_values = _.map(prop_names, function(prop_name) {
			return this.get_prop(prop_name, context);
		}, this);
		return prop_values;
	};
	proto.is_inherited = function(prop_name, context) {
		var builtin_prop_names = this._get_builtin_prop_names();
		var direct_prop_names = this._get_direct_prop_names();
		var inherited_prop_names = this._get_inherited_prop_names(context);
		return _.indexOf(direct_prop_names, prop_name) < 0 && _.indexOf(builtin_prop_names) < 0 && _.indexOf(inherited_prop_names, prop_name) >= 0;
	};
	proto.inherit = function(prop_name) {
		if(!this.is_inherited(prop_name)) {
			throw new Error("Trying to inherit non-inherited property");
		}
		var prop_val = this.get(prop_name);
		var cloned_prop_val;
		if(prop_val instanceof red.RedCell) {
			cloned_prop_val = prop_val.clone();
		}
	};
	proto.name_for_prop = function(value, context) {
		var rv = this.direct_props().keyForValue(value);
		if(_.isUndefined(rv) && context) {
			var protos = this.get_protos(context);
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
	
	//
	// === DIRECT ATTACHMENTS ===
	//

	proto._get_direct_attachments = function(context) {
		return red.get_contextualizable(this.direct_attachments(), context);
	};
	
	
	//
	// === DIRECT ATTACHMENT INSTANCES ===
	//

	proto.create_or_get_direct_attachment_instance = function(attachment, context) {
		var direct_attachment_instances = this.direct_attachment_instances();

		var create_attachment_instance = function() {
			var owner = context.last();
			owner = owner.get_manifestation_of() || owner;
			var attachment_instance = attachment.create_instance(owner, context);
			return attachment_instance;
		};

		var attachment_instances = direct_attachment_instances.get_or_put(attachment, function() {
			return cjs.map({
						equals: red.check_context_equality,
						hash: "hash",
						keys: [context],
						values: [create_attachment_instance()]
					});
		}, this);

		var attachment_instance = attachment_instances.get_or_put(context, create_attachment_instance);

		return attachment_instance;
	};
	
	//
	// === ALL ATTACHMENTS ===
	//

	proto._get_all_attachments_and_srcs = function(context) {
		var direct_attachments = this._get_direct_attachments(context);
		var direct_attachments_and_srcs = _.map(direct_attachments, function(direct_attachment) {
			return {
						attachment: direct_attachment
						, holder: this
			};
		}, this);

		var protos = this.get_protos(context);
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
			if(protoi instanceof red.RedDict) {
				var attachments = protoi._get_direct_attachments(context);
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
	proto.get_attachment_instances = proto._get_all_attachment_instances = function(context) {
		var attachments_and_srcs = this._get_all_attachments_and_srcs(context);
		return _.map(attachments_and_srcs, function(attachment_and_src) {
			var holder = attachment_and_src.holder;
			var attachment = attachment_and_src.attachment;

			return holder.create_or_get_direct_attachment_instance(attachment, context);
		});
	};
	proto.get_attachment_instance = function(type, context) {
		var attachment_instances = this._get_all_attachment_instances(context);
		for(var i = 0; i<attachment_instances.length; i++) {
			var attachment_instance = attachment_instances[i];
			if(attachment_instance.type === type) {
				return attachment_instance;
			}
		}
		return undefined;
	};

	proto.serialize = function() {
		var rv = {};

		var self = this;
		_.each(this.get_builtins(), function(builtin, name) {
			if(builtin.serialize !== false) {
				var getter_name = builtin.getter_name || "get_" + name;
				rv[name] = red.serialize(self[getter_name]());
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

		var rv = new RedDict(undefined, true);
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
	
	proto.get_manifestation_map_for_context = function(context) {
		var mm = this.get_contextual_manifestation_maps().get_or_put(context, function(context) {
			return cjs.map({
				hash: function(item) {
					return item;
				}
			});
		});
		return mm;
	};

	proto.get_manifestation_obj = function(context, basis, index) {
		var mm = this.get_manifestation_map_for_context(context);
		cjs.wait();
		var dict = mm.get_or_put(basis, function() {
			var dict = red.create("dict", {
				manifestation_of: this,
				value: {
					basis: basis,
					basis_index: index
				}
			});
			return dict;
		}, this);
		cjs.signal();
		return dict;
	};

	proto.get_manifestation_objs = function(context) {
		var manifestations = red.get_contextualizable(this.get_manifestations(), context);

		for(var i = 0; i<context._stack.length; i++) {
			if(context._stack[i].get_manifestation_of() === this) {
				return null;
			}
		}

		if(_.isNumber(manifestations)) {
			var arr = []
			for(var i = 0; i<manifestations; i++) {
				arr.push(i);
			}
			manifestations = arr;
		}
		if(manifestations) {
			manifestations = red.get_contextualizable(manifestations, context);
		}


		if(_.isArray(manifestations)) {
			var manifest_objs = _.map(manifestations, function(manifestation, index) {
				return this.get_manifestation_obj(context, manifestation, index);
			}, this);

			return manifest_objs;
		} else {
			return null;
		}
	};

	proto.clean_manifestation_objs = function() {
	};

	proto.hash = function() {
		return this.id;
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
	
}(RedDict));

red.RedDict = RedDict;
red.define("dict", function(options) {
	var dict = new RedDict(options);
	return dict;
});
}(red));
