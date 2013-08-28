/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

var UNDEF = {};

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.ConstraintEvent = function () {
		red.Event.apply(this, arguments);
		this._initialize();
		this._type = "constraint_event";
	};

	(function (My) {
		_.proto_extend(My, red.Event);
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
				red.event_queue.wait();
				this.fire({
					value: val,
					timestamp: (new Date()).getTime()
				});
				red.event_queue.signal();
			} else {
				this._last_val = val;
			}
		};
		proto.destroy = function () {
			if(cjs.is_$(this.constraint)) {
				this.constraint.offChange(this.check_constraint_val, this);
				this.constraint.destroy(true);
			}
			delete this.constraint;
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			if(cjs.is_$(this.constraint)) {
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
			if(cjs.is_$(this.constraint)) {
				this.constraint.offChange(this.check_constraint_val, this);
			}
		};
	}(red.ConstraintEvent));
}(red));
