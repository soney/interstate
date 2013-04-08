(function (red) {
var cjs = red.cjs, _ = red._;

red.Dict.get_proto_vals = function (dict, ptr) {
	var rv = new Set({
		value: [dict],
		hash: "hash"
	});

	var pointer = ptr;
	var i = 0;
	while (i < rv.len()) {
		var dict = rv.item(i);
		var proto_obj = dict.direct_protos();
		var proto_val;
		if (proto_obj instanceof cjs.ArrayConstraint) {
			proto_val = proto_obj.toArray();
		} else {
			var proto_contextual_obj = red.find_or_put_contextual_obj(proto_obj, pointer.push(proto_obj), {
					check_on_nullify: true,
					equals: function (a,b) {
						if (_.isArray(a) && _.isArray(b)) {
							var len = a.length;
							if (len !== b.length) {
								return false;
							}
						
							for (var i = 0; i<len; i += 1) {
								if (a[i] !== b[i]) {
									return false;
								}
							}
							return true;
						} else {
							return a === b;
						}
					}
				});
			proto_val = proto_contextual_obj.val();
		}
		proto_val = _	.chain(_.isArray(proto_val) ? proto_val : [proto_val])
						.map(function (x) {
							if (x && x instanceof red.ContextualDict) {
								return x.get_object();
							} else {
								return false;
							}
						})
						.compact()
						.value();
		rv.add_at.apply(rv, ([i+1].concat(proto_val)));
		i += 1;
	}
	var rv_arr = rv.toArray();

	return rv_arr.slice(1); // don't include the original dict
};

red.Dict.get_prop_name = function (dict, value, pcontext) {
	var direct_props = dict.direct_props();

	var rv = direct_props.keyForValue({value: value});
	if (_.isUndefined(rv) && pcontext) {
		var protos = red.Dict.get_proto_vals(dict, pcontext);
		for (var i = 0; i<protos.length; i += 1) {
			var protoi = protos[i];
			direct_props = protoi.direct_props();
			rv = direct_props.keyForValue({value: value});
			if (!_.isUndefined(rv)) {
				break;
			}
		}
	}
	return rv;
};

red.Dict.get_prop_info = function (dict, prop_name, pcontext) {
	if (dict._has_builtin_prop(prop_name)) {
		return dict._get_builtin_prop_info(prop_name);
	} else if (dict._has_direct_prop(prop_name)) {
		return dict._get_direct_prop_info(prop_name);
	} else if (dict._has_special_context_prop(prop_name, pcontext)) {
		return dict._get_special_context_prop_info(prop_name, pcontext);
	} else {
		return this._get_inherited_prop_info(prop_name, pcontext);
	}
};

red.Dict.get_prop = function (dict, prop_name, pcontext) {
	var info = red.Dict.get_prop_info(dict, prop_name, pcontext);
	if (info) {
		return info.value;
	} else {
		return undefined;
	}
};

var get_contextual_object = function (info, pointer) {
	var value = info.value;
	var value_ptr = pointer.push(value);

	if (value instanceof red.Dict || value instanceof red.Cell || value instanceof red.StatefulProp) {
		var contextual_object = red.find_or_put_contextual_obj(value, value_ptr);
		return contextual_object;
	} else {
		return value;
	}
};

red.ContextualDict = function (options) {
	red.ContextualDict.superclass.constructor.apply(this, arguments);
	this._attachment_instances = { };
	this._manifestation_objects = new Map({ });
	this._type = "dict";
};

(function (my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;

	proto.get_all_protos = function () {
		return red.Dict.get_proto_vals(this.get_object(), this.get_pointer());
	};

	proto.get_contextual_protos = function () {
		var proto_objects = this.get_all_protos();
		var pointer = this.get_pointer();

		var rv = _.map(proto_objects, function (proto_object) {
			return red.find_or_put_contextual_obj(proto_object, pointer.push(proto_object));
		}, this);

		return rv;
	};

	proto.children = function (exclude_builtins) {
		var dict = this.object;
		var pointer = this.pointer;

		var builtin_names = exclude_builtins === true ? [] : dict._get_builtin_prop_names();
		var direct_names = dict._get_direct_prop_names();

		var owners = {};
		_.each(builtin_names, function (name) {
			owners[name] = dict;
		}, this);
		_.each(direct_names, function (name) {
			owners[name] = dict;
		}, this);

		var my_ptr_index = pointer.lastIndexOf(dict);
		var special_context_names = [];
		if (my_ptr_index >= 0) {
			var special_contexts = pointer.special_contexts(my_ptr_index);
			var len = special_contexts.length;
			var sc, co;
			for (var i = 0; i<len; i += 1) {
				sc = special_contexts[i];
				co = sc.get_context_obj();
				_.each(co, function (v, k) {
					if (!owners.hasOwnProperty(k)) {
						owners[k] = sc;
						special_context_names.push(k);
					}
				});
			}
		}

		var proto_objects = this.get_all_protos();

		var inherited_names = [];
		_.each(proto_objects, function (p) {
			var p_direct_names = p._get_direct_prop_names();
			_.each(p_direct_names, function (name) {
				if (!owners.hasOwnProperty(name)) {
					owners[name] = p;
					inherited_names.push(name);
				}
			});
		});

		var rv = [];
		_.each([
			["builtin", builtin_names],
			["direct", direct_names],
			["special_context", special_context_names],
			["inherited", inherited_names]
		], function (info) {
			var type = info[0];
			var names = info[1];
			var getter_fn;

			var infos;
			if (type === "builtin") {
				infos = _.map(names, function (name) {
										return dict._get_builtin_prop_info(name);
								});
			} else if (type === "direct" || type === "inherited") {
				infos = _.map(names, function (name) {
										var owner = type === "direct" ? dict : owners[name];
										return owner._get_direct_prop_info(name);
								});
			} else if (type === "special_context") {
				infos = _.map(names, function (name) {
										var sc = owners[name];
										var co = sc.get_context_obj();
										return co[name];
								});
			}

			var contextual_objects = _.map(infos, function (info, i) {
				var name = names[i];
				var value = get_contextual_object(info, pointer);
				return {name: name, value: value, inherited: type === "inherited"};
			}, this);
			rv.push.apply(rv, contextual_objects);
		}, this);
		delete owners;

		return rv;
	};
	proto.has = function (name, ignore_inherited) {
		var dict = this.get_object();
		if (dict._has_direct_prop(name) || dict._has_builtin_prop(name)) {
			return true;
		} else if (ignore_inherited !== true){
			var proto_objects = this.get_all_protos();
			if (_.any(proto_objects, function (d) { return d._has_direct_prop(name); })) {
				return true;
			}

			var pointer = this.get_pointer();
			var my_ptr_index = pointer.lastIndexOf(dict);
			if (my_ptr_index >= 0) {
				var special_contexts = pointer.special_contexts(my_ptr_index);
				var len = special_contexts.length;
				var sc, co;
				for (var i = 0; i<len; i += 1) {
					sc = special_contexts[i];
					co = sc.get_context_obj();
					if (co.hasOwnProperty(name)) {
						return true;
					}
				}
				return false;
			} else {
				return false;
			}
		} else {
			return false;
		}
	};
	proto.prop_info = function (name, ignore_inherited) {
		var dict = this.get_object(),
			info;
		if (dict._has_builtin_prop(name)) {
			info = dict._get_builtin_info(name);
		} else if (dict._has_direct_prop(name)) {
			info = dict._get_direct_prop_info(name);
		} else {
			var pointer = this.get_pointer();
			var my_ptr_index = pointer.lastIndexOf(dict);
			if (my_ptr_index >= 0) {
				var special_contexts = pointer.special_contexts(my_ptr_index);
				var len = special_contexts.length;
				var sc, co;
				for (var i = 0; i<len; i += 1) {
					sc = special_contexts[i];
					co = sc.get_context_obj();
					if (co.hasOwnProperty(name)) {
						info = co[name];
						break;
					}
				}
			}
			if (!info && ignore_inherited !== true) {
				var proto_objects = this.get_all_protos();
				var len = proto_objects.length;
				var d;
				for (var i = 0; i<len; i += 1) {
					d = proto_objects[i];
					if (d._has_direct_prop(name)) {
						info = d._get_direct_prop_info(name);
						break;
					}
				}
			}
		}
		return info;
	};
	proto.prop = function (name, ignore_inherited) {
		var info = this.prop_info(name, ignore_inherited);

		if (info) {
			var pointer = this.get_pointer();
			var value = get_contextual_object(info, pointer);
			return value;
		} else {
			return undefined;
		}
	};

	proto.prop_val = function (name, ignore_inherited) {
		var value = this.prop(name, ignore_inherited);
		if (value instanceof red.ContextualObject) {
			return value.val();
		} else {
			return value;
		}
	};

	proto.copies_obj = function () {
		var object = this.get_object();
		var copies = object.get_copies();
		return copies;
	};

	proto.get_manifestations_value = function () {
		var pointer = this.get_pointer();

		var manifestations = this.copies_obj();
		if (manifestations instanceof red.Cell) {
			var manifestations_pointer = pointer.push(manifestations);
			var manifestations_contextual_object = red.find_or_put_contextual_obj(manifestations, manifestations_pointer);
			var manifestations_value = manifestations_contextual_object.val();
			return manifestations_value;
		} else {
			return cjs.get(manifestations);
		}
	};

	proto.is_template = function () {
		var pointer = this.get_pointer();
		var object = this.get_object();
		var obj_index = pointer.lastIndexOf(object);

		if (obj_index >= 0) {
			var special_contexts = pointer.special_contexts(obj_index);
			var special_context;
			for (var i = special_contexts.length-1; i>=0; i -= 1) {
				special_context = special_contexts[i];
				if (special_context instanceof red.CopyContext) {
					return false;
				}
			}
		}

		var manifestations_value = this.get_manifestations_value();
		return (_.isNumber(manifestations_value) && !isNaN(manifestations_value)) || _.isArray(manifestations_value);
	};

	proto.instances = function () {
		var manifestations_value = this.get_manifestations_value();
		if (_.isNumber(manifestations_value)) {
			var len = manifestations_value;
			manifestations_value = new Array(len);
			for (var i = 1; i<=len; i += 1) {
				manifestations_value[i-1] = i;
			}
		}

		var pointer = this.get_pointer();
		var object = this.get_object();
		var manifestation_contextual_objects = _.map(manifestations_value, function (basis, index) {
							var manifestation_obj = this._manifestation_objects.get_or_put(basis, function () {
								return new red.CopyContext(this, basis, index+1);
							}, this);
							var manifestation_pointer = pointer.push_special_context(manifestation_obj);
							var contextual_object = red.find_or_put_contextual_obj(object, manifestation_pointer);
							return contextual_object;
						}, this);

		return manifestation_contextual_objects;
	};

	proto.get_attachment_instance = function (type) {
		var dict = this.get_object();
		var direct_attachments = dict.direct_attachments();
		var len = direct_attachments.length;
		var attachment;
		var info;

		for (var i = 0; i<len; i += 1) {
			attachment = direct_attachments[i];
			if (attachment.get_type() === type) {
				info = {
					attachment: attachment,
					owner: dict
				}
				break;
			}
		}

		if (!info) {
			var proto_objects = this.get_all_protos();
			var plen = proto_objects.length;
			var proto_obj, j;

			outer_loop:
			for (var i = 0; i<plen; i += 1) {
				proto_obj = proto_objects[i];
				direct_attachments = proto_obj.direct_attachments();
				len = direct_attachments.length;
				for (var j = 0; j<len; j += 1) {
					attachment = direct_attachments[j];
					if (attachment.get_type() === type) {
						info = {
							attachment: attachment,
							owner: dict
						}
						break outer_loop;
					}
				}
			}
		}


		if (info) {
			attachment = info.attachment;
			var attachment_instance;
			if (this._attachment_instances.hasOwnProperty(name)) {
				attachment_instance = this._attachment_instances[name];
			} else {
				attachment_instance = this._attachment_instances[name] = attachment.create_instance(this);
			}
			return attachment_instance;
		} else {
			if (this._attachment_instances.hasOwnProperty(name)) {
				var attachment_instance = this._attachment_instances[name];
				attachment_instance.destroy();
				delete this._attachment_instances[name];
			}
			return undefined;
		}
	};

	proto.destroy = function () {
		my.superclass.destroy.apply(this, arguments);
		this.attachments.destroy();
		this.get_child_pointer_objects.destroy();
	};

	proto._getter = function () {
		return this;
	};
}(red.ContextualDict));

}(red));
