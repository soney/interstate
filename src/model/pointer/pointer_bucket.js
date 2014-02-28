/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,RedMap */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.PointerTree = function (options) {
		this.contextual_object = options && options.contextual_object || false;
		this.pointer = options.pointer;

		this.children = cjs.map({
			hash: function (info) {
				var child = info.child,
					special_contexts = info.special_contexts,
					hash = ist.pointer_hash(child);
				
				var i;
				for (i = special_contexts.length - 1; i >= 0; i -= 1) {
					hash += special_contexts[i].hash();
				}
				return hash;
			},
			equals: function (info1, info2) {
				if (info1.child === info2.child) {
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
		if(!options || !options.defer_initialization) {
			this.initialize();
		}
	};

	(function (my) {
		var proto = my.prototype;
		proto.initialize = function() {
			this._live_updater = cjs.liven(function() {
				this.update_current_contextual_objects();
			}, {
				context: this,
				pause_while_running: true
			});
		};
		proto.set_contextual_object = function(cobj) {
			this.contextual_object = cobj;
		};
		proto.get_contextual_object = function(cobj) {
			return this.contextual_object;
		};
		proto.has_contextual_object = function() {
			return this.contextual_object !== false;
		};
		proto.remove_child = function(child, special_contexts) {
			var info = { child: child, special_contexts: special_contexts },
				value = this.children.get(info);
			if(value) {
				this.children.remove(info);
				value.destroy();
			}
		};
		proto.get_child = function(child, special_contexts) {
			var child_tree = this.children.get({
				child: child,
				special_contexts: special_contexts
			});
			return child_tree;
		};
		proto.get_or_put_child = function (child, special_contexts) {
			var child_tree = this.children.getOrPut({
				child: child,
				special_contexts: special_contexts
			}, function () {
				var tree = new ist.PointerTree({
					pointer: this.pointer.push(child, special_contexts),
					defer_initialization: true
				});
				return tree;
			}, this);
			return child_tree;
		};
		proto.printValidChildPointers = function() {
			var child_pointers = this.get_valid_child_pointers();
		};
		proto.printCurrentChildPointers = function() {
			var child_pointers = this.children.values();
			var cobj = this.get_contextual_object(),
				obj = cobj.get_object();
			var name = cobj.get_name();
			var log_msg = (name ? name+", " : "") + cobj.type() + " (" + uid.strip_prefix(cobj.id()) + ":" + uid.strip_prefix(obj.id()) + ")";

			if(this.children.isEmpty()) {
				console.log(log_msg);
			} else {
				console.group(log_msg);
				this.children.forEach(function(child) {
					child.printCurrentChildPointers();
				});
				console.groupEnd();
			}
		};

		proto.get_valid_child_pointers = function() {
			var cobj = this.get_contextual_object(),
				my_pointer = this.pointer, rv;
			if(cobj instanceof ist.ContextualDict) {
				if(cobj.is_instance()) {
					rv = [];
				} else {
					var copies_obj = cobj.copies_obj();
					rv = [{pointer: my_pointer.push(copies_obj), obj: copies_obj}];
				}

				var protos_objs = ist.Dict.get_proto_vals(cobj.get_object(), cobj.get_pointer());
				rv.push.apply(rv, _.chain(protos_objs)
									.map(function(o) {
										var proto_obj = o.direct_protos();
										if(proto_obj instanceof ist.StatefulProp || proto_obj instanceof ist.Dict || proto_obj instanceof ist.Cell) {
											return {obj: proto_obj, pointer: my_pointer.push(proto_obj)};
										}
									})
									.compact()
									.value());

				var child_infos = cobj.raw_children();
				_.each(child_infos, function(child_info) {
					var value = child_info.value;
					if (value instanceof ist.Dict || value instanceof ist.Cell || value instanceof ist.StatefulProp) {
						var ptr = my_pointer.push(value);
						rv.push({obj: value, pointer: ptr});

						if(value instanceof ist.Dict) {
							var cobj = ist.find_or_put_contextual_obj(value, ptr);
							if(cobj.is_template()) {
								var instances = cobj.instances();
								rv.push.apply(rv, _.map(instances, function(i) {
									return {obj: i.get_object(), pointer: i.get_pointer()};
								}));
							}
						}
					}
				});

				return rv;
			} else if(cobj instanceof ist.ContextualStatefulProp) {
				rv = _.map(cobj.get_values(), function(val) {
					var value = val.value;
					return {obj: value, pointer: my_pointer.push(value)};
				});
				return rv;
			} else {
				return [];
			}
		};
		proto.update_current_contextual_objects = function(recursive) {
			var cobj = this.get_contextual_object();
			var children = _.clone(this.children.values());
			var keys = _.clone(this.children.keys());
			var my_ptr = this.contextual_object.get_pointer();

			var valid_children = this.get_valid_child_pointers();
			var valid_children_map = {};
			_.each(valid_children, function(vc) {
				var hash = vc.pointer.hash();
				if(_.has(valid_children_map, hash)) {
					valid_children_map[hash].push(vc);
				} else {
					valid_children_map[hash] = [vc];
				}
			});

			var to_destroy = [];
			_.each(children, function(child, index) {
				var key = keys[index];
				var cchild = child.get_contextual_object();
				var obj = key.child;
				var special_context = key.special_context;
				var ptr = my_ptr.push(obj, special_context);
				var hash = ptr.hash();

				var found = false;
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
					to_destroy.push({key: key, value: child});
				}
			}, this);

			_.each(valid_children, function(valid_child) {
				var obj = valid_child.obj,
					ptr = valid_child.pointer;
				var node = this.get_or_put_child(obj, ptr.special_contexts());
				if(!node.has_contextual_object()) {
					var cobj = ist.create_contextual_object(obj, ptr, {defer_initialization: true});
					node.set_contextual_object(cobj);
					cobj.initialize({
						object: obj,
						pointer: ptr
					});
					node.initialize();
				}
				if(recursive) {
					node.update_current_contextual_objects(recursive);
				}
			}, this);

			_.each(to_destroy, function(to_destroy_info) {
				var child_tree = to_destroy_info.value;
				var key = to_destroy_info.key;
				var child = child_tree.get_contextual_object();
				child.destroy(true, true);
				this.remove_child(key.child, key.special_contexts);
			}, this);

			if(cobj instanceof ist.ContextualDict) { cobj.update_attachments(); }
		};
			
		proto.create_current_contextual_objects = function () {
			var child_pointers = this.get_valid_child_pointers();
			_.each(child_pointers, function(child_pointer) {
				var child_tree = this.getOrPut(child_pointer.obj, child_pointer.pointer.special_contexts());
				child_tree.create_current_contextual_objects();
			}, this);
		};
		proto.get_expired_children = function() {
			var children = _.clone(this.children.values());
			var keys = _.clone(this.children.keys());

			var valid_children = this.get_valid_child_pointers();
			var rv = [];
			_.each(children, function(child, index) {
				var cchild = child.get_contextual_object();
				var obj = cchild.get_object();
				var ptr = cchild.get_pointer();

				var found = _.find(valid_children, function(c) {
						return c.obj === obj && c.pointer.eq(ptr);
					});

				if(found) {
					rv.push.apply(rv, child.get_expired_children());
				} else {
					rv.push(child);
				}
			});
			return rv;
		};
		proto.destroy = function() {
			if(this._live_updater) { this._live_updater.destroy(); }

			this.children.forEach(function(child) {
				child.destroy();
			});
			this.children.destroy();
			delete this.children;

			if(this.has_contextual_object()) {
				if(!this.contextual_object.is_destroyed()) {
					this.contextual_object.destroy(true, true); // silent & avoid re-calling ist.destroy_cobj
				}
				delete this.contextual_object;
			}
		};
	}(ist.PointerTree));

	ist.PointerBucket = function (options) {
		var root = options.root,
			root_pointer = new ist.Pointer({stack: [root]});

		this.contextual_root = new ist.ContextualDict({
			object: root,
			pointer: root_pointer
		});

		this.tree = new ist.PointerTree({
			contextual_object: this.contextual_root,
			pointer: root_pointer,
			defer_initialization: true
		});
	};

	(function (my) {
		var proto = my.prototype;

		proto.initialize = function() {
			this.tree.initialize();
		};

		proto.get_contextual_root = function () {
			return this.contextual_root;
		};
		proto.create_current_contextual_objects = function () {
			this.tree.create_current_contextual_objects();
		};

		proto.printValidChildPointers = function() {
			this.tree.printValidChildPointers();
		};
		proto.printCurrentChildPointers = function() {
			this.tree.printCurrentChildPointers();
		};

		proto.find_or_put = function (obj, pointer, options) {
			var node = this.tree;
			var i = 1, len = pointer.length(), ptr_i, sc_i;


			while (i < len) {
				ptr_i = pointer.points_at(i);
				sc_i = pointer.special_contexts(i);
				node = node.get_or_put_child(ptr_i, sc_i);
				i += 1;
			}

			var rv;
			if(node.has_contextual_object()) {
				rv = node.get_contextual_object();
			} else {
				rv = ist.create_contextual_object(obj, pointer, {defer_initialization: true});
				node.set_contextual_object(rv);
				rv.initialize(_.extend({
					object: obj,
					pointer: pointer
				}, options));
				node.initialize();
			}

			return rv;
		};
		proto.destroy_cobj = function(cobj) {
			var pointer = cobj.get_pointer(),
				node = this.tree,
				i = 1, len = pointer.length(), ptr_i, sc_i,
				parent_node;

			while (i < len) {
				ptr_i = pointer.points_at(i);
				sc_i = pointer.special_contexts(i);
				parent_node = node;
				node = node.get_child(ptr_i, sc_i);
				i += 1;
			}
			if(node.get_contextual_object() === cobj) {
				if(parent_node) {
					parent_node.remove_child(ptr_i, sc_i);
				} else { // It's the root
					ist.pointer_buckets.remove(pointer.root());
				}
			} else {
				throw new Error("Couldn't find correct node to remove;");
			}
		};
		proto.update_current_contextual_objects = function(recursive) {
			return this.tree.update_current_contextual_objects(recursive);
		};
		proto.get_expired_children = function() {
			return this.tree.get_expired_children();
		};
		proto.destroy = function() {
			this.tree.destroy();
			delete this.tree;
			delete this.contextual_root;
		};
	}(ist.PointerBucket));

	ist.pointer_buckets = cjs.map({
		hash: function(x) { return x.hash(); }
	});

	var in_call = false;
	ist.destroy_contextual_obj = function(cobj) {
		var root_call = in_call === false;
		in_call = true;

		if(root_call) {
			cjs.wait();
			var to_destroy = get_to_destroy(cobj, false);
			_.each(to_destroy, function(cobj) {
				cobj.destroy(true, true);
			});
			//depth_first_destroy(cobj, false);
		}

		var pointer = cobj.get_pointer();
		var pointer_root = pointer.root();

		var pointer_bucket = ist.pointer_buckets.get(pointer_root);
		if(pointer_bucket) {
			pointer_bucket.destroy_cobj(cobj);
		}
		if(pointer.length() === 1) {
			pointer_bucket.destroy();
		}

		var hashed_vals;
		if((hashed_vals = cobj_hashes[pointer.hash()])) {
			var hvi;
			for(var i = 0, len = hashed_vals.length; i<len; i++) {
				if(hashed_vals[i] === cobj) {
					hashed_vals.splice(i, 1);
					break;
				}
			}
		}

		if(root_call) {
			cjs.signal();
		}

		in_call = false;
	};

	var get_to_destroy = function(root, destroy_root) {
		var to_destroy = [];
		if(root) {
			if(root instanceof ist.ContextualDict) {
				if(root.is_template()) {
					var instances = root.instances();
					_.each(instances, function(instance) {
						//depth_first_destroy(instance);
						to_destroy.push.apply(to_destroy, get_to_destroy(instance));
					});
				}
				var children = root.children();
				_.each(children, function(child_info) {
					to_destroy.push.apply(to_destroy, get_to_destroy(child_info.value));
					//depth_first_destroy(child_info.value);
				});
			}
			if(_.isFunction(root.destroy) && destroy_root !== false) {
				//root.destroy(true, true);
				to_destroy.push(root);
			}
		}
		return to_destroy;
	};

	var cobj_hashes = {};
	ist.find_or_put_contextual_obj = function (obj, pointer, options) {
		var pointer_root;

		if (pointer) {
			pointer_root = pointer.root();
		} else {
			pointer = new ist.Pointer({stack: [obj]});
			pointer_root = obj;
		}

		var hashed_vals;
		if((hashed_vals = cobj_hashes[pointer.hash()])) {
			var hvi;
			for(var i = 0, len = hashed_vals.length; i<len; i++) {
				hvi = hashed_vals[i];
				if(hvi.get_object() === obj && pointer.eq(hvi.get_pointer())) {
					return hvi;
				}
			}
		} else {
			hashed_vals = cobj_hashes[pointer.hash()] = [];
		}

		var must_initialize = false,
			pointer_bucket = ist.pointer_buckets.getOrPut(pointer_root, function () {
				must_initialize = true;
				return new ist.PointerBucket({
					root: pointer_root
				});
			});
		if(must_initialize) {
			pointer_bucket.initialize();
		}

		var rv = pointer_bucket.find_or_put(obj, pointer, options);
		hashed_vals.push(rv);
		return rv;
	};
	var get_expired_pointer_trees = function(root) {
		var bucket_roots = ist.pointer_buckets.keys();
		var invalid_bucket_roots = _.without(bucket_roots, root);
		var real_root_bucket = ist.pointer_buckets.get(root);
		var other_expired_buckets = real_root_bucket.get_expired_children();

		return invalid_bucket_roots.concat(other_expired_buckets);
	};

	ist.printCurrentChildPointers = function() {
		var pointer_bucket = ist.pointer_buckets.values()[0];
		if(pointer_bucket) {
			pointer_bucket.printCurrentChildPointers();
		} else {
			console.log("...no pointer bucket");
		}
	};

	ist.update_current_contextual_objects = function(root, recursive) {
		cjs.wait();
		var root_bucket = ist.pointer_buckets.get(root);
		if(root_bucket) {
			root_bucket.update_current_contextual_objects(recursive);
		}
		cjs.signal();
	};

	ist.get_expired_contextual_objects = function(root) {
		var expired_trees = get_expired_pointer_trees(root);
		return _.map(expired_trees, function(t) { return t.get_contextual_object(); });
	};

	ist.create_current_contextual_objects = function(root) {
		var root_bucket = ist.pointer_buckets.get(root);
		root_bucket.create_current_contextual_objects();
	};
}(interstate));
