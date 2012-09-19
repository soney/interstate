(function(red) {
var cjs = red.cjs, _ = red._;

var check_context_equality = function(itema, itemb) {
	if(itema instanceof red.RedContext && itemb instanceof red.RedContext) {
		return itema.eq(itemb);
	} else {
		return itema === itemb;
	}
};

var RedDict = function(options) {
	options = options || {};

	//Properties
	this._direct_props = cjs.map();

	// Prototypes
	if(options.direct_protos) { this._direct_protos = options.direct_protos; }
	else { this._direct_protos = cjs.array(); }
	
	// Attachments
	if(options.direct_attachments) { this._direct_attachments = options.direct_attachments; }
	else { this._direct_attachments = cjs.array(); }
	this._direct_attachment_instances = cjs.map().set_equality_check(check_context_equality);

	this.type = "red_dict";
	this.id = _.uniqueId();

	this._default_context = cjs.$(options.default_context);

	red._set_descriptor(this._direct_props._keys,   "Direct Prop Keys " + this.id);
	red._set_descriptor(this._direct_props._values, "Direct Prop Vals " + this.id);
	red._set_descriptor(this._direct_protos,	       "Direct protos " + this.id);
	//if(cjs.is_constraint(this._direct_attachments)) { red._set_constraint_descriptor(this._direct_attachments,   "Direct Attachments " + this.id); }
	red._set_descriptor(this._direct_attachment_instances._keys,   "Direct Attachment instance Keys " + this.id);
	red._set_descriptor(this._direct_attachment_instances._values, "Direct Attachment instance Vals " + this.id);
};

(function(my) {
	var proto = my.prototype;

	//
	// === DEFAULT CONTEXT ===
	//
	proto.get_default_context = function() { return this._default_context.get(); }
	proto.set_default_context = function(context) { this._default_context.set(context, true); }
	
	//
	// === DIRECT PROTOS ===
	//
	proto.direct_protos = function() {
		return this._direct_protos;
	};
	proto._get_direct_protos = function(context) {
		var protos = red.get_contextualizable(this.direct_protos(), context);
		if(_.isArray(protos)) {
			return protos;
		} else {
			return [protos];
		}
	};
	proto._set_direct_protos = function(direct_protos) {
		this._direct_protos = direct_protos;
	};
	//
	// === ALL PROTOS ===
	//
	proto.get_protos = proto._get_all_protos = function(context) {
		var direct_protos = this._get_direct_protos(context);
		var protos = _.map(direct_protos, function(direct_proto) {
			if(_.isUndefined(direct_proto)) { return false; };
			var direct_proto_all_protos = direct_proto._get_all_protos(direct_proto.get_default_context());
			
			return ([direct_proto]).concat(direct_proto_all_protos);
		});
		protos = _.uniq(_.compact(_.flatten(protos, true)));
		return protos;
	};
	
	//
	// === DIRECT PROPERTIES ===
	//
	proto.set = proto.set_prop = proto._set_direct_prop = function(name, value, index) {
		this._direct_props.set(name, value, index);
	};
	proto.unset = proto.unset_prop = proto._unset_direct_prop = function(name) {
		this._direct_props.unset(name);
	};
	proto._get_direct_prop = function(name) {
		return this._direct_props.get(name);
	};
	proto._has_direct_prop = function(name) {
		return this._direct_props.has_key(name);
	};
	proto.move = proto.move_prop = proto._move_direct_prop = function(name, to_index) {
		this._direct_props.move(name, to_index);
	};
	proto.index = proto.prop_index = proto._direct_prop_index = function(name) {
		return this._direct_props._key_index(name);
	};
	proto.rename = proto._rename_direct_prop = function(from_name, to_name) {
		if(this._has_direct_prop(to_name)) {
			throw new Error("Already a property with name " + to_name);
		} else {
			this._direct_props.rename(from_name, to_name);
		}
	};
	proto._get_direct_prop_names = function() {
		return this._direct_props.get_keys();
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
	// === PROPERTIES ===
	//
	proto.get_prop = function(prop_name, context) {
		if(this._has_direct_prop(prop_name)) {
			return this._get_direct_prop(prop_name);
		} else {
			return this._get_inherited_prop(prop_name, context);
		}
	};
	proto.has_prop = function(prop_name, context) {
		if(this._has_direct_prop(prop_name)) {
			return true;
		} else if(this._has_inherited_prop(prop_name, context)) {
			return true;
		} else {
			return false;
		}
	};
	proto.get = proto.prop_val = function(prop_name, context) {
		var val = this.get_prop(prop_name, context);
		if(context instanceof red.RedContext) {
		//	context = context.push(this);
		} else {
			context = cjs.create("red_context", {stack: [this]});
		}
		return red.get_contextualizable(val, context);
	};
	proto.get_prop_names = function(context) {
		var direct_prop_names = this._get_direct_prop_names();
		var inherited_prop_names = this._get_inherited_prop_names(context);
		return direct_prop_names.concat(inherited_prop_names);
	};
	proto.is_inherited = function(prop_name, context) {
		var direct_prop_names = this._get_direct_prop_names();
		var inherited_prop_names = this._get_inherited_prop_names(context);
		return _.indexOf(direct_prop_names, prop_name) < 0 && _.indexOf(inherited_prop_names, prop_name) >= 0;
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
		var rv = this._direct_props.key_for_value(value);
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
	proto.direct_attachments = function() {
		return this._direct_attachments;
	};
	proto._get_direct_attachments = function(context) {
		return red.get_contextualizable(this.direct_attachments(), context.push(this));
	};
	
	
	//
	// === DIRECT ATTACHMENT INSTANCES ===
	//
	proto.add_direct_attachment_instance = function(attachment, context) {
		var do_invalidate = false;
		var attachment_instances;
		if(this._direct_attachment_instances.has_key(attachment)) {
			attachment_instances = this._direct_attachment_instances.get(attachment);
		} else {
			this._direct_attachment_instances.defer_invalidation(true);
			attachment_instances = cjs.create("map", check_context_equality);

			this._direct_attachment_instances.set(attachment, attachment_instances);
			this._direct_attachment_instances.defer_invalidation(false);
			do_invalidate = true;
		}
		var attachment_instance = attachment.create_instance(context.last(), context);
		attachment_instances.defer_invalidation(true);
		attachment_instances.set(context, attachment_instance);
		attachment_instances.defer_invalidation(false);
		attachment_instances.invalidate();
		if(do_invalidate) { this._direct_attachment_instances.invalidate(); }
		return attachment_instance;
	};
	proto.has_direct_attachment_instance = function(attachment, context) {
		return !_.isUndefined(this.get_direct_attachment_instance);
	};
	proto.get_direct_attachment_instance = function(attachment, context) {
		var attachment_instances;
		if(this._direct_attachment_instances.has_key(attachment)) {
			attachment_instances = this._direct_attachment_instances.get(attachment);
		} else {
			return undefined;
		}

		return attachment_instances.get(context);
	};
	proto.create_or_get_direct_attachment_instance = function(attachment, context) {
		var existing_instance = this.get_direct_attachment_instance(attachment, context);
		if(_.isUndefined(existing_instance)) {
			return this.add_direct_attachment_instance(attachment, context);
		} else {
			return existing_instance;
		}
	};
	
	//
	// === ALL ATTACHMENTS ===
	//
	proto._get_all_attachments_and_srcs = function(context) {
		var self = this;
		var direct_attachments = this._get_direct_attachments(context);
		var direct_attachments_and_srcs = _.map(direct_attachments, function(direct_attachment) {
			return {
						attachment: direct_attachment
						, holder: self
			};
		});

		var protos = this.get_protos(context);
		var proto_attachments_and_srcs = _.map(protos, function(protoi) {
			if(protoi instanceof red.RedDict) {
				var attachments = protoi._get_direct_attachments(context);
				return _.map(attachments, function(attachment) {
					return {
						attachment: attachment
						, holder: protoi
					};
				});
			} else {
				return [];
			}
		});
		var flattened_proto_attachments_and_srcs = _.flatten(proto_attachments_and_srcs, true);

		var non_duplicate_attachments_and_srcs = [];
		_.forEach(direct_attachments_and_srcs.concat(flattened_proto_attachments_and_srcs), function(attachment_and_src) {
			var attachment = attachment_and_src.attachment;
			var holder = attachment_and_src.holder;

			if(!_.any(non_duplicate_attachments_and_srcs, function(a_and_src) {
				if(a_and_src.attachment === attachment) {
					return !attachment.multiple_allowed();
				} else {
					return false;
				}
			})) {
				non_duplicate_attachments_and_srcs.push(attachment_and_src);
			}
		});

		return non_duplicate_attachments_and_srcs;
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
	
}(RedDict));

red.RedDict = RedDict;
red.define("dict", function(options) {
	var dict = new RedDict(options);
	return dict;
});
}(red));
