/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualCell = function (options) {
		ist.ContextualCell.superclass.constructor.apply(this, arguments);
		this._runtime_errors = new cjs.Constraint(false);

		var constraint = false,
			pointer = this.get_pointer(),
			is_inherited = this.is_inherited();
		this.value_constraint = cjs(function() {
			if(constraint && constraint.destroy) {
				constraint.destroy(true);
			}
			constraint = this.object.constraint_in_context(pointer, is_inherited);
			return constraint;
		}, {
			context: this,
		});
		var old_destroy = this.value_constraint.destroy;
		this.value_constraint.destroy = function() {
			if(constraint && constraint.destroy) {
				constraint.destroy(true);
				constraint = false;
			}
			old_destroy.apply(this, arguments);
		};

		this._type = "cell";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function(options) {
			if(this.constructor === My) { this.flag_as_initialized();  }
			My.superclass.initialize.apply(this, arguments);
			this._cached_value = false;
			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }

			if(this._cached_basic_object instanceof ist.BasicObject) {
				this._cached_basic_object.destroy(true);
				this._cached_basic_object = false;
			}

			this._cached_value = false;

			this.value_constraint.destroy(true);
			delete this.value_constraint;
			My.superclass.destroy.apply(this, arguments);
		};
		proto.get_runtime_errors = function() {
			this.val();
			return this._runtime_errors.get();
		};
		proto._getter = function (node, is_preemptive) {
			var value;
			if(ist.__debug && !is_preemptive) {
				value = cjs.get(this.value_constraint.get());
				this._runtime_errors.set(false);
			} else {
				try {
					value = cjs.get(this.value_constraint.get());
					this._runtime_errors.set(false);
				} catch (e) {
					this._runtime_errors.set([e]);
					if(ist.__log_errors) {
						console.error(e);
					}
				}
			}

			if(this._cached_value !== value) {
				if(this._cached_basic_object instanceof ist.BasicObject) {
					this._cached_basic_object.destroy(true);
					this._cached_basic_object = false;
				}
			}

			if(value instanceof ist.BasicObject) {
				this._cached_basic_object = value;
				value = ist.find_or_put_contextual_obj(value, this.get_pointer().push(value));
			}
			this._cached_value = value;

			return value;
		};
		proto.get_str = function () {
			var cell = this.get_object();
			return cell.get_str();
		};
		proto.get_syntax_errors = function() {
			var cell = this.get_object();
			return cell.get_syntax_errors();
		};
		proto._get_valid_cobj_children = function() {
			var value = this.val();
			return [];
		};
	}(ist.ContextualCell));
}(interstate));
