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
			hash: function(x) { return x.hash(); },
			equals: function(a, b) {
				return a.eq(b);
			}
		});

		able.make_this_listenable(this);

		this.object = options.object;
		this.pointer = options.pointer;
		this.inherited_from = options.inherited_from || false;

		this.$value = new cjs.Constraint(this._getter, {
			context: this,
			check_on_nullify: options && (options.check_on_nullify === true),
			equals: (options && options.equals) || undefined
		});
		this._do_destroy_no_args = function() { this.destroy(); };
		this.object.on("begin_destroy", this._do_destroy_no_args, this);

		if(options.defer_initialization !== true) {
			this.initialize(options);
		}
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		proto.initialize = function(options) {
			if(this.constructor === My) { this.flag_as_initialized();  }
			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto._add_cobj_child_updater = function() {
			this._live_cobj_child_updater = cjs.liven(function() {
				this.update_cobj_children();
			}, {
				context: this,
				priority: 2,
				pause_while_running: true
			});
		};
		proto._remove_cobj_child_updater = function() {
			if(this._live_cobj_child_updater) {
				this._live_cobj_child_updater.destroy(true);
				delete this._live_cobj_child_updater;
			}
		};
		proto.flag_as_initialized = function() {
			this._initialized = true;
		};
		proto.shout_initialization = function() {
			this._emit("initialized", this);
		};
		proto.is_initialized = function() {
			return this._initialized;
		};
		proto.is_inherited = function() {
			return this.inherited_from;
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
				parent_obj = pointer.pointsAt(my_index-1);
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
				var parent_obj = pointer.pointsAt(my_index-1),
					parent_pointer = pointer.slice(0, my_index-1);
				if(parent_obj instanceof ist.Dict) {
					var copy = pointer.copy(),
						extra_txt = copy ? "[" + copy.index + "]" : "",
						name = ist.Dict.get_prop_name(parent_obj, this.get_object(), this.get_pointer().pop());

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
			var pointer = ist.Pointer.desummarize(obj.pointer);
			return pointer.getContextualObject();
		};

		proto.toString = function () {
			return "p_" + this.get_pointer().toString();
		};

		proto.emit_begin_destroy = function() {
			this._emit("begin_destroy", this);
		};

		proto.begin_destroy = function(silent) {
			this.$value.setOption("check_on_nullify", false); // don't re-evaluate on nullification

			if(this.object) {
				this.object.off("begin_destroy", this._do_destroy_no_args, this);
				delete this._do_destroy_no_args;
			}
			var to_destroy = this._cobj_children.values();
			_.each(to_destroy, function(cobj) {
				cobj.off("begin_destroy", this.remove_cobj_child, this);
				cobj.begin_destroy(true);
			}, this);

			this.emit_begin_destroy();
		};

		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }

			var to_destroy = this._cobj_children.values();
			_.each(to_destroy, function(cobj) {
				cobj.destroy(true); // avoid begin destroy call
			});

			this._cobj_children.clear();

			this._destroyed = true;

			ist.remove_cobj_cached_item(this);

			this.$value.destroy(true);
			delete this.object;
			delete this.pointer;
			delete this.inherited_from;
			delete this.$value;
			ist.unregister_uid(this.id());
			this._emit("destroyed");
			able.destroy_this_listenable(this);
		};

		proto._get_valid_cobj_children = function() { return []; };

		proto.update_cobj_children = function(recursive) {
			cjs.wait();
			var valid_children = this._get_valid_cobj_children(),
				to_destroy = {},
				to_initialize = [],
				remove_from_destroy_list = _.bind(function(obj, ptr, options) {
					var cobj = this._cobj_children.get(ptr);

					if(cobj) {
						to_destroy[cobj.id()] = false;

						if(cobj instanceof ist.ContextualDict && cobj.is_template()) {
							var instances = cobj.instances();

							_.each(instances, function(instance) {
								remove_from_destroy_list(instance.get_object(), instance.get_pointer());
							}, this);
						}
					} else {
						cobj = ist.create_contextual_object(obj, ptr, _.extend({
								defer_initialization: true
							}, options));
						this._cobj_children.put(ptr, cobj);
						cobj.on("begin_destroy", this.remove_cobj_child, this, ptr);
						to_initialize.push(cobj);
					}
				}, this);

			this._cobj_children.forEach(function(cobj, ptr) {
				to_destroy[cobj.id()] = cobj;
			});

			_.each(valid_children, function(valid_child) {
				remove_from_destroy_list(valid_child.obj, valid_child.pointer, valid_child.options);
			}, this);

			_.each(to_initialize, function(cobj) {
				cobj.initialize();
				if(cobj instanceof ist.ContextualDict && cobj.is_template()) {
					var instances = cobj.instances();

					_.each(instances, function(instance) {
						remove_from_destroy_list(instance.get_object(), instance.get_pointer());
					}, this);
				}
			}, this);

			var to_destroy_list = _.compact(_.values(to_destroy));

			_.each(to_destroy_list, function(cobj) {
				cobj.begin_destroy();
			});
			_.each(to_destroy_list, function(cobj) {
				cobj.destroy(true);
			});

			this.updateAttachments();
			
			cjs.signal();
		};

		proto.get_or_put_cobj_child = function (obj, hash, options, avoid_initialization) {
			var ptr = this.pointer.push(obj),
				must_initialize = false,
				cobj = this._cobj_children.getOrPut(ptr, function() {
					var rv = ist.create_contextual_object(obj, ptr, _.extend({
							defer_initialization: true
						}, options));

					must_initialize = true;
					return rv;
				});

			if(must_initialize) {
				if(avoid_initialization !== true) {
					cobj.initialize();
				}

				cobj.on("begin_destroy", this.remove_cobj_child, this, ptr);
			}

			return cobj;
		};

		proto.remove_cobj_child = function(ptr, silent) {
			this._cobj_children.remove(ptr, silent);
		};

		proto.pause  = function(recursive) {};
		proto.resume = function(recursive) {};

		proto.updateAttachments = function(){};

		proto.toString = function() {
			return My + " " + this.id();
		};
		proto.print = function (logging_mechanism) {
			return ist.print(this.pointer, logging_mechanism);
		};
	}(ist.ContextualObject));
	/*

	ist.check_contextual_object_equality =  ist.check_contextual_object_equality_eqeqeq = function (itema, itemb) {
		if (itema instanceof ist.ContextualObject && itemb instanceof ist.ContextualObject) {
			return itema.get_pointer().eq(itemb.get_pointer()) && itema.get_object() === itemb.get_object();
		} else {
			return itema === itemb;
		}
	};
	*/

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
		} else if (object instanceof ist.State) {
			rv = new ist.ContextualState(options);
		} else if (object instanceof ist.Transition) {
			rv = new ist.ContextualTransition(options);
		} else {
			throw new Error("Object is not contextual");
		}

		return rv;
	};

	var cobj_hashes = false,
		cobj_roots = {};

	ist.find_or_put_contextual_obj = function (obj, pointer, options) {
		if(!pointer) {
			pointer = new ist.Pointer({stack: [obj]});
		}

		if(cobj_hashes === false) {
			cobj_hashes = cjs.map({
				equals: function(a, b) {
					return a.eq(b);
				},
				hash: function(ptr){  
					return ptr.hash();
				}
			});
		}

		var must_initialize = false,
			rv = cobj_hashes.getOrPut(pointer, function() {
			var len = pointer.length(),
				pointer_root, hvi, i, ptr_i, hash_i, new_cobj, node, opts;

			pointer_root = pointer.root();
			hash_i = pointer_root.id();
			node = cobj_roots[hash_i];


			if(!node) {
				if(len === 1) {
					must_initialize = true;
					node = cobj_roots[hash_i] = ist.create_contextual_object(obj, pointer, _.extend({
						defer_initialization: true
					}, options));
				} else {
					node = ist.find_or_put_contextual_obj(pointer_root, pointer.slice(0,1));
				}
			}

			i = 1;
			
			while (i < len) {
				ptr_i = pointer.pointsAt(i);
				hash_i = pointer.itemHash(i);
				node = node.get_or_put_cobj_child(ptr_i, hash_i, i === len-1 ? options : false);//, i === len-1 ? true : false);
				i++;
			}

			return node;
		});

		if(must_initialize) {
			rv.initialize();
		}

		return rv;
	};

	ist.remove_cobj_cached_item = function(cobj) {
		var pointer = cobj.get_pointer(),
			obj = cobj.get_object();

		cobj_hashes.remove(pointer); // TODO: fix

		if(pointer.length() === 1) {
			delete cobj_roots[obj.id()];
			cobj_hashes.destroy();
			cobj_hashes = false;
		}
	};
}(interstate));
