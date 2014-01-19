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
		//this.$update_value_constraint = _.bind(this.update_value_constraint, this);
		//if(this.id() == "402") {
			//debugger;
		//}
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function(options) {
			My.superclass.initialize.apply(this, arguments);
			this.value_constraint = cjs(function() {
				return this.object.constraint_in_context(this.get_pointer());
			}, {
				context: this
			});
			//console.log("Created Contextual Cell", this.get_pointer(), this.get_object());

			//if(this.id() == "402") {
				//debugger;
			//}
			//this.value_constraint = this.object.constraint_in_context(this.get_pointer());
			//this.object._tree.onChange(_.bind(this.value_constraint.invalidate, this.value_constraint));
			//this.object._tree.onChange(this.$update_value_constraint);
			//function() {
				//if(cjs.isConstraint(this.value_constraint)) {
					
				//}
			//});
		};
		/*
		proto.update_value_constraint = function() {
			if(cjs.isConstraint(this.value_constraint)) {
				this.value_constraint.destroy(true);
			}
			this.value_constraint = this.object.constraint_in_context(this.get_pointer());
		};
		*/
		proto.destroy = function () {
			//console.log("DESTROY");
			//if(this.id() == "402" || this.id() == 260) {
				//debugger;
			//}
			if(this.constructor === My) { this.emit_begin_destroy(); }
			if(cjs.isConstraint(this.value_constraint)) {
				this.value_constraint.destroy(true);
			}
			delete this.value_constraint;
			//this.object.remove_constraint_in_context(this.get_pointer());
			My.superclass.destroy.apply(this, arguments);
		};
		proto._getter = function () {
			//var x = this.value_constraint.get();
			//console.log(x, cjs.get(x));
			//console.log(this.value_constraint);
			//window.x = this.value_constraint;
			var value;
			if(ist.__debug) {
				value = cjs.get(this.value_constraint.get());
			} else {
				//try {
					value = cjs.get(this.value_constraint.get());
				//} catch (e) {
					//console.error(e);
				//}
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
