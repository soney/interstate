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
			My.superclass.initialize.apply(this, arguments);
			var constraint = false;
			this.value_constraint = cjs(function() {
				if(constraint && constraint.destroy) {
					constraint.destroy(true);
				}

				return (constraint = this.object.constraint_in_context(this.get_pointer(), this.is_inherited()));
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
			if(this.constructor === My) { this.flag_as_initialized();  }
		};
		proto.destroy = function () {
			if(this.constructor === My) { this.begin_destroy(true); }

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
					console.error(e);
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
