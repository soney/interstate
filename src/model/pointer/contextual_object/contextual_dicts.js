(function(red) {
var cjs = red.cjs, _ = red._;

red.ContextualDict = function(options) {
	red.ContextualDict.superclass.constructor.apply(this, arguments);

	this.attachment_instances = cjs.map({
		hash: "hash"
	});
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
			var proto_contextual_obj = red.find_or_put_contextual_obj(proto_obj, pointer.push(proto_obj));
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
		var rv = _.map(proto_objects, function(proto_object) {
			return red.find_or_put_contextual_obj(proto_object, this.pointer)
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

		var my_ptr_index = pointer.lastIndexOf(dict);
		var special_context_names;
		if(my_ptr_index >= 0) {
			var special_contexts = pointer.special_contexts(my_ptr_index);
			var len = special_contexts.length;
			var sc, co;
			for(var i = 0; i<len; i++) {
				sc = special_contexts[i];
				co = sc.get_context_obj();
				_.each(co, function(v, k) {
					if(!owners.hasOwnProperty(name)) {
						owners[name] = sc;
						special_context_names.push(name);
					}
				});
			}
		} else {
			special_context_names = [];
		}

		var rv = [];
		_.each([
			["builtin", builtin_names],
			["direct", direct_names],
			["inherited", inherited_names],
			["special_context", special_context_names]
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
				var options = _.extend({
					name: names[i],
					type: type,
					inherited: type === "inherited"
				}, info);

				var value = info.value;
				var contextual_object = red.find_or_put_contextual_obj(value, pointer.push(value), options);
				return contextual_object;
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
			var options = _.extend({
				name: name
			}, info);
			var value = info.value;
			var contextual_object = red.find_or_put_contextual_obj(value, pointer.push(value), options);
			return contextual_object;
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
