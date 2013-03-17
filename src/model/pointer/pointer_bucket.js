(function(red) {
var cjs = red.cjs, _ = red._;

red.PointerTree = function(node) {
	this.nodes = new Map({
		hash: function(obj) {
			return obj.hash();
		},
		equals: function(a, b) {
			return a === b;
		}
	});
	this.children = new Map({
		hash: function(info) {
			var child = info.child,
				special_contexts = info.special_contexts;

			var hash = child.hash();
			for(var i = special_contexts.length-1; i>=0; i--) {
				hash += special_contexts[i].hash();
			}
			return hash;
		},
		equals: function(info1, info2) {
			if(info1.child === info2.child) {
				var sc1 = info1.special_contexts,
					sc2 = info2.special_contexts;

				return red.check_special_context_equality(sc1, sc2)
			} else {
				return false;
			}
		}
	});
};

(function(my) {
	var proto = my.prototype;
	proto.get_node = function() {
		return this.node;
	};

	proto.find_or_put = function(pointer) {
		var unrooted_pointer = pointer.slice(1);
		if(unrooted_pointer.is_empty()) {
			return this.get_node();
		} else {
			var child = unrooted_pointer.root(),
				special_contexts = unrooted_pointer.get_special_contexts(0);
			var child_tree = this.children.get({
				child: child,
				special_contexts: special_contexts
			});

			if(child_tree) {
				return child_tree.find_or_put(unrooted_pointer);
			} else {
				var my_pointer = this.node.get_pointer();
				var sliced_pointer = pointer.slice(0, my_pointer.length()+1);

				var child = sliced_pointer.points_at();
				var special_contexts = slided_pointer.get_special_contexts();

				var sliced_pointer_obj = red.get_pointer_object(child, sliced_pointer);

				this.children.put({
					child: child,
					special_contexts: special_contexts
				}, sliced_pointer_obj);

				return sliced_pointer_obj.find_or_put(unrooted_pointer);
			}
		}
	};
}(red.PointerTree));
/*

red.PointerBucket = function(options) {
	this.root = options.root;
	red.pointer_buckets.put(this.root, this);

	this.root_pointer_obj = red.get_pointer_object(this.root);
	this.tree = new red.PointerTree(this.root_pointer_obj);
};

(function(my) {
	var proto = my.prototype;

	proto.get_root_pointer_obj = function() {
		return this.root_pointer_obj;
	};

	proto.find_or_put = function(pointer) {
		var rv = this.tree.find_or_put(pointer);
		return rv;
	};
}(red.PointerBucket));

red.pointer_buckets = new Map({
	hash: "hash"
});

red.find_pointer_obj = function(pointer) {
	var pointer_root = pointer.root();
	var pointer_bucket = red.pointer_buckets.get(pointer_root);
	if(!pointer_bucket) {
		pointer_bucket = new red.PointerBucket({
			root: pointer_root
		});
	}
	return pointer_bucket.find_or_put(pointer);
};

*/

}(red));
