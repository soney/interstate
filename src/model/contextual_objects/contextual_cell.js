/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualCell = function (options) {
		ist.ContextualCell.superclass.constructor.apply(this, arguments);
		this._runtime_errors = new cjs.Constraint(false);

		//var constraint = false,
		var pointer = this.get_pointer(),
			is_inherited = this.is_inherited(),
			transitionIndex = pointer.indexWhere(function(x) { return x instanceof ist.Transition; });

		if(transitionIndex >= 0) {
			this._isEvent = true;
		} else {
			this._isEvent = false;
		}

		//var constraint;
		this.value = false;
		this.value_constraint = cjs(function() {
			return this.object.constraint_in_context(pointer, is_inherited);
			//if(constraint && constraint.destroy) { constraint.destroy(true); }
			//constraint = this.object.constraint_in_context(pointer, is_inherited);
			//return constraint;
			//return this.object.constraint_in_context(pointer, is_inherited);
		}, {
			context: this,
		});
		//var old_destroy = this.value_constraint.destroy;
		//this.value_constraint.destroy = function() {
			//if(constraint && constraint.destroy) {
				//constraint.destroy(true);
				//constraint = false;
			//}
			//old_destroy.apply(this, arguments);
		//};

		//if(this.sid() === 578) debugger;

		this._type = "cell";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualObject);
		var proto = My.prototype;
		proto.initialize = function(options) {
			if(this.constructor === My) { this.flag_as_initialized();  }
			My.superclass.initialize.apply(this, arguments);
			if(this.constructor === My) { this.shout_initialization();  }
		};
		proto.begin_destroy = function() {
			My.superclass.begin_destroy.apply(this, arguments);
		};
		proto.destroy = function (avoid_begin_destroy) {
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }

			//if(this.value && this.value.destroy) {
				// if value is a contextual objec,t it will automatically be destroyed when the tree is removed
				//if(!(this.value instanceof ist.ContextualObject)) {
					//this.value.destroy();
				//}
				//delete this.value;
			//}
			this.value_constraint.destroy();
			delete this.value_constraint;
			My.superclass.destroy.apply(this, arguments);
		};
		proto.get_runtime_errors = function() {
			this.val();
			return this._runtime_errors.get();
		};
		proto._getter = function (node, is_preemptive) {
			//if(this.sid() === 578) debugger;
			var old_value = this.value;
			//var value;
			if(this._isEvent || (ist.__debug && !is_preemptive)) {
				this.value = cjs.get(this.value_constraint.get());
				this._runtime_errors.set(false);
			} else {
				try {
					this.value = cjs.get(this.value_constraint.get());
					this._runtime_errors.set(false);
				} catch (e) {
					this._runtime_errors.set([e]);
					if(ist.__log_errors) {
						console.error(e);
					}
				}
			}

			if(old_value !== this.value && old_value && old_value.destroy) {
				if(old_value instanceof ist.ContextualObject) {
					//old_value.destroy();
					//if(old_value.createdInline) {
						//var obj = old_value.get_object();
						//obj.destroy();
					//}
				} else {
					old_value.destroy();
				}
			}

			return this.value;
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
