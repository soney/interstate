(function(red) {
var cjs = red.cjs, _ = red._;

(function(my) {
	var proto = my.prototype;
	proto.on_create = function(constraint, in_effect) {
		this.constraint = constraint;
		this._in_effect = !!in_effect;

		this.$check_constraint_val = _.bind(this.check_constraint_val, this);
	};

	proto.check_constraint_val = function() {
		var val = this.constraint.get();
		if(val) {
			if(this._in_effect === false) {
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
	proto.destroy = function(silent) {
		this.constraint.destroy(silent);
	};

	proto.enable = function() {
		my.superclass.enable.apply(this, arguments);
		this.constraint.onChange(this.$check_constraint_val);
		if(!this.constraint.is_valid()) {
			this.$check_constraint_val();
		}
	};
	proto.disable = function() {
		my.superclass.disable.apply(this, arguments);
		this.constraint.offChange(this.$check_constraint_val);
	};
}(red._create_event_type("constraint")));
}(red));
