/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualCell = function (options) {
		ist.ContextualCell.superclass.constructor.apply(this, arguments);
		this._errors = new cjs.Constraint([]);
		this._type = "cell";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function(options) {
			if(this.constructor === My) { this.flag_as_initialized();  }
			My.superclass.initialize.apply(this, arguments);
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
			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }

			this.value_constraint.destroy(true);
			delete this.value_constraint;
			My.superclass.destroy.apply(this, arguments);
		};
		proto._getter = function () {
			var value;
			if(ist.__debug) {
				value = cjs.get(this.value_constraint.get());
			} else {
				try {
					value = cjs.get(this.value_constraint.get());
				} catch (e) {
					if(ist.__log_errors) {
						console.error(e);
					}
				}
			}
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
	}(ist.ContextualCell));
}(interstate));
