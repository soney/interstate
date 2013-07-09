/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.PointerTree = function (options) {
		this.contextual_object = options.contextual_object;
		/*
		this.objects = new RedMap({
			hash: "hash",
			equals: function (a, b) {
				return a === b;
			},
			keys: options.object_keys,
			values: options.object_values
		});
		*/
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
			keys: options.pointer_keys || [],
			values: options.pointer_values || []
		});
	};

	(function (my) {
		var proto = my.prototype;
		proto.get_or_put_obj = function (object, pointer, options) {
			var set_options = true;
			var rv = this.objects.get_or_put(object, function () {
				set_options = false;
				return red.create_contextual_object(object, pointer, options);
			});
			if (set_options) {
				rv.set_options(options);
			}
			return rv;
		};
		proto.get_or_put_child = function (child, special_contexts) {
			var child_tree = this.children.get_or_put({
				child: child,
				special_contexts: special_contexts
			}, function () {
				var tree = new red.PointerTree();
				/*
					object_keys: [],
					object_values: [],
					pointer_keys: [],
					pointer_values: []
				});
				*/

				return tree;
			});
			return child_tree;
		};
		proto.get_valid_child_pointers = function() {
			var rv;
			if(this.contextual_root.is_template()) {
				var instance_pointers = this.contextual_root.instance_pointers();
				rv = _.map(instance_pointers, function(instance_pointer) {
					return { pointer: instance_pointer, obj: this.contextual_root.get_object() };
				});
				return rv;
			} else {
				var child_infos = this.contextual_root.raw_children();
				rv = [];
				var my_pointer = this.contextual_root.get_pointer();
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
			var children = this.children.values();
			var keys = this.children.keys();
			var objects = this.objects.keys();
			console.log(keys, children, this.objects.keys(), this.objects.values());
		/*
			var valid_child_pointers = this.get_valid_child_pointers();
			console.log(valid_child_pointers);
			var tree_children = this.tree.children.values();
			var buckets = _.map(tree_children, function(tree_child) {
				return tree_child.bucket;
			});
			console.log(buckets);
			
			return [];
			*/
		};
		proto.destroy = function() {
			this.objects.destroy();
			this.children.destroy();
			delete this.objects;
			delete this.children;
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

/*
			var set_options = true;
			var rv = this.objects.get_or_put(object, function () {
				set_options = false;
				return red.create_contextual_object(object, pointer, options);
			});
			if (set_options) {
				rv.set_options(options);
			}

			var rv = node.get_or_put_obj(obj, pointer, options);
			*/
			return rv;
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
	var get_expired_pointer_buckets = function(root) {
		var bucket_roots = red.pointer_buckets.keys();
		var invalid_bucket_roots = _.without(bucket_roots, root);
		var real_root_bucket = red.pointer_buckets.get(root);
		var other_expired_buckets = real_root_bucket.get_expired_children();

		return invalid_bucket_roots.concat(other_expired_buckets);
	};

	red.get_expired_contextual_objects = function(root) {
		var expired_buckets = get_expired_pointer_buckets(root);
		console.log(expired_buckets);
	};
}(red));
