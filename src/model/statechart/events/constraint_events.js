(function(red) {
var cjs = red.cjs, _ = red._;

var op_fns = {
	"==": function(a, b) { return a == b; },
	"===": function(a, b) { return a === b; },
	">=": function(a, b) { return a >= b; },
	"<=": function(a, b) { return a <= b; },
	">": function(a, b) { return a > b; },
	"<": function(a, b) { return a < b; }
};

(function(proto) {
	proto.on_create = function(op, left, right) {
		var op_fn = op_fns[op];

		this.constraint = cjs.$(function() {
			var left_val, right_val;
			if(red.is_contextualizable(left)) {
				left_val = red.get_contextualizable(left, left.get_default_context());
			} else {
				left_val = cjs.get(left);
			}

			if(red.is_contextualizable(right)) {
				right_val = red.get_contextualizable(right, right.get_default_context());
			} else {
				right_val = cjs.get(right);
			}

			var op_val = op_fn(left_val, right_val);
			return op_val;
		}, false, {
			auto_add_outgoing_dependencies: false
			//start_valid: true
		});

		this._in_effect = false;

		this.$check_constraint_val = _.bind(this.check_constraint_val, this);

		this.constraint.onChange(this.$check_constraint_val);
		this.$check_constraint_val();
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
}(red._create_event_type("constraint_event").prototype));
}(red));
