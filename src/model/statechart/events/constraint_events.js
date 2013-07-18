/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

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
		proto.on_create = function (constraint, in_effect) {
			this.constraint = constraint;
			this._in_effect = !!in_effect;
		};

		proto.check_constraint_val = function () {
			var val = this.constraint.get();
			if (val) {
				if (this._in_effect === false) {
					this._in_effect = true;
					red.event_queue.wait();
					this.fire({
						value: val,
						timestamp: (new Date()).getTime()
					});
					red.event_queue.signal();
				}
			} else {
				this._in_effect = false;
			}
		};
		proto.destroy = function () {
			this.constraint.offChange(this.check_constraint_val, this);
			this.constraint.destroy(true);
			delete this.constraint;
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			this.constraint.onChange(this.check_constraint_val, this);
			if (!this.constraint.is_valid()) {
				this.check_constraint_val();
			}
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
			this.constraint.offChange(this.check_constraint_val, this);
		};
	}(red.ConstraintEvent));
}(red));
