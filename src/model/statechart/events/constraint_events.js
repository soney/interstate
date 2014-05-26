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

		proto.set_transition = function (transition) {
			this._transition = transition;
			if (transition) {
				var from = transition.from();

				from.on("active", this.enter_listener, this);
				from.on("inactive", this.leave_listener, this);

				_.defer(function (self) {
					if (from.is_active()) {
						self.enter_listener();
					}
				}, this);
			}
		};

		proto.check_constraint_val = function () {
			var val = cjs.get(this.constraint, false),
				last_val = this._last_val;

			this._last_val = val;

			if (val && (last_val !== val)) {
				//ist.event_queue.wait();
				this.fire({
					value: val,
					timestamp: (new Date()).getTime()
				});
				//ist.event_queue.signal();
			}
		};
		proto.destroy = function () {
			if(cjs.isConstraint(this.constraint)) {
				this.constraint.offChange(this.check_constraint_val, this);
				this.constraint.destroy(true);
			}
			delete this.constraint;
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			if(cjs.isConstraint(this.constraint)) {
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
			if(cjs.isConstraint(this.constraint)) {
				this.constraint.offChange(this.check_constraint_val, this);
			}
		};
		proto.enter_listener = function() {
			this._last_val = UNDEF;
		};
		proto.leave_listener = function() {
		};
	}(ist.ConstraintEvent));
}(interstate));
