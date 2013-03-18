(function(red) {
var cjs = red.cjs, _ = red._;

red.ContextualDict = function(options) {
	red.ContextualDict.superclass.constructor.apply(this, arguments);
	this._type = "dict";
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;

	proto.get_all_protos = function() {
		var rv = new Set({
			value: [this.get_object()],
			hash: "hash"
		});

		var pointer = this.get_pointer();
		var i = 0;
		while(i < rv.len()) {
			var dict = rv.item(i);
			var proto_obj = dict.direct_protos();
			var proto_contextual_obj = red.find_or_put_contextual_obj(proto_obj, pointer.push(proto_obj), { check_on_nullify: true });
			var proto_val = proto_contextual_obj.val();
			proto_val = _	.chain(_.isArray(proto_val) ? proto_val : [proto_val])
							.map(function(x) {
								if(x && x instanceof red.ContextualDict) {
									return x.get_object();
								} else {
									return false;
								}
							})
							.compact()
							.value();
			rv.add_at.apply(rv, ([i+1].concat(proto_val)));
			i++;
		}
		var rv_arr = rv.toArray();
		return rv_arr.slice(1); // don't include me
	};

	proto.get_contextual_protos = function() {
		var proto_objects = this.get_all_protos();
		var pointer = this.get_pointer();

		var rv = _.map(proto_objects, function(proto_object) {
			return red.find_or_put_contextual_obj(proto_object, pointer.push(proto_object));
		}, this);

		return rv;
	};

	proto.get_children = function() {
		var dict = this.object;
		var pointer = this.pointer;

		var builtin_names = dict._get_builtin_prop_names();
		var direct_names = dict._get_direct_prop_names();

		var owners = {};
		_.each(builtin_names, function(name) {
			owners[name] = dict;
		}, this);
		_.each(direct_names, function(name) {
			owners[name] = dict;
		}, this);


		var my_ptr_index = pointer.lastIndexOf(dict);
		var special_context_names = [];
		if(my_ptr_index >= 0) {
			var special_contexts = pointer.special_contexts(my_ptr_index);
			var len = special_contexts.length;
			var sc, co;
			for(var i = 0; i<len; i++) {
				sc = special_contexts[i];
				co = sc.get_context_obj();
				_.each(co, function(v, k) {
					if(!owners.hasOwnProperty(k)) {
						owners[k] = sc;
						special_context_names.push(k);
					}
				});
			}
		}

		var proto_objects = this.get_all_protos();

		var inherited_names = [];
		_.each(proto_objects, function(p) {
			var p_direct_names = p._get_direct_prop_names();
			_.each(p_direct_names, function(name) {
				if(!owners.hasOwnProperty(name)) {
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
		], function(info) {
			var type = info[0];
			var names = info[1];
			var getter_fn;

			var infos;
			if(type === "builtin") {
				infos = _.map(names, function(name) {
										return dict._get_builtin_prop_info(name);
								});
			} else if(type === "direct" || type === "inherited") {
				infos = _.map(names, function(name) {
										var owner = type === "direct" ? dict : owners[name];
										return owner._get_direct_prop_info(name);
								});
			} else if(type === "special_context") {
				infos = _.map(names, function(name) {
										var sc = owners[name];
										var co = sc.get_context_obj();
										return co[name];
								});
			}

			var contextual_objects = _.map(infos, function(info, i) {
				var value = info.value;
				var name = names[i];
				var manifestation_pointers = false;
				var value_ptr = pointer.push(value);
				if(value instanceof red.Dict) {
					var manifestations = value.get_manifestations();
					var manifestations_pointer = value_ptr.push(manifestations);
					var manifestations_contextual_object = red.find_or_put_contextual_obj(manifestations, manifestations_pointer);
					var manifestations_value = manifestations_contextual_object.val();

					if(_.isNumber(manifestations_value)) {
						var arr = []
						for(var i = 0; i<manifestations_value; i++) {
							arr[i] = i;
						}
						manifestations_value = arr;
					}

					if(_.isArray(manifestations_value)) {
						manifestation_pointers = _.map(manifestations_value, function(basis, index) {
							var manifestation_obj = new red.ManifestationContext(this, basis, index);
							return pointer.push(value, manifestation_obj);
						}, this);
					}
				}

				if(manifestation_pointers) {
					var contextual_objects = _.map(manifestation_pointers, function(manifestation_pointer) {
						var rv = red.find_or_put_contextual_obj(value, manifestation_pointer);
						return rv;
					});
					return {name: name, value: contextual_objects, inherited: type === "inherited"};
				} else {
					if(value instanceof red.Dict || value instanceof red.Cell || value instanceof red.StatefulProp) {
						var contextual_object = red.find_or_put_contextual_obj(value, value_ptr);
						return {name: name, value: contextual_object, inherited: type === "inherited"};
					} else {
						return {name: name, value: value, inherited: type === "inherited"};
					}
				}
			});
			rv.push.apply(rv, contextual_objects);
		}, this);
		delete owners;

		return rv;
	};
	proto.has = function(name) {
		var dict = this.get_object();
		if(dict._has_direct_prop(name) || dict._has_builtin_prop(name)) {
			return true;
		} else {
			var proto_objects = this.get_all_protos();
			if(_.any(proto_objects, function(d) { return d._has_direct_prop(name); })) {
				return true;
			}

			var pointer = this.get_pointer();
			var my_ptr_index = pointer.lastIndexOf(dict);
			if(my_ptr_index >= 0) {
				var special_contexts = pointer.special_contexts(my_ptr_index);
				var len = special_contexts.length;
				var sc, co;
				for(var i = 0; i<len; i++) {
					sc = special_contexts[i];
					co = sc.get_context_obj();
					if(co.hasOwnProperty(name)) {
						return true;
					}
				}
				return false;
			} else {
				return false;
			}
		}
	};
	proto.get = function(name) {
		var dict = this.get_object(),
			info;
		if(dict._has_builtin_prop(name)) {
			info = dict._get_builtin_info(name);
		} else if(dict._has_direct_prop(name)) {
			info = dict._get_direct_prop_info(name);
		} else {
			var proto_objects = this.get_all_protos();
			var len = proto_objects.length;
			var d;
			for(var i = 0; i<len; i++) {
				d = proto_objects[i];
				if(d._has_direct_prop(name)) {
					info = d._get_direct_prop_info(name);
					break;
				}
			}
			if(!info) {
				var pointer = this.get_pointer();
				var my_ptr_index = pointer.lastIndexOf(dict);
				if(my_ptr_index >= 0) {
					var special_contexts = pointer.special_contexts(my_ptr_index);
					var len = special_contexts.length;
					var sc, co;
					for(var i = 0; i<len; i++) {
						sc = special_contexts[i];
						co = sc.get_context_obj();
						if(co.hasOwnProperty(name)) {
							info = co[name];
							break;
						}
					}
				}
			}
		}

		if(info) {
			var pointer = this.get_pointer();
			var value = info.value;

			var manifestation_pointers = false;
			if(value instanceof red.Dict) {
				var manifestations = value.get_manifestations();
				var manifestations_pointer = pointer.push(manifestations);
				var manifestations_contextual_object = red.find_or_put_contextual_obj(manifestations, manifestations_pointer);
				var manifestations_value = manifestations_contextual_object.val();

				if(_.isNumber(manifestations_value)) {
					var arr = []
					for(var i = 0; i<manifestations_value; i++) {
						arr[i] = i;
					}
					manifestations_value = arr;
				}

				if(_.isArray(manifestations_value)) {
					manifestation_pointers = _.map(manifestations_value, function(basis, index) {
						var manifestation_obj = new red.ManifestationContext(this, basis, index);
						return pointer.push(value, manifestation_obj);
					}, this);
				}
			}

			if(manifestation_pointers) {
				var contextual_objects = _.map(manifestation_pointers, function(manifestation_pointer) {
					var rv = red.find_or_put_contextual_obj(value, manifestation_pointer);
					return rv;
				});
				return contextual_objects;
			} else {
				if(value instanceof red.Dict || value instanceof red.Cell || value instanceof red.StatefulProp) {
					var contextual_object = red.find_or_put_contextual_obj(value, pointer.push(value));
					return contextual_object;
				} else {
					return value;
				}
			}
		} else {
			return undefined;
		}
	};
	proto.getget = function(name) {
		var value = this.get(name);
		if(value instanceof red.ContextualObject) {
			return value.val();
		} else {
			return value;
		}
	};

	proto.get_attachment_instance = function(type) {
		var dict = this.get_object();
		var direct_attachments = dict.direct_attachments();
		var len = direct_attachments.length;
		var attachment;
		var info;

		for(var i = 0; i<len; i++) {
			attachment = direct_attachments[i];
			if(attachment.get_type() === type) {
				info = {
					attachment: attachment,
					owner: dict
				}
				break;
			}
		}

		if(!info) {
			var proto_objects = this.get_all_protos();
			var plen = proto_objects.length;
			var proto_obj, j;

			outer_loop:
			for(var i = 0; i<plen; i++) {
				proto_obj = proto_objects[i];
				direct_attachments = proto_obj.direct_attachments();
				len = direct_attachments.length;
				for(var j = 0; j<len; j++) {
					attachment = direct_attachments[j];
					if(attachment.get_type() === type) {
						info = {
							attachment: attachment,
							owner: dict
						}
						break outer_loop;
					}
				}
			}
		}

		if(info) {
			attachment = info.attachment;
			var attachment_instance = attachment.create_instance(this);
			return attachment_instance;
		} else {
			return undefined;
		}
	};

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
		this.attachments.destroy();
		this.get_child_pointer_objects.destroy();
	};

	proto._getter = function() {
		return this;
	};
}(red.ContextualDict));

red.ContextualStatefulObj = function(options) {
	red.ContextualStatefulObj.superclass.constructor.apply(this, arguments);
	var own_statechart = this.object.get_own_statechart();
	var shadow_statechart = own_statechart.create_shadow({context: this.get_pointer(), running: true});
	this.statechart = shadow_statechart;
	this._type = "stateful";
};

(function(my) {
	_.proto_extend(my, red.ContextualDict);
	var proto = my.prototype;

	proto.get_own_statechart = function() {
		return this.statechart;
	};

	proto.get_statecharts = function() {
		var contextual_protos = this.get_contextual_protos();
		var proto_statecharts = _	.chain(contextual_protos)
									.map(function(x) {
										if(x instanceof red.ContextualStatefulObj) {
											return x.get_own_statechart();
										} else {
											return false;
										}
									})
									.compact()
									.value();

		return ([this.get_own_statechart()]).concat(proto_statecharts);
	};

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
		this.statechart.destroy();
	};
}(red.ContextualStatefulObj));

}(red));
