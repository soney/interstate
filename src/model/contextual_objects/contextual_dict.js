/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,RedSet,RedMap */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var proto_eq = function (a, b) {
		var i;
		if (_.isArray(a) && _.isArray(b)) {
			var len = a.length;
			if (len !== b.length) {
				return false;
			}
		
			for (i = 0; i < len; i += 1) {
				if (a[i] !== b[i]) {
					return false;
				}
			}
			return true;
		} else {
			return a === b;
		}
	};
	var each_proto_val = function (x) {
		if (x && x instanceof ist.ContextualDict) {
			return x.get_object();
		} else {
			return false;
		}
	};
	ist.Dict.get_proto_vals = function (dict, ptr) {
		var rv = new RedSet({
			value: [dict],
			hash: "hash"
		});

		var pointer = ptr;
		var i = 0;
		while (i < rv.len()) {
			dict = rv.item(i);
			var proto_obj = dict.direct_protos();
			var proto_val;
			if (cjs.isArrayConstraint(proto_obj)) {
				proto_val = proto_obj.toArray();
			} else if (proto_obj) {
				var proto_contextual_obj = ist.find_or_put_contextual_obj(proto_obj, pointer.push(proto_obj), {
					check_on_nullify: true,
					equals: proto_eq
				});
				proto_val = proto_contextual_obj.val();
			} else {
				proto_val = [];
			}
			proto_val = _	.chain(_.isArray(proto_val) ? proto_val : [proto_val])
							.map(each_proto_val)
							.compact()
							.value();
			rv.add_at.apply(rv, ([i + 1].concat(proto_val)));
			i += 1;
		}
		var rv_arr = rv.toArray();

		return rv_arr.slice(1); // don't include the original dict
	};

	ist.Dict.get_prop_name = function (dict, value, pcontext) {
		var direct_props = dict.direct_props();
		var i;

		var rv = direct_props.keyForValue({value: value});
		if (_.isUndefined(rv) && pcontext) {
			var protos = ist.Dict.get_proto_vals(dict, pcontext);
			for (i = 0; i < protos.length; i += 1) {
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

	ist.Dict.get_prop_info = function (dict, prop_name, pcontext) {
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

	ist.Dict.get_prop = function (dict, prop_name, pcontext) {
		var info = ist.Dict.get_prop_info(dict, prop_name, pcontext);
		if (info) {
			return info.value;
		} else {
			return undefined;
		}
	};

	var get_contextual_object = function (value, pointer) {
		var value_ptr = pointer.push(value);

		if (value instanceof ist.Dict || value instanceof ist.Cell || value instanceof ist.StatefulProp) {
			var contextual_object = ist.find_or_put_contextual_obj(value, value_ptr);
			return contextual_object;
		} else {
			return value;
		}
	};
	interstate.get_dom_obj = function(cdict) {
		if(cdict.get_dom_obj) {
			return cdict.get_dom_obj();
		} else {
			return false;
		}
	};
	interstate.get_dom_obj = function(cdict) {
		if(cdict.get_dom_obj) {
			return cdict.get_dom_obj();
		} else {
			return false;
		}
	};

	ist.ContextualDict = function (options) {
		this.get_all_protos = cjs.memoize(this._get_all_protos, {context: this});
		//this.get_all_protos = this._get_all_protos;
		ist.ContextualDict.superclass.constructor.apply(this, arguments);
		this._type = "dict";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function() {
			My.superclass.initialize.apply(this, arguments);
			this._attachment_instances = { };
			this._manifestation_objects = new RedMap({ });
		};

		proto.has_copies = function() {
			var dict = this.object;
			return dict.has_copies();
		};

		proto._get_all_protos = function() {
			return ist.Dict.get_proto_vals(this.get_object(), this.get_pointer());
		};
		proto.get_dom_obj = function() {
			var dom_attachment = this.get_attachment_instance("dom"),
				dom_obj;
			if (dom_attachment) {
				dom_obj = dom_attachment.get_dom_obj();
				if(dom_obj) {
					return dom_obj;
				}
			} else {
				var raphael_attachment = this.get_attachment_instance("paper");
				if(raphael_attachment) {
					dom_obj = raphael_attachment.get_dom_obj();

					if(dom_obj) {
						return dom_obj;
					}
				}
			}
			return false;
		};

		proto.raw_children = function (exclude_builtins) {
			var dict = this.object;
			var pointer = this.pointer;
			var i;

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
			if (exclude_builtins !== true && my_ptr_index >= 0) {
				var special_contexts = pointer.special_contexts(my_ptr_index);
				var len = special_contexts.length;
				var sc, co;
				var each_co = function (v, k) {
					if (!owners.hasOwnProperty(k)) {
						owners[k] = sc;
						special_context_names.push(k);
					}
				};
				for (i = 0; i < len; i += 1) {
					sc = special_contexts[i];
					co = sc.get_context_obj();
					_.each(co, each_co);
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
				["special_context", special_context_names],
				["builtin", builtin_names],
				["direct", direct_names],
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
					return {name: name, value: info.value, inherited: type === "inherited", builtin: (type === "builtin" || type === "special_context") };
				}, this);
				rv.push.apply(rv, contextual_objects);
			}, this);

			return rv;
		};
		proto.builtin_children = function() {
			var dict = this.object,
				pointer = this.pointer,
				my_ptr_index = pointer.lastIndexOf(dict),
				builtin_names = dict._get_builtin_prop_names(),
				special_context_names = [],
				owners = {},
				builtin_infos = _.map(builtin_names, function (name) {
					return dict._get_builtin_prop_info(name);
				}),
				builtin_contextual_objects = _.map(builtin_infos, function (info, i) {
					var name = builtin_names[i];
					return {name: name, value: info.value, inherited: false, builtin: true };
				}, this);

			if (my_ptr_index >= 0) {
				var special_contexts = pointer.special_contexts(my_ptr_index),
					len = special_contexts.length,
					sc, co, i,
					each_co = function (v, k) {
						owners[k] = sc;
						special_context_names.push(k);
					};

				for (i = 0; i < len; i += 1) {
					sc = special_contexts[i];
					co = sc.get_context_obj();
					_.each(co, each_co);
				}
			}

			var special_context_infos = _.map(special_context_names, function (name) {
						var sc = owners[name];
						var co = sc.get_context_obj();
						return co[name];
					}),
				special_context_contextual_objects = _.map(special_context_infos, function (info, i) {
					var name = special_context_names[i];
					return {name: name, value: info.value, inherited: false, builtin: true };
				}, this);
			
			var contextual_objects = special_context_contextual_objects.concat(builtin_contextual_objects),
				children = _.map(contextual_objects, function(raw_child) {
					return _.extend({}, raw_child, {
						value: get_contextual_object(raw_child.value, pointer)
					});
				});


			return children;
		};
		proto.children = function (exclude_builtins) {
			if(this.is_template()) {
				// This is a bit of a hack; when "copies" changes from "" to "5", then my
				// children's contextual objects are destroyed. However, when I switch back
				// any constraints on the value of children aren't nullified.
				//
				// Adding the is_template() check ensures that they will be nullified
				return [];
			} else {
				var raw_children = this.raw_children(exclude_builtins);
				var pointer = this.pointer;
				var children = _.map(raw_children, function(raw_child) {
					return _.extend({}, raw_child, {
						value: get_contextual_object(raw_child.value, pointer)
					});
				});
				return children;
			}
		};
		proto.parent = function() {
			var popped_pointer = this.pointer.pop();
			var contextual_object = ist.find_or_put_contextual_obj(popped_pointer.points_at(), popped_pointer);
			return contextual_object;
		};
		proto.has = function (name, ignore_inherited) {
			var dict = this.get_object();
			var i;
			if (dict._has_direct_prop(name) || dict._has_builtin_prop(name)) {
				return true;
			} else if (ignore_inherited !== true) {
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
					for (i = 0; i < len; i += 1) {
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
				info,
				i,
				len;
			if (dict._has_builtin_prop(name)) {
				info = dict._get_builtin_prop_info(name);
			} else if (dict._has_direct_prop(name)) {
				info = dict._get_direct_prop_info(name);
			} else {
				var pointer = this.get_pointer();
				var my_ptr_index = pointer.lastIndexOf(dict);
				if (my_ptr_index >= 0) {
					var special_contexts = pointer.special_contexts(my_ptr_index);
					len = special_contexts.length;
					var sc, co;
					for (i = 0; i < len; i += 1) {
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
					len = proto_objects.length;
					var d;
					for (i = 0; i < len; i += 1) {
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
				var value = get_contextual_object(info.value, pointer);
				return value;
			} else {
				return undefined;
			}
		};

		proto.prop_val = function (name, ignore_inherited) {
			var value = this.prop(name, ignore_inherited);
			if (value instanceof ist.ContextualObject) {
				return value.val();
			} else {
				return cjs.get(value);
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
			if (manifestations instanceof ist.Cell) {
				var manifestations_pointer = pointer.push(manifestations);
				var manifestations_contextual_object = ist.find_or_put_contextual_obj(manifestations, manifestations_pointer);
				var manifestations_value = manifestations_contextual_object.val();
				manifestations_value = cjs.get(manifestations_value);
				return manifestations_value;
			} else {
				return cjs.get(manifestations);
			}
		};

		proto.is_instance = function() {
			var pointer = this.get_pointer();
			var object = this.get_object();
			var obj_index = pointer.lastIndexOf(object);
			var i;

			if (obj_index >= 0) {
				var special_contexts = pointer.special_contexts(obj_index);
				var special_context;
				for (i = special_contexts.length - 1; i >= 0; i -= 1) {
					special_context = special_contexts[i];
					if (special_context instanceof ist.CopyContext) {
						return true;
					}
				}
			}
			return false;
		};

		proto.is_template = function () {
			if(this.is_instance()) {
				return false;
			} else {
				var manifestations_value = this.get_manifestations_value();
				return (_.isNumber(manifestations_value) && !isNaN(manifestations_value)) || _.isArray(manifestations_value);
			}
		};

		proto.is_instance = function () {
			var pointer = this.get_pointer();
			var object = this.get_object();
			var obj_index = pointer.lastIndexOf(object);
			var i;

			if (obj_index >= 0) {
				var special_contexts = pointer.special_contexts(obj_index);
				var special_context;
				for (i = special_contexts.length - 1; i >= 0; i -= 1) {
					special_context = special_contexts[i];
					if (special_context instanceof ist.CopyContext) {
						return true;
					}
				}
			}
			return false;
		};

		proto.get_template_info = function () {
			var pointer = this.get_pointer();
			var object = this.get_object();
			var obj_index = pointer.lastIndexOf(object);
			var i;

			if (obj_index >= 0) {
				var ptr = pointer.slice(0, obj_index);
				ptr = ptr.push(object);

				var special_contexts = pointer.special_contexts(obj_index);
				var special_context;
				for (i = special_contexts.length - 1; i >= 0; i -= 1) {
					special_context = special_contexts[i];
					if (special_context instanceof ist.CopyContext) {
						return {cobj: ist.find_or_put_contextual_obj(object, ptr), index: special_context.get_copy_num()};
					}
				}
			}
			return false;
		};

		proto.instance_pointers = function() {
			var manifestations_value = this.get_manifestations_value();
			var i;
			if (_.isNumber(manifestations_value)) {
				var len = manifestations_value;
				manifestations_value = [];

				for (i = 0; i < len; i += 1) {
					manifestations_value[i] = i;
				}
			}

			var pointer = this.get_pointer();
			var manifestation_pointers = _.map(manifestations_value, function (basis, index) {
					var manifestation_obj = this._manifestation_objects.get_or_put(basis, function () {
						return new ist.CopyContext(this, basis, index);
					}, this);
					var manifestation_pointer = pointer.push_special_context(manifestation_obj);
					return manifestation_pointer;
				}, this);

			return manifestation_pointers;
		};
		proto.instances = function () {
			var object = this.get_object();
			var instance_pointers = this.instance_pointers();
			var manifestation_contextual_objects = _.map(instance_pointers, function(instance_pointer) {
				var contextual_object = ist.find_or_put_contextual_obj(object, instance_pointer);
				return contextual_object;
			});

			return manifestation_contextual_objects;
		};

		proto.get_attachment_instance = function (type) {
			var info = this.get_attachment_instance_and_src(type);
			if(info) {
				var attachment = info.attachment;
				var attachment_instance;
				if (this._attachment_instances.hasOwnProperty(type)) {
					attachment_instance = this._attachment_instances[type];
					if(attachment_instance.get_creator() !== info.attachment) {
						attachment_instance.destroy();
						attachment_instance = this._attachment_instances[type] = attachment.create_instance(this, info.owner);
					}
				} else {
					attachment_instance = this._attachment_instances[type] = attachment.create_instance(this, info.owner);
				}
				return attachment_instance;
			} else {
				return undefined;
			}
		};

		proto.get_attachment_instance_and_src = function (type) {
			var dict = this.get_object();
			var direct_attachments = dict.direct_attachments();
			var len = direct_attachments.length;
			var attachment, info, i, j, attachment_instance;

			for (i = 0; i < len; i += 1) {
				attachment = direct_attachments[i];
				if (attachment.get_type() === type) {
					info = {
						attachment: attachment,
						owner: dict
					};
					break;
				}
			}

			if (!info) {
				var proto_objects = this.get_all_protos();
				var plen = proto_objects.length;
				var proto_obj;

				outer_loop:
				for (i = 0; i < plen; i += 1) {
					proto_obj = proto_objects[i];
					direct_attachments = proto_obj.direct_attachments();
					len = direct_attachments.length;
					for (j = 0; j < len; j += 1) {
						attachment = direct_attachments[j];
						if (attachment.get_type() === type) {
							info = {
								attachment: attachment,
								owner: dict
							};
							break outer_loop;
						}
					}
				}
			}

			if (info) {
				return info;
			} else {
				if (this._attachment_instances.hasOwnProperty(type)) {
					attachment_instance = this._attachment_instances[type];
					attachment_instance.destroy();
					delete this._attachment_instances[type];
				}
				return undefined;
			}
		};

		proto.destroy = function () {
			if(this.constructor === My) { this.emit_begin_destroy(); }
			//The attachment instances might be listening for property changes for destroy them first
			_.each(this._attachment_instances, function(attachment_instance) {
				attachment_instance.destroy(true);
			});
			delete this._attachment_instances;

			this._manifestation_objects.destroy(true);
			delete this._manifestation_objects;

			My.superclass.destroy.apply(this, arguments);

			// Sometimes I switch get_all_protos to a non-memoized form so check
			if(this.get_all_protos.destroy) {
				this.get_all_protos.destroy(true);
			}
			delete this.get_all_protos;
		};

		proto._getter = function () {
			return this;
		};
	}(ist.ContextualDict));
}(interstate));
