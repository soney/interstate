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
			var pointer = this.get_pointer();
			var my_index = pointer.indexOf(this.get_object());
			if(my_index === 0) {
				return ist.root_name;
			} else {
				var parent_obj = pointer.points_at(my_index-1);
				var parent_pointer = pointer.slice(0, my_index-1);
				if(parent_obj instanceof ist.Dict) {
					var name = ist.Dict.get_prop_name(parent_obj, this.get_object(), this.get_pointer().pop());
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
			if(this.object) {
				this.object.off("begin_destroy", this.destroy, this);
			}
			if(this.constructor === My) { this.emit_begin_destroy(); }
			this._destroyed = true;

			ist.remove_cobj_cached_item(this);
			if(avoid_destroy_call !== true) {
				ist.destroy_contextual_obj(this);
			}

			this.$value.destroy(true);
			delete this.object;
			delete this.pointer;
			delete this.$value;
			ist.unregister_uid(this.id());
			this._emit("destroyed");
			able.destroy_this_listenable(this);
		};
		proto._get_valid_cobj_children = function() { return []; };

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
}(interstate));
