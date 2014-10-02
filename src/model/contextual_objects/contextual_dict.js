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
	var get_cobj_object = function (x) {
			if (x && x instanceof ist.ContextualDict) {
				return x.get_object();
			} else {
				return false;
			}
		},
		is_cdict = function (x) {
			return x && x instanceof ist.ContextualDict;
		};
	ist.Dict.get_proto_vals = function (cobj, non_recursive) {
		var originalCobj = cobj,
			rv = new RedSet({
				value: [originalCobj],
				hash: "hash"
				//equals: ist.check_contextual_object_equality
			}),
			i = 0,
			dict, proto_val, proto_cobj, rv_arr;
		

		while (i < rv.len()) {
			cobj = rv.item(i);
			if(cobj instanceof ist.ContextualDict) {
				proto_cobj = cobj.proto_cobj();
			} else {
				proto_cobj = [];
			}

			if(proto_cobj instanceof ist.ContextualObject) {
				proto_val = proto_cobj.val();
			} else {
				proto_val = proto_cobj;
			}

			if(!_.isArray(proto_val)) {
				proto_val = [proto_val];
			}

			proto_val = _.filter(proto_val, is_cdict);

			rv.add_at.apply(rv, ([i + 1].concat(proto_val)));
			i++;

			if(non_recursive) { break; }
		}
		rv_arr = rv.toArray();

		return rv_arr.slice(1); // don't include the original dict
	};

	ist.Dict.get_prop_name = function (dict, value, pcontext) {
		var direct_props = dict.direct_props(),
			rv = direct_props.keyForValue({value: value}),
			cobj, i, protos, protoi, len;

		if (_.isUndefined(rv) && pcontext) {
			cobj = ist.find_or_put_contextual_obj(dict, pcontext);
			protos = cobj.get_all_protos();
			for (i = 0, len = protos.length; i < len; i++) {
				protoi = protos[i];
				rv = protoi.get_direct_prop_name(value);

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

	var get_contextual_object = function (value, pointer, options) {
		if (value instanceof ist.BasicObject) {
			var value_ptr = pointer.push(value),
				contextual_object = ist.find_or_put_contextual_obj(value, value_ptr, options);
			return contextual_object;
		} else {
			return value;
		}
	};

	ist.get_dom_obj = function(cdict) {
		if(cdict.get_dom_obj) {
			return cdict.get_dom_obj();
		} else {
			return false;
		}
	};

	ist.ContextualDict = function (options) {
		this.inherits_from = cjs.memoize(this._inherits_from, {context: this});
		this.get_all_protos = cjs.memoize(this._get_all_protos, {context: this});
		this.get_dom_obj_and_src = cjs.memoize(this._get_dom_obj_and_src, {context: this});
		this.prop_val = cjs.memoize(this._prop_val, {context: this});
		this.prop = cjs.memoize(this._prop, {context: this});
		this.children = cjs.memoize(this._children, {context: this});
		this.instances = cjs.memoize(this._instances, {context: this});
		this.is_template = cjs.memoize(this._is_template, {context: this});
		this.get_dom_children = cjs.memoize(this._get_dom_children, {context: this});
		this.has = cjs.memoize(this._has, {context: this});
		this._attachment_instances = { };
		this._manifestation_objects = new RedMap({ });
		ist.ContextualDict.superclass.constructor.apply(this, arguments);
		this._type = "dict";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function() {
			if(this.constructor === My) { this.flag_as_initialized();  }
			My.superclass.initialize.apply(this, arguments);
			if(ist.__garbage_collect) {
				this._add_cobj_child_updater();
			}
			if(this.constructor === My) { this.shout_initialization();  }
		};

		proto.proto_cobj = function() {
			var obj = this.get_object(),
				proto_obj = obj.direct_protos(),
				pointer, proto_cobj;
			
			if(cjs.isArrayConstraint(proto_obj)) {
				return proto_obj.toArray();
			} else if(cjs.isConstraint(proto_obj)) {
				return proto_obj.get();
			} else if(proto_obj) {
				pointer = this.get_pointer();
				return ist.find_or_put_contextual_obj(proto_obj, pointer.push(proto_obj), {
					check_on_nullify: true,
					equals: proto_eq
				});
			} else {
				return [];
			}
		};

		proto.has_copies = function() {
			var dict = this.object;
			return dict.has_copies();
		};

		proto._get_all_protos = function(avoid_recursion) {
			if(this.is_template()) {
				return [];
			}
			return ist.Dict.get_proto_vals(this, avoid_recursion);
		};

		proto.raw_children = function (exclude_builtins) {
			var dict = this.get_object(),
				pointer = this.get_pointer(),
				my_ptr_index = pointer.lastIndexOf(dict),
				special_context_names = [],
				builtin_names = exclude_builtins === true ? [] : dict._get_builtin_prop_names(),
				direct_names = this.get_direct_prop_names(),
				owners = {},
				proto_objects = this.get_all_protos(true),
				inherited_names = [],
				i, copy = pointer.copy();

			_.each(builtin_names, function (name) {
				owners[name] = this;
			}, this);

			_.each(direct_names, function (name) {
				owners[name] = this;
			}, this);


			if (exclude_builtins !== true && my_ptr_index >= 0) {
				if(copy) {
					_.each(copy, function(v, k) {
						owners[k] = copy;
						special_context_names.push(k);
					}, this);
				}
			/*
				var special_contexts = pointer.special_contexts(my_ptr_index),
					len = special_contexts.length,
					sc, co,
					each_co = function (v, k) {
						if (!owners.hasOwnProperty(k)) {
							owners[k] = sc;
							special_context_names.push(k);
						}
					};

				for (i = 0; i < len; i++) {
					sc = special_contexts[i];
					co = sc.get_context_obj();
					_.each(co, each_co);
				}
				*/
			}

			_.each(proto_objects, function (p) {
				var p_children = p.raw_children(true);
				_.each(p_children, function(child_info) {
					var name = child_info.name;
					if (!owners.hasOwnProperty(name)) {
						owners[name] = p;
						inherited_names.push(name);
					}
				});
			}, this);


			var rv = [];
			_.each([
				["special_context", special_context_names],
				["builtin", builtin_names],
				["direct", direct_names],
				["inherited", inherited_names]
			], function (info) {
				var type = info[0],
					names = info[1],
					is_inherited = type==="inherited",
					is_builtin = type==="builtin" || type==="special_context",
					getter_fn, infos;

				if (type === "builtin") {
					infos = _.map(names, function (name) {
						return this.get_builtin_prop_info(name);
					}, this);
				} else if (type === "direct") {
					infos = _.map(names, function (name) {
						return this.prop_info(name, true);
					}, this);
				} else if (type === "inherited") {
					infos = _.map(names, function (name) {
						var owner = owners[name],
							value = owner.prop(name),
							value_obj = value instanceof ist.ContextualObject ? value.get_object() : value,
							info = {
								value: value_obj,
								owner: owner,
								inherited_from: value
							};
						return info;
					}, this);
				} else if (type === "special_context") {
					infos = _.map(names, function (name) {
						var sc = owners[name];
							//co = sc.get_context_obj();
						return {
							value: sc[name],
							owner: sc
						}
					}, this);
				}

				var contextual_objects = _.map(infos, function (info, i) {
					var name = names[i];
					return {
						name: name,
						value: info.value,
						inherited_from: info.inherited_from || false,
						inherited: is_inherited,
						builtin: is_builtin
					};
				}, this);
				rv.push.apply(rv, contextual_objects);
			}, this);

			return rv;
		};
		proto.builtin_children = function() {
			if(this.is_template()) {
				// This is a bit of a hack; when "copies" changes from "" to "5", then my
				// children's contextual objects are destroyed. However, when I switch back
				// any constraints on the value of children aren't nullified.
				//
				// Adding the is_template() check ensures that they will be nullified
				return [];
			} else {
				var dict = this.object,
					pointer = this.pointer,
					my_ptr_index = pointer.lastIndexOf(dict),
					builtin_names = dict._get_builtin_prop_names(),
					owners = {},
					builtin_infos = _.map(builtin_names, function (name) {
						return dict._get_builtin_prop_info(name);
					}),
					builtin_contextual_objects = _.map(builtin_infos, function (info, i) {
						var name = builtin_names[i];
						return {name: name, value: info.value, inherited: false, builtin: true };
					}, this),
					copy = pointer.copy(),
					special_context_names;

				var special_context_infos = _.map(special_context_names, function (name) {
							var sc = owners[name];
							var co = sc.get_context_obj();
							return co[name];
						}),
					special_context_contextual_objects = _.map(special_context_infos, function (info, i) {
						var name = special_context_names[i];
						return {name: name, value: info.value, inherited: false, builtin: true };
					}, this) || [];
				
				var contextual_objects = special_context_contextual_objects.concat(builtin_contextual_objects),
					children = _.map(contextual_objects, function(raw_child) {
						var opts = {};
						if(raw_child.inherits_from) {
							opts.inherits_from = raw_child.inherits_from;
						}
						return _.extend({}, raw_child, {
							value: get_contextual_object(raw_child.value, pointer, opts)
						});
					});


				return children;
			}
		};

		proto._children = function (exclude_builtins) {
			if(this.is_template()) {
				// This is a bit of a hack; when "copies" changes from "" to "5", then my
				// children's contextual objects are destroyed. However, when I switch back
				// any constraints on the value of children aren't nullified.
				//
				// Adding the is_template() check ensures that they will be nullified
				return [];
			} else {
				var raw_children = this.raw_children(exclude_builtins),
					pointer = this.pointer,
					children = _.map(raw_children, function(raw_child) {
						var opts = {};
						if(raw_child.inherited_from) {
							opts.inherited_from = raw_child.inherited_from;
						}
						return _.extend({}, raw_child, {
							value: get_contextual_object(raw_child.value, pointer, opts)
						});
					});

				return children;
			}
		};
		proto.parent = function() {
			var popped_pointer = this.pointer.pop(),
				contextual_object = ist.find_or_put_contextual_obj(popped_pointer.pointsAt(), popped_pointer);
			return contextual_object;
		};
		proto._has = function (name, ignore_inherited) {
			if(this.is_template()) {
				return false;
			}

			var dict = this.get_object();
			var i;
			if (dict._has_direct_prop(name) || dict._has_builtin_prop(name)) {
				return true;
			} else if (ignore_inherited !== true) {
				var proto_objects = this.get_all_protos();
				if (_.any(proto_objects, function (d) { return d.has_direct_prop(name); })) {
					return true;
				}
			}
			return false;
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
				if (!info && ignore_inherited !== true) {
					var proto_objects = this.get_all_protos();
					len = proto_objects.length;
					var d;
					for (i = 0; i < len; i += 1) {
						d = proto_objects[i];
						if (d.has_direct_prop(name)) {
							info = _.extend({
										inherited_from: d
									}, d.get_direct_prop_info(name));
							break;
						}
					}
				}
			}
			return info;
		};
		proto._prop = function (name, ignore_inherited) {
			var info = this.prop_info(name, ignore_inherited);

			if (info) {

				var pointer = this.get_pointer();

				//if(window.dbg && pointer.hash() === 35) { debugger; }

				var opts = {};
				if(info.inherited_from) {
					opts.inherited_from = info.inherited_from;
				}

				var value = get_contextual_object(info.value, pointer, opts);

				//if(value.is_destroyed && value.is_destroyed()) { debugger; }

				return value;
			} else {
				return undefined;
			}
		};

		proto._prop_val = function (name, ignore_inherited) {
			var value = this.prop(name, ignore_inherited);

			if (value instanceof ist.ContextualObject) {
				return value.val();
			} else if(cjs.isConstraint(value)) {
				return value.get();
			} else {
				return value;
			}
		};

		proto.copies_obj = function () {
			var object = this.get_object();
			var copies = object.get_copies();
			return copies;
		};

		proto.get_direct_prop_name = function(value) {
			var obj = this.get_object(),
				direct_props = obj.direct_props(),
				rv = direct_props.keyForValue({value: value});
			return rv;
		};

		proto.get_direct_prop_names = function() {
			var object = this.get_object();
			return object._get_direct_prop_names();
		};

		proto.get_builtin_prop_info = function(name) {
			var object = this.get_object();
			return object._get_builtin_prop_info(name);
		};

		proto.has_direct_prop = function(name) {
			var object = this.get_object();
			return object._has_direct_prop(name);
		};

		proto.get_direct_prop_info = function(name) {
			var object = this.get_object();
			return object._get_direct_prop_info(name);
		};

		proto.get_direct_attachments = function() {
			var object = this.get_object();
			return object.direct_attachments();
		};

		proto.get_manifestations_value = function () {
			var pointer = this.get_pointer();

			var manifestations = this.copies_obj();
			if (manifestations instanceof ist.Cell) {
				var constraint = manifestations.value_in_context(pointer);
				return cjs.get(constraint);
				//return constraint.get();
			/*
				var manifestations_pointer = pointer.push(manifestations),
					manifestations_contextual_object = ist.find_or_put_contextual_obj(manifestations, manifestations_pointer),
					manifestations_value = manifestations_contextual_object.val();
				manifestations_value = cjs.get(manifestations_value);
				return manifestations_value;
				*/
			} else {
				return cjs.get(manifestations);
			}
		};

		proto.is_instance = function() {
			var pointer = this.get_pointer(),
				object = this.get_object(),
				obj_index = pointer.lastIndexOf(object),
				i, copy;

			if (obj_index >= 0) {
				copy = pointer.copy(obj_index);
				if(copy) {
					return true;
				}
			}
			return false;
		};

		proto._is_template = function () {
			if(this.is_instance()) {
				return false;
			} else {
				var manifestations_value = this.get_manifestations_value();
				return (_.isNumber(manifestations_value) && !isNaN(manifestations_value)) || _.isArray(manifestations_value);
			}
		};

		proto._inherits_from = function(cobj) {
			var proto_cobjs = this.get_all_protos(),
				rv = _.contains(proto_cobjs, cobj);
			return rv;
		};

		proto.is_instance = function () {
			var pointer = this.get_pointer(),
				object = this.get_object(),
				obj_index = pointer.lastIndexOf(object);

			if (obj_index >= 0) {
				var copy = pointer.copy(obj_index);
				if(copy) {
					return true;
				}
			}
			return false;
		};

		proto.get_template_info = function () {
			var pointer = this.get_pointer(),
				object = this.get_object(),
				obj_index = pointer.lastIndexOf(object);

			if (obj_index >= 0) {
				var objPointer = pointer.slice(0, obj_index+1),
					copy = objPointer.copy(),
					cObj = objPointer.getContextualObject();

				return {
					cobj: cObj,
					index: copy.index
				};
			}
			return false;
		};

		proto.instance_pointers = function() {
			var manifestations_value = this.get_manifestations_value();
			if (_.isNumber(manifestations_value)) {
				var len = manifestations_value, i;
				manifestations_value = [];

				for (i = 0; i < len; i += 1) {
					manifestations_value[i] = i;
				}
			}

			var pointer = this.get_pointer();
			var manifestation_pointers = _.map(manifestations_value, function (basis, index) {
					var manifestation_obj = this._manifestation_objects.get_or_put(basis, function () {
							return {
								my_copy: basis,
								copy_num: index
							};
						}, this),
						manifestation_pointer = pointer.pushCopy(manifestation_obj);
					return manifestation_pointer;
				}, this);

			return manifestation_pointers;
		};
		proto._instances = function () {
			var object = this.get_object();
			var instance_pointers = this.instance_pointers();
			var manifestation_contextual_objects = _.map(instance_pointers, function(instance_pointer) {
				var contextual_object = ist.find_or_put_contextual_obj(object, instance_pointer);
				return contextual_object;
			});

			return manifestation_contextual_objects;
		};

		proto.get_attachment_types = function() {
			var types = [], info;
			if(!this.is_template()) {
				var dict = this.get_object(),
					direct_attachments = dict.direct_attachments(),
					len = direct_attachments.length,
					attachment, i, j;

				for (i = 0; i < len; i += 1) {
					attachment = direct_attachments[i];
					types.push(attachment.get_type());
				}

				var proto_objects = this.get_all_protos();
				var plen = proto_objects.length;
				var proto_obj;

				outer_loop:
				for (i = 0; i < plen; i += 1) {
					proto_obj = proto_objects[i];
					direct_attachments = proto_obj.get_direct_attachments();
					len = direct_attachments.length;
					for (j = 0; j < len; j += 1) {
						attachment = direct_attachments[j];
						types.push(attachment.get_type());
					}
				}
				types = _.uniq(types);
			}

			return types;
		};

		proto.has_attachment_instance = function(type) {
			var attachment = this.gt_attachment_instance_and_srt(type);
			return !!atttachment;
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
						attachment_instance.on_ready();
					}
				} else {
					attachment_instance = this._attachment_instances[type] = attachment.create_instance(this, info.owner);
					attachment_instance.on_ready();
				}
				return attachment_instance;
			} else {
				return undefined;
			}
		};

		proto.get_attachment_instance_and_src = function (type) {
			var info, attachment_instance;
			if(!this.is_template()) {
				var dict = this.get_object(),
					direct_attachments = dict.direct_attachments(),
					len = direct_attachments.length,
					attachment, i, j;

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
						direct_attachments = proto_obj.get_direct_attachments();
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
		proto.updateAttachments = function() {
			_.each(this.get_attachment_types(), function(type) {
				this.get_attachment_instance(type);
			}, this);
		};

		proto._get_valid_cobj_children = function() {
			var rv = [],
				my_pointer = this.get_pointer(),
				is_template = this.is_template();

			if(!is_template) {
				var protos_objs = this.get_all_protos();
				rv.push.apply(rv, _.chain(protos_objs)
									.map(function(cobj) {
										if(cobj instanceof ist.ContextualDict) {
											var proto_cobj = cobj.proto_cobj();
											if(proto_cobj instanceof ist.ContextualObject) {
												return {obj: proto_cobj.get_object(), pointer: proto_cobj.get_pointer()};
											}
										}
									})
									.compact()
									.value());

				var child_infos = this.raw_children();
				_.each(child_infos, function(child_info) {
					var value = child_info.value,
						ptr, cobj, instances;

					if (value instanceof ist.Dict || value instanceof ist.Cell || value instanceof ist.StatefulProp) {
						ptr = my_pointer.push(value);
						rv.push({
							obj: value,
							pointer: ptr,
							options: {
								inherited_from: child_info.inherited_from
							}
						});
					}
				}, this);
			}

			return rv;
		};

		proto.begin_destroy = function() {
			//The attachment instances might be listening for property changes for destroy them first
			_.each(this._attachment_instances, function(attachment_instance, type) {
				attachment_instance.destroy(true);
				delete this._attachment_instances[type];
			}, this);
			delete this._attachment_instances;

			this._remove_cobj_child_updater();

			My.superclass.begin_destroy.apply(this, arguments);
		};

		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }

			this._manifestation_objects.destroy(true);
			delete this._manifestation_objects;

			My.superclass.destroy.apply(this, arguments);

			// Sometimes I switch get_all_protos to a non-memoized form so check
			if(this.get_all_protos.destroy) {
				this.get_all_protos.destroy(true);
				delete this.get_all_protos.options.context;
				delete this.get_all_protos.options.args_map;
			}
			if(this.inherits_from.destroy) {
				this.inherits_from.destroy(true);
				delete this.inherits_from.options.context;
				delete this.inherits_from.options.args_map;
			}
			if(this.get_dom_obj_and_src.destroy) {
				this.get_dom_obj_and_src.destroy(true);
				delete this.get_dom_obj_and_src.options.context;
				delete this.get_dom_obj_and_src.options.args_map;
			}
			if(this.prop_val.destroy) {
				this.prop_val.destroy(true);
				delete this.prop_val.options.context;
				delete this.prop_val.options.args_map;
			}
			if(this.prop.destroy) {
				this.prop.destroy(true);
				delete this.prop.options.context;
				delete this.prop.options.args_map;
			}
			if(this.children.destroy) {
				this.children.destroy(true);
				delete this.children.options.context;
				delete this.children.options.args_map;
			}
			if(this.instances.destroy) {
				this.instances.destroy(true);
				delete this.instances.options.context;
				delete this.instances.options.args_map;
			}
			if(this.is_template.destroy) {
				this.is_template.destroy(true);
				delete this.is_template.options.context;
				delete this.is_template.options.args_map;
			}
			if(this.get_dom_children.destroy) {
				this.get_dom_children.destroy(true);
				delete this.get_dom_children.options.context;
				delete this.get_dom_children.options.args_map;
			}
			if(this.has.destroy) {
				this.has.destroy(true);
				delete this.has.options.context;
				delete this.has.options.args_map;
			}
		};

		proto._getter = function () {
			return this;
		};
		proto._attachment_call = function(attachment_name, fn_name) {
			var attachment = this.get_attachment_instance(attachment_name);
			if(attachment) {
				var args = _.rest(arguments, 2);
				return attachment[fn_name].apply(attachment, args);
			}
			return false;
		};
		proto._get_dom_obj_and_src = function () {
			var show = this.has("show") ? this.prop_val("show") : true,
				dom_obj, robj;
			if(show) {
				var dom_attachment = this.get_attachment_instance("dom");
				if (dom_attachment) {
					dom_obj = dom_attachment.get_dom_obj();
					if (dom_obj) {
						return [dom_obj, dom_attachment];
					}
				} else {
					var paper_attachment = this.get_attachment_instance("paper");
					if(paper_attachment) {
						dom_obj = paper_attachment.get_dom_obj();

						if(dom_obj) {
							return [dom_obj, paper_attachment];
						}
					} else {
						var raphael_attachment = this.get_attachment_instance("shape");
						if(raphael_attachment) {
							robj = raphael_attachment.get_robj();
							if(robj) {
								return [robj.node, raphael_attachment];
							}
						} else {
							var group_attachment_instance = this.get_attachment_instance("group");
							if(group_attachment_instance) {
								var robjs_and_srcs = _.compact(_.map(group_attachment_instance.get_children(), function(raphael_attachment) {
										var robj = raphael_attachment.get_robj();
										if(robj) {
											return [robj.node, raphael_attachment];
										} else {
											return false;
										}
									})),
									rv = [
										_.pluck(robjs_and_srcs, 0),
										_.pluck(robjs_and_srcs, 1)
									];
								return rv;
							}
						}
					}
				}
			}
			return false;
		};

		proto.get_dom_obj = function() {
			var info = this.get_dom_obj_and_src();
			return info[0];
		};

		proto._get_dom_children = function() {
			var srcs = [],
				children = [];
			if (this.is_template()) {
				var instances = this.instances();
				var cs_and_dom_objs = _.chain(instances)
										.map(function(instance) {
											return instance.get_dom_obj_and_src();
										})
										.compact()
										.value();

				var dom_objs = _.pluck(cs_and_dom_objs, 0);
				var obj_srcs = _.pluck(cs_and_dom_objs, 1);
				return {srcs: obj_srcs, children: dom_objs};
			} else {
				var dom_obj_and_src = this.get_dom_obj_and_src();
				if (dom_obj_and_src) {
					return {srcs: [dom_obj_and_src[1]], children: [dom_obj_and_src[0]]};
				}
			}
			return false;
		};

		proto.pause  = function(recursive) {
			My.superclass.pause.apply(this, arguments);
			
			if(recursive) {
			}
		};
		proto.resume = function(recursive) {
			My.superclass.resume.apply(this, arguments);
			
			if(recursive) {
			}
		};
	}(ist.ContextualDict));
}(interstate));
