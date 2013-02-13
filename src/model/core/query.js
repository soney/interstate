(function(red) {
var cjs = red.cjs, _ = red._;

red.Query = function(options) {
	this.options = _.extend({
		value: [],
		parent_query: null
	}, options);
	if(!_.isArray(this.options.value)) {
		this.options.value = [this.options.value];
	}
	this.options.value = _	.chain(this.options.value)
							.map(function(pointer) {
								var points_at = pointer.points_at();
								if(points_at instanceof red.Dict) {
									var manifestation_pointers = points_at.get_manifestation_pointers(pointer);
									if(_.isArray(manifestation_pointers)) {
										return manifestation_pointers;
									} else {
										return pointer;
									}
								}
								else {
									return pointer;
								}
							})
							.flatten(true)
							.value();
};
(function(my) {
	var proto = my.prototype;

	var raw_filter_funcs = {
		"lt": function(a, b) { return a < b; },
		"gt": function(a, b) { return a > b; },
		"le": function(a, b) { return a <= b; },
		"ge": function(a, b) { return a >= b; },
		"eq": function(a, b) { return a == b; },
		"eqeq": function(a, b) { return a === b; },
	};

	var filter_funcs = {
		"in_state": function(pointer, index, arr, state_name) {
			var SOandC = red.find_stateful_obj_and_context(pointer);
			if(!SOandC) { return false; }
			var stateful_obj = SOandC.stateful_obj;
			var pcontext = SOandC.context;

			var statecharts = stateful_obj.get_statecharts(pcontext);

			for(var i = 0; i<statecharts.length; i++) {
				var statechart = statecharts[i];
				var active_substates = statechart.get_active_states();
				for(var j = 0; j<active_substates.length; j++) {
					var active_substate = active_substates[j];
					if(active_substate.get_name() === state_name) {
						return true;
					}
				}
			}
			return false;
		}
	};

	_.each(raw_filter_funcs, function(func, name) {
		filter_funcs[name] = function(pointer, index, arr, other_val) {
			var pointer_val = pointer.val();
			return func(pointer_val, other_val);
		};
	});

	_.each(filter_funcs, function(func, name) {
		proto[name] = function() {
			var args = _.toArray(arguments);
			return this.filter(function() {
				return func.apply(this, (_.toArray(arguments)).concat(args));
			});
		};
	});

	var map_funcs = {
		"prop": function(pointer, index, arr, name) {
			var owner = pointer.points_at();
			var prop_pointer = owner.get_prop_pointer(name, pointer);
			return prop_pointer;
		},
		"parent": function(pointer) {
			var owner = pointer.points_at();
			return pointer.slice(0, pointer.length()-1);
		}
	};

	_.each(map_funcs, function(func, name) {
		proto[name] = function() {
			var args = _.toArray(arguments);
			return this.map(function() {
				return func.apply(this, (_.toArray(arguments)).concat(args));
			});
		};
	});

	proto.filter = function(filter_func, context) {
		return this.op(function(values) {
			return _.filter(values, filter_func, context);
		});
	};
	proto.map = function(map_func, context) {
		return this.op(function(values) {
			return _.map(values, map_func, context);
		});
	};

	var extract_items = function(args) {
		var items = _	.chain(arguments)
						.map(function(arg) {
							var other_objects;
							if(other_query instanceof red.Query) {
								other_objects = other_query.value();
							} else if(_.isArray(other_query)) {
								other_objects = other_query;
							} else {
								other_objects = [other_query];
							}
							return other_objects;
						})
						.flatten(true)
						.value();
		return items;
	};

	proto.add = function() {
		var my_value_set = new Set({value: this.value(), equals: red.check_pointer_equality, hash: red.pointer_hash});
		var items = extract_items(args);
		
		var new_value_set = my_value_set.add.apply(my_value_set, items);

		var new_query = new red.Query({
									value: new_value_set.toArray(),
									parent_query: this
							});
		return new_query;
	};

	proto.remove = function() {
		var my_value_set = new Set({value: this.value(), equals: red.check_pointer_equality, hash: red.pointer_hash});
		var items = extract_items(args);

		var new_value_set = my_value_set.remove.apply(my_value_set, items);

		var new_query = new red.Query({
									value: new_value_set.toArray(),
									parent_query: this
							});
		return new_query;
	};

	proto.op = function(op_func, context) {
		var value = op_func.call(context || window, this.value());
		var new_query = new red.Query({
									value: value,
									parent_query: this
							});
		return new_query;
	};

	proto.value = function() {
		return this.options.value;
	};
	proto.parent_query = function() {
		return this.options.parent_query;
	};
}(red.Query));

}(red));
