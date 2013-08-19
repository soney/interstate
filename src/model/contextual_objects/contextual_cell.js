/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.ContextualCell = function (options) {
		red.ContextualCell.superclass.constructor.apply(this, arguments);
		this._type = "cell";
	};

	(function (My) {
		_.proto_extend(My, red.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function(options) {
			My.superclass.initialize.apply(this, arguments);
			this.value_constraint = this.object.constraint_in_context(this.get_pointer());
		};
		proto.destroy = function () {
			if(this.constructor === My) { this.emit_begin_destroy(); }
			My.superclass.destroy.apply(this, arguments);
			this.value_constraint.destroy(true);
			delete this.value_constraint;
		};
		proto._getter = function () {
			var value;
			//try {
				value = cjs.get(this.value_constraint);
			//} catch (e) {
				//console.error(e);
			//}
			return value;
		};
		proto.get_str = function () {
			var cell = this.get_object();
			return cell.get_str();
		};
	}(red.ContextualCell));
}(red));
