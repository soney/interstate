/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;


	ist.ContextualObject = function (options) {
		var id = uid();

		ist.register_uid(id, this);

		this._id = id;
        this._hash = uid.strip_prefix(id);
		this._initialized = false;
		this._destroyed = false;
		this._type = "none";

		this._cobj_children = cjs.map({
			hash: function (info) {
				return info.hash;
			},
			equals: function (info1, info2) {
				if (info1.obj === info2.obj) {
					var sc1 = info1.special_contexts,
						sc2 = info2.special_contexts;

					return ist.check_special_context_equality(sc1, sc2);
				} else {
					return false;
				}
			},
			keys: options && options.pointer_keys || [],
			values: options && options.pointer_values || []
		});

		able.make_this_listenable(this);

		if (_.has(options, "object")) { this.object = options.object; }
		if (_.has(options, "pointer")) { this.pointer = options.pointer; }

		if(options.defer_initialization !== true) {
			this.initialize(options);
		}
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		proto.initialize = function(options) {
			this.$value = new cjs.Constraint(this._getter, {
				context: this,
				check_on_nullify: options && (options.check_on_nullify === true),
				equals: (options && options.equals) || undefined
			});
			this.object.on("begin_destroy", this.destroy, this);
			this._initialized = true;
		};
		proto.is_template = function() { return false; };
		proto.instances = function() { return false; };
		proto.get_name = function() {
			var pointer = this.get_pointer(),
				my_index = pointer.indexOf(this.get_object()),
				parent_obj, parent_pointer, name;

			if(my_index === 0) {
				return ist.root_name;
			} else {
				parent_obj = pointer.points_at(my_index-1);
				parent_pointer = pointer.slice(0, my_index-1);
				if(parent_obj instanceof ist.Dict) {
					name = ist.Dict.get_prop_name(parent_obj, this.get_object(), this.get_pointer().pop());
					return name;
				}
			}
		};
		proto.get_colloquial_name = function() {
			var pointer = this.get_pointer();
			var my_index = pointer.indexOf(this.get_object());
			if(my_index === 0) {
				return "(" + ist.root_name + ")";
			} else {
				var parent_obj = pointer.points_at(my_index-1);
				var parent_pointer = pointer.slice(0, my_index-1);
				if(parent_obj instanceof ist.Dict) {
					var sp_contexts = pointer.special_contexts();
					var extra_txt = "";
					if(sp_contexts.length > 0) {
						var sp_context;
						for(var i = 0; i<sp_contexts.length; i++) {
							sp_context = sp_contexts[i];
							if(sp_context instanceof ist.CopyContext) {
								extra_txt = "[" + sp_context.copy_num + "]";
								break;
							}
						}
					}
					var name = ist.Dict.get_prop_name(parent_obj, this.get_object(), this.get_pointer().pop());

					return "("+name+extra_txt+")";
				} else {
					return "(object)";
				}
			}
		};

		proto.id = function () { return this._id; };
		proto.hash = function() { return this._hash; };
		proto.sid = function() { return parseInt(uid.strip_prefix(this.id()), 10); };
		proto.get_pointer = function () { return this.pointer; };
		proto.get_object = function () { return this.object; };
		proto.is_destroyed = function() { return this._destroyed; };
		proto.is_inherited = function () { return this.inherited; };
		proto._getter = function () { return this.get_object(); };
		proto.type = function () { return this._type; };
		proto.val = function () { return this.$value.get(); };

		proto.summarize = function () {
			var pointer = this.get_pointer(),
				object = this.get_object(),
				summarized_pointer = pointer.summarize(),
				summarized_object = object.id();
			return {
				id: this.id(),
				pointer: summarized_pointer,
				object_uid: summarized_object,
				obj_id: object.id(),
				type: this.type()
			};
		};

		proto.desummarize = function (obj) {
			var pointer = ist.Pointer.desummarize(obj.pointer),
				object = ist.find_uid(obj.object_uid);
			return ist.find_or_put_contextual_obj(object, pointer);
		};

		proto.toString = function () {
			return "p_" + this.get_pointer().toString();
		};

		proto.emit_begin_destroy = function() {
			this._emit("begin_destroy", this);
		};

		proto.destroy = function (silent, avoid_destroy_call) {
			if(this.object) { this.object.off("begin_destroy", this.destroy, this); }
			if(this.constructor === My) { this.emit_begin_destroy(); }
			this._destroyed = true;

			ist.remove_cobj_cached_item(this);
			/*
			if(avoid_destroy_call !== true) {
				ist.destroy_contextual_obj(this);
			}
			*/
			this._cobj_children.forEach(function(child) {
				child.destroy(true);
			});
			this._cobj_children.destroy(true);
			delete this._cobj_children;

			this.$value.destroy(true);
			delete this.object;
			delete this.pointer;
			delete this.$value;
			ist.unregister_uid(this.id());
			this._emit("destroyed");
			able.destroy_this_listenable(this);
		};
		proto._get_valid_cobj_children = function() { return []; };

		proto.update_cobj_children = function(recursive) {
			cjs.wait();
			var children = _.clone(this._cobj_children.values()),
				keys = _.clone(this._cobj_children.keys()),
				my_ptr = this.get_pointer(),

				valid_children = this._get_valid_cobj_children(),
				valid_children_map = {},
				
				to_destroy = [];

			_.each(valid_children, function(vc) {
				var hash = vc.pointer.hash();
				if(_.has(valid_children_map, hash)) {
					valid_children_map[hash].push(vc);
				} else {
					valid_children_map[hash] = [vc];
				}
			});

			_.each(children, function(cobj, index) {
				var key = keys[index],
					//cchild = child.get_contextual_object(),
					obj = key.obj,
					special_context = key.special_context,
					ptr = my_ptr.push(obj, special_context),
					hash = ptr.hash(),
					found = false;

				if(_.has(valid_children_map, hash)) {
					var vcm = valid_children_map[hash], len = vcm.length, vc;
					for(var i = 0; i<len; i++) {
						vc = vcm[i];
						if(vc.obj === obj && vc.pointer.eq(ptr)) {
							found = true;
							break;
						}
					}
				}

				if(!found) {
					to_destroy.push({key: key, value: cobj});
				}
			}, this);

			_.each(valid_children, function(valid_child) {
				var obj = valid_child.obj,
					ptr = valid_child.pointer,
					len_minus_1 = ptr.length()-1,
					hash = ptr.itemHash(len_minus_1),
					special_contexts = ptr.special_contexts(len_minus_1),
					also_initialize = false,
					key = {
						obj: obj,
						special_contexts: special_contexts,
						hash: hash
					},
					cobj = this.get_or_put_cobj_key(key);

				if(recursive) {
					cobj.update_cobj_children(recursive);
				}
			}, this);

			_.each(to_destroy, function(to_destroy_info) {
				var child = to_destroy_info.value,
					key = to_destroy_info.key;
				//if(!child._destroyed) {
				child.destroy(true, true);
				//}
				this._cobj_children.remove(key);
			}, this);
			//console.log(this.get_pointer().toString());

			this.updateAttachments();
			/*
			var valid_off_center_objects = cobj.is_template() ? [] : cobj.get_all_protos(),
				current_off_center_objects = _.clone(this.off_center_objects.keys());
			_.each(current_off_center_objects, function(coce) {
				var index = valid_off_center_objects.indexOf(coce);
				if(index >= 0) {
					valid_off_center_objects.splice(index, 1);
				} else {
					var off_center_cobj = this.off_center_objects.get(coce);
					off_center_cobj.destroy(true);
					//this.off_center_objects.remove(coce);
					//debugger;
					//console.log("Remove", coce);
				}
			}, this);
			_.each(valid_off_center_objects, function(voce) {
				var off_center_cobj = ist.create_contextual_object(voce, my_ptr, {defer_initialization: true});
				this.off_center_objects.put(voce, off_center_cobj);
				off_center_cobj.initialize();
				//console.log("Add", voce);
			}, this);
			/**/

			cjs.signal();
		};

		proto.get_or_put_cobj_key = function(key) {
			var must_initialize = false,
				cobj = this._cobj_children.getOrPut(key, function() {
					var cobj = ist.create_contextual_object(key.obj, this.pointer.push(key.obj, key.special_contexts), {
						defer_initialization: true
					});
					must_initialize = true;

					return cobj;
				}, this);

			if(must_initialize) {
				cobj.initialize();
				cobj.on("begin_destroy", function() {
					this._cobj_children.remove(key);
				}, this);
			}

			return cobj;
		};
		proto.get_or_put_cobj_child = function (obj, special_contexts, hash) {
			return this.get_or_put_cobj_key({
				obj: obj,
				special_contexts: special_contexts,
				hash: hash
			});
		};
		proto.remove_cobj_child = function(obj, special_contexts, hash) {
			//var children = _.clone(this._cobj_children.values()),
			var info = { obj: obj, special_contexts: special_contexts, hash: hash },
				value = this._cobj_children.get(info);
			if(value) {
				this._cobj_children.remove(info);
				value.destroy(true);
			}
		};

		proto.updateAttachments = function(){};

	}(ist.ContextualObject));


	ist.check_contextual_object_equality =  ist.check_contextual_object_equality_eqeqeq = function (itema, itemb) {
		if (itema instanceof ist.ContextualObject && itemb instanceof ist.ContextualObject) {
			return itema.get_pointer().eq(itemb.get_pointer()) && itema.get_object() === itemb.get_object();
		} else {
			return itema === itemb;
		}
	};

	ist.create_contextual_object = function (object, pointer, options) {
		options = _.extend({
			object: object,
			pointer: pointer
		}, options);

		var rv;
		if (object instanceof ist.Cell) {
			rv = new ist.ContextualCell(options);
		} else if (object instanceof ist.StatefulProp) {
			rv = new ist.ContextualStatefulProp(options);
		} else if (object instanceof ist.StatefulObj) {
			rv = new ist.ContextualStatefulObj(options);
		} else if (object instanceof ist.Dict) {
			rv = new ist.ContextualDict(options);
		} else {
			rv = new ist.ContextualObject(options);
		}

		return rv;
	};

	var cobj_hashes = {},
		cobj_roots = {};

	ist.find_or_put_contextual_obj = function (obj, pointer, options) {
		if(!pointer) {
			pointer = new ist.Pointer({stack: [obj]});
		}

		var hash = pointer.hash() + obj.hash(),
			hashed_vals = cobj_hashes[hash],
			pointer_root, hvi, i, len, ptr_i, sc_i, hash_i, new_cobj, node, opts;

		if(hashed_vals) {
			i = 0; len = hashed_vals.length;
			while(i < len) {
				hvi = hashed_vals[i];
				if(hvi.get_object() === obj && pointer.eq(hvi.get_pointer())) {
					return hvi;
				}
				i++;
			}
		} else {
			hashed_vals = cobj_hashes[hash] = [];
		}

		pointer_root = pointer.root();
		hash_i = pointer_root.id();
		node = cobj_roots[hash_i];

		if(!node) {
			opts = {
				object: pointer_root,
				pointer: pointer.slice(0, 1),
				defer_initialization: true
			}

			if(pointer_root instanceof ist.StatefulObj) {
				node = cobj_roots[hash_i] = new ist.ContextualStatefulObj(opts);
			} else if(pointer_root instanceof ist.Dict) {
				node = cobj_roots[hash_i] = new ist.ContextualDict(opts);
			} else {
				throw new Error("Root pointer should be a dictionary");
			}

			node.initialize();
		}

		i = 1;
		len = pointer.length();
		
		while (i < len) {
			ptr_i = pointer.points_at(i);
			sc_i = pointer.special_contexts(i);
			hash_i = pointer.itemHash(i);
			node = node.get_or_put_cobj_child(ptr_i, sc_i, hash_i);
			i++;
		}

		return node;
	};

	ist.remove_cobj_cached_item = function(cobj) {
		var pointer = cobj.get_pointer(),
			obj = cobj.get_object(),
			hash = pointer.hash() + obj.hash(),
			hashes = cobj_hashes[hash],
			len, i;

		if(pointer.length() === 1) {
			delete cobj_roots[obj.id()];
		}

		if(hashes) {
			len = hashes.length;
			for(i = 0; i<len; i++) {
				if(cobj === hashes[i]) {
					if(len === 1) {
						delete cobj_hashes[hash];
					} else {
						hashes.splice(i, 1);
					}
					break;
				}
			}
		}
	};
}(interstate));
