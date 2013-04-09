/*jslint nomen: true  vars: true */
/*global red,esprima,able,uid,console,Map */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;

    red.PointerTree = function (options) {
        this.objects = new Map({
            hash: function (obj) {
                return red.pointer_hash(obj);
            },
            equals: function (a, b) {
                return a === b;
            },
            keys: options.object_keys,
            values: options.object_values
        });
        this.children = new Map({
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
            keys: options.pointer_keys,
            values: options.pointer_values
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
                var tree = new red.PointerTree({
                    object_keys: [],
                    object_values: [],
                    pointer_keys: [],
                    pointer_values: []
                });

                return tree;
            });
            return child_tree;
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
            object_keys: [root],
            object_values: [this.contextual_root],
            pointer_keys: [],
            pointer_values: [],
            pointer: root_pointer
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
            var rv = node.get_or_put_obj(obj, pointer, options);
            return rv;
        };
    }(red.PointerBucket));
    
    red.pointer_buckets = new Map({
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

}(red));
