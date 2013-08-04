/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.PointerTree = function (options) {
		this.contextual_object = options && options.contextual_object || false;
		this.children = new RedMap({
			hash: function (info) {
				var child = info.child,
					special_contexts = info.special_contexts,
					hash = red.pointer_hash(child);
				
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

					return red.check_special_context_equality(sc1, sc2);
				} else {
					return false;
				}
			},
			keys: options && options.pointer_keys || [],
			values: options && options.pointer_values || []
		});
	};

	(function (my) {
		var proto = my.prototype;
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
			var value = this.children.remove({
				child: child,
				special_contexts: special_contexts
			});
			value.destroy();
		};
		proto.get_child = function(child, special_contexts) {
			var child_tree = this.children.get({
				child: child,
				special_contexts: special_contexts
			});
			return child_tree;
		};
		proto.get_or_put_child = function (child, special_contexts) {
			var child_tree = this.children.get_or_put({
				child: child,
				special_contexts: special_contexts
			}, function () {
				var tree = new red.PointerTree();
				return tree;
			});
			return child_tree;
		};
		proto.get_valid_child_pointers = function() {
			var cobj = this.get_contextual_object();
			var rv;
			if(cobj.is_template()) {
				var instance_pointers = cobj.instance_pointers();
				var obj = cobj.get_object();
				rv = _.map(instance_pointers, function(instance_pointer) {
					return { pointer: instance_pointer, obj: obj };
				});
				return rv;
			} else {
				rv = [];
				var child_infos = cobj.raw_children();
				var my_pointer = cobj.get_pointer();
				_.each(child_infos, function(child_info) {
					var value = child_info.value;
					if (value instanceof red.Dict || value instanceof red.Cell || value instanceof red.StatefulProp) {
						rv.push({obj: value, pointer: my_pointer.push(value)});
					}
				});
				return rv;
			}
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
			this.children.each(function(child) {
				child.destroy();
			});
			this.children.destroy();
			delete this.children;
			delete this.contextual_object;
		};
	}(red.PointerTree));

	red.PointerBucket = function (options) {
		var root = options.root;
		var root_pointer = new red.Pointer({stack: [root]});
		this.contextual_root = new red.ContextualDict({
			object: root,
			pointer: root_pointer
		});

		this.tree = new red.PointerTree({
			contextual_object: this.contextual_root
		});
	};

	(function (my) {
		var proto = my.prototype;

		proto.get_contextual_root = function () {
			return this.contextual_root;
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
				rv = red.create_contextual_object(obj, pointer, options);
				node.set_contextual_object(rv);
			}

			return rv;
		};
		proto.destroy_cobj = function(cobj) {
			var pointer = cobj.get_pointer();
			var node = this.tree;
			var parent_node;
			var i = 1, len = pointer.length(), ptr_i, sc_i;

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
					red.pointer_buckets.remove(pointer.root());
				}
			} else {
				throw new Error("Couldn't find correct node to remove;");
			}
		};
		proto.get_expired_children = function() {
			return this.tree.get_expired_children();
		};
		proto.destroy = function() {
			this.tree.destroy();
			delete this.tree;
			delete this.contextual_root;
		};
	}(red.PointerBucket));

	red.pointer_buckets = new RedMap({
		hash: "hash"
	});

	var in_call = false;
	red.destroy_contextual_obj = function(cobj) {
		var root_call = in_call === false;
		in_call = true;

		if(root_call) {
			cjs.wait();
			depth_first_destroy(cobj, false);
		}

		var pointer = cobj.get_pointer();
		var pointer_root = pointer.root();

		var pointer_bucket = red.pointer_buckets.get(pointer_root);
		if(pointer_bucket) {
			pointer_bucket.destroy_cobj(cobj);
		}

		if(root_call) {
			cjs.signal();
		}

		in_call = false;
	};

	var depth_first_destroy = function(root, destroy_root) {
		if(root) {
			if(_.isFunction(root.children)) {
				var children = root.children();
				_.each(children, function(child_info) {
					depth_first_destroy(child_info.value);
				});
			}
			if(_.isFunction(root.destroy) && destroy_root !== false) {
				root.destroy(true);
			}
		}
		return;
	};

	red.find_or_put_contextual_obj = function (obj, pointer, options) {
		var pointer_root;

		if (pointer) {
			pointer_root = pointer.root();
		} else {
			pointer = new red.Pointer({stack: [obj]});
			pointer_root = obj;
		}

		var pointer_bucket = red.pointer_buckets.get_or_put(pointer_root, function () {
			return new red.PointerBucket({
				root: pointer_root
			});
		});

		var rv = pointer_bucket.find_or_put(obj, pointer, options);
		return rv;
	};
	var get_expired_pointer_trees = function(root) {
		var bucket_roots = red.pointer_buckets.keys();
		var invalid_bucket_roots = _.without(bucket_roots, root);
		var real_root_bucket = red.pointer_buckets.get(root);
		var other_expired_buckets = real_root_bucket.get_expired_children();

		return invalid_bucket_roots.concat(other_expired_buckets);
	};


	red.get_expired_contextual_objects = function(root) {
		var expired_trees = get_expired_pointer_trees(root);
		return _.map(expired_trees, function(t) { return t.get_contextual_object(); });
	};
}(red));
