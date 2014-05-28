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

		this._cobj_children = {};

		able.make_this_listenable(this);

		if (_.has(options, "object")) { this.object = options.object; }
		if (_.has(options, "pointer")) { this.pointer = options.pointer; }

		ist.add_cobj_cached_item(this);

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
			if(this.constructor === My) { this.flag_as_initialized();  }
		};
		proto.flag_as_initialized = function() {
			this._initialized = true;
			this._emit("initialized", this);
		};
		proto.is_initialized = function() {
			return this._initialized;
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

		proto.begin_destroy = function(silent) {
			if(this.object) {
				this.object.off("begin_destroy", this.destroy, this);
			}

			if(this._live_cobj_child_updater) {
				this._live_cobj_child_updater.destroy(true);
			}

			this._destroy_all_cobj_children(silent);
			this.emit_begin_destroy();
		};

		proto.destroy = function () {
			if(this.constructor === My) { this.begin_destroy(true); }

			this._destroyed = true;

			ist.remove_cobj_cached_item(this);

			this.$value.destroy(true);
			delete this.object;
			delete this.pointer;
			delete this.$value;
			ist.unregister_uid(this.id());
			this._emit("destroyed");
			able.destroy_this_listenable(this);
		};

		proto._destroy_all_cobj_children = function(silent) {
			_.each(this._cobj_children, function(infos, key) {
				var cobjs = _.pluck(infos, "cobj");
				_.each(cobjs, function(cobj) {
					cobj.destroy(silent);
				});
				delete this._cobj_children[key];
			}, this);
			delete this._live_cobj_child_updater;
		};

		proto._get_valid_cobj_children = function() { return []; };


		proto.update_cobj_children = function(recursive) {
			cjs.wait();
			var valid_children = this._get_valid_cobj_children(),
				to_destroy = {};

			_.each(_.keys(this._cobj_children), function(key) {
				to_destroy[key] = true;
			});

			_.each(valid_children, function(valid_child) {
				var obj = valid_child.obj,
					ptr = valid_child.pointer,
					len_minus_1 = ptr.length()-1,
					hash = ptr.itemHash(len_minus_1),
					special_contexts = ptr.special_contexts(len_minus_1),
					found = false,
					hash_children,
					td, cobj;

				if(_.has(this._cobj_children, hash)) {
					hash_children = this._cobj_children[hash];
					var i = 0,
						len = hash_children.length,
						child_info;

					if(to_destroy[hash] === true) {
						td = to_destroy[hash] = [];
					} else {
						td = to_destroy[hash];
					}

					for(; i<len; i++) {
						child_info = hash_children[i];
						if (child_info.obj === obj) {
							var sc1 = child_info.special_contexts,
								sc2 = special_contexts;

							if(ist.check_special_context_equality(sc1, sc2)) {
								found = true;
								cobj = child_info.cobj;
								if(len === 1) {
									to_destroy[hash] = false;
								} else {
									td[i] = false;
								}
								break;
							}
						}
					}
				} else {
					to_destroy[hash] = false;
					hash_children = this._cobj_children[hash] = [];
				}

				if(!found) {
					cobj = ist.create_contextual_object(obj, ptr, {
						defer_initialization: true
					});
					hash_children.push({
						obj: obj,
						special_contexts: special_contexts,
						cobj: cobj
					});
					cobj.initialize();
					cobj.on("begin_destroy", function() {
						this.remove_cobj_child(obj, special_contexts, hash);
					}, this);
				}

				if(recursive) {
					cobj.update_cobj_children(recursive);
				}
			}, this);
			_.each(to_destroy, function(td, key) {
				var hash_children = this._cobj_children[key];
				if(td === true) {
					_.each(hash_children, function(d) {
						var cobj = d.cobj;
						cobj.destroy(true);
					}, this);
					delete this._cobj_children[key];
				} else if(td !== false) {
					var i = 0, len = hash_children.length, child_info, cobj;

					for(; i<len; i++) {
						if(td[i] !== false) {
							child_info = hash_children[i];
							cobj = child_info.cobj;

							cobj.destroy(true);
							hash_children.splice(i, 1);
							i--;
							len--;
							if(len === 0) {
								delete this._cobj_children[key];
							}
						}
					}
				}
			}, this);

			this.updateAttachments();

			cjs.signal();
		};

		proto.get_or_put_cobj_child = function (obj, special_contexts, hash) {
			var hash_children,
				cobj;
			if(_.has(this._cobj_children, hash)) {
				hash_children = this._cobj_children[hash];
				var i = 0, len = hash_children.length, child_info;
				for(; i<len; i++) {
					child_info = hash_children[i];
					if (child_info.obj === obj) {
						var sc1 = child_info.special_contexts,
							sc2 = special_contexts;

						if(ist.check_special_context_equality(sc1, sc2)) {
							return child_info.cobj;
						}
					}
				}
			} else {
				hash_children = this._cobj_children[hash] = [];
			}

			cobj = ist.create_contextual_object(obj, this.pointer.push(obj, special_contexts), {
				defer_initialization: true
			});

			hash_children.push({
				obj: obj,
				special_contexts: special_contexts,
				cobj: cobj
			});
			cobj.initialize();
			cobj.on("begin_destroy", function() {
				this.remove_cobj_child(obj, special_contexts, hash);
			}, this);
			return cobj;
		};

		proto.remove_cobj_child = function(obj, special_contexts, hash) {
			var hash_children;
			if(_.has(this._cobj_children, hash)) {
				hash_children = this._cobj_children[hash];
				var i = 0, len = hash_children.length, child_info;
				for(; i<len; i++) {
					child_info = hash_children[i];
					if (child_info.obj === obj) {
						var sc1 = child_info.special_contexts,
							sc2 = special_contexts;

						if(ist.check_special_context_equality(sc1, sc2)) {
							hash_children.splice(i, 1);
							i--;
							len--;
							if(len === 0) {
								delete this._cobj_children[hash];
							}
						}
					}
				}
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

	ist.cobj_hashes = cobj_hashes;
	ist.cobj_roots = cobj_roots;

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
		}

		pointer_root = pointer.root();
		hash_i = pointer_root.id();
		node = cobj_roots[hash_i];

		if(!node) {
			opts = {
				object: pointer_root,
				pointer: pointer.slice(0, 1),
				defer_initialization: true
			};

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

	ist.add_cobj_cached_item = function(cobj) {
		var pointer = cobj.get_pointer(),
			obj = cobj.get_object(),
			hash = pointer.hash() + obj.hash(),
			hashed_vals = cobj_hashes[hash];

		if(hashed_vals) {
			hashed_vals.push(cobj);
		} else {
			hashed_vals = cobj_hashes[hash] = [cobj];
		}
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
