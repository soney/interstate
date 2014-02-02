/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualObject = function (options) {
		able.make_this_listenable(this);
		this._id = uid();
		ist.register_uid(this._id, this);
		if(options.defer_initialization !== true) {
			this.initialize(options);
		}
		this._type = "none";
		this._destroyed = false;
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		proto.initialize = function(options) {
			if(!options) { options = {}; }
			this.$value = new cjs.Constraint(this._getter, {
				context: this,
				check_on_nullify: options.check_on_nullify === true,
				equals: options.equals || undefined
			});
			this.set_options(options);
		};
		proto.is_template = function() { return false; };
		proto.instances = function() { return false; };
		proto.get_name = function() {
			var pointer = this.get_pointer();
			var my_index = pointer.indexOf(this.get_object());
			if(my_index === 0) {
				return "sketch";
			} else {
				var parent_obj = pointer.points_at(my_index-1);
				var parent_pointer = pointer.slice(0, my_index-1);
				if(parent_obj instanceof ist.Dict) {
					var name = ist.Dict.get_prop_name(parent_obj, this.get_object(), this.get_pointer());
					return name;
				}
			}
		};
		proto.get_colloquial_name = function() {
			var pointer = this.get_pointer();
			var my_index = pointer.indexOf(this.get_object());
			if(my_index === 0) {
				return "(sketch)";
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
					var name = ist.Dict.get_prop_name(parent_obj, this.get_object(), this.get_pointer());

					return "("+name+extra_txt+")";
				} else {
					return "(object)";
				}
			}
		};

		proto.id = proto.hash = function () { return this._id; };
		if(ist.__debug) {
			proto.sid = function() { return parseInt(uid.strip_prefix(this.id()), 10); };
		}

		proto.get_pointer = function () { return this.pointer; };
		proto.set_options = function (options) {
			if (options) {
				if (_.has(options, "object")) {
					this.object = options.object;
					this.object.on("begin_destroy", this.destroy, this);
				}
				if (_.has(options, "pointer")) {
					this.pointer = options.pointer;
				}
			}
		};

		proto.summarize = function () {
			var pointer = this.get_pointer();
			var object = this.get_object();
			var summarized_pointer = pointer.summarize();
			var summarized_object = object.id();
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
			var object = ist.find_uid(obj.object_uid);
			return ist.find_or_put_contextual_obj(object, pointer);
		};

		proto.toString = function () {
			return "p_" + this.get_pointer().toString();
		};

		proto.val = function () {
			return this.$value.get();
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
		proto.is_destroyed = function() {
			return this._destroyed;
		};

		proto.is_inherited = function () {
			return this.inherited;
		};
		proto.get_object = function () {
			return this.object;
		};

		proto.activate = function () { };
		proto.deactivate = function () { };

		proto._getter = function () {
			return this.object;
		};
		proto.type = function () {
			return this._type;
		};
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
