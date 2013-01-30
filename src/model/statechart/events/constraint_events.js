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
		});

		this.constraint.onChange(function() {
			if(this.constraint.get()) {
			console.log("A");
				red.event_queue.wait();
				this.fire({
					constraint: this.constraint
				});
				red.event_queue.signal();
			}
		}, this);
	};
	proto.destroy = function() {
		this.constraint.destroy();
	};
}(red._create_event_type("constraint_event").prototype));
}(red));
