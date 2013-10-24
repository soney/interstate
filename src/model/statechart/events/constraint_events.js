/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

var UNDEF = {};

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ConstraintEvent = function () {
		ist.Event.apply(this, arguments);
		this._initialize();
		this._type = "constraint_event";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (constraint, last_val) {
			this.constraint = constraint;
			//this._last_val = last_val;
			this._last_val = UNDEF;
		};

		proto.check_constraint_val = function () {
			var val = cjs.get(this.constraint, false);
			if (val && (this._last_val !== val)) {
				this._last_val = val;
				ist.event_queue.wait();
				this.fire({
					value: val,
					timestamp: (new Date()).getTime()
				});
				ist.event_queue.signal();
			} else {
				this._last_val = val;
			}
		};
		proto.destroy = function () {
			if(cjs.is_constraint(this.constraint)) {
				this.constraint.offChange(this.check_constraint_val, this);
				this.constraint.destroy(true);
			}
			delete this.constraint;
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			if(cjs.is_constraint(this.constraint)) {
				this.constraint.onChange(this.check_constraint_val, this);
				//if (!this.constraint.is_valid()) {
					//this.check_constraint_val();
				//}
			}
			//} else {
				//this.check_constraint_val();
			//}
			this.check_constraint_val();
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
			if(cjs.is_constraint(this.constraint)) {
				this.constraint.offChange(this.check_constraint_val, this);
			}
		};
	}(ist.ConstraintEvent));
}(interstate));
