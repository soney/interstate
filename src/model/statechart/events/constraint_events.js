(function(red) {
var cjs = red.cjs, _ = red._;

(function(proto) {
	proto.on_create = function(constraint, in_effect) {
		this.constraint = constraint;
		this._in_effect = !!in_effect;

		this.$check_constraint_val = _.bind(this.check_constraint_val, this);
		this.constraint.onChange(this.$check_constraint_val);
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
	proto.destroy = function() {
		this.constraint.destroy();
	};
}(red._create_event_type("constraint").prototype));
}(red));
