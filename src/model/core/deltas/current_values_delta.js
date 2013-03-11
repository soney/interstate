(function(red) {
var cjs = red.cjs, _ = red._;

red.CurrentValuesDelta = function(options) {
	red.CurrentValuesDelta.superclass.constructor.apply(this, arguments);
	if(options.root_pointer) {
		var current_pointer = options.root_pointer;
		var pointer_queue = [current_pointer];

		var pointers = [];
		var values = [];

		for(var i = 0; i<pointer_queue.length; i++) {
			var pointer = pointer_queue[i];
			var obj = pointer.points_at();
			if(obj instanceof red.Dict) {
				var manifestation_pointers = obj.get_manifestation_pointers(pointer);
				if(manifestation_pointers) {
					pointer_queue.push.apply(pointer_queue, manifestation_pointers);
				} else {
					var prop_pointers = obj.get_prop_pointers(pointer);
					pointer_queue.push.apply(pointer_queue, prop_pointers);
				}
			} else {
				var value = pointer.val();
				if(value === null || value === undefined || _.isNumber(value) || _.isString(value)) {
					pointers.push(pointer);
					values.push(value);
				}
			}
		}
		this.values = new Map({
			keys: pointers,
			values: values,
			hash: "hash",
			equals: red.check_pointer_equality
		});
	} else if(options.values) {
		this.values = options.values;
	}
};


(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	
	proto.get_values = function() {
		return this.values;
	};

	red.register_serializable_type("current_values_delta",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var keys = this.values.keys(),
											values = this.values.values();

										var summarized_keys = _.map(keys, function(k) {
												return k.summarize()
											}),
											summarized_values = _.map(values, function(v) {
												return v;
											});

										return {
											summarized_keys: summarized_keys,
											summarized_values: summarized_values
										};
									},
									function(obj) {
										var keys = _.map(obj.summarized_keys, function(k) {
												return red.Pointer.desummarize(k)
											}),
											values = _.map(obj.summarized_values, function(v) {
												return v;
											});
											var values = new Map({
												keys: keys,
												values: values,
												hash: "hash",
												equals: red.check_pointer_equality
											});

										return new my({
											values: values
										});
									});
}(red.CurrentValuesDelta));

}(red));
