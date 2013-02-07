(function(red) {
var cjs = red.cjs, _ = red._;

red.Pointer = function(options) {
	this._stack = (options && options.stack) || [];
};
(function(my) {
	var proto = my.prototype;
	proto.points_at = function(index) {
		if(!_.isNumber(index)) { index = this._stack.length-1; }
		return this._stack[index];
	};
	proto.length = function() { return this._stack.length; };
	proto.slice = function() { return new red.Pointer({ stack: this._stack.slice.apply(this._stack, arguments) }); };
	proto.splice = function() {
		var stack_copy = _.clone(this._stack);
		stack_copy.splice.apply(stack_copy, arguments);
		return new red.Pointer({ stack: stack_copy });
	};
	proto.push = function() { return new red.Pointer({stack: this._stack.concat.apply(this._stack, arguments)}); };
	proto.pop = function() { return new red.Pointer({stack: this._stack.slice(0, this._stack.length-1)}); };
	proto.has = function(item) { return this._stack.indexOf(item) >= 0; };
	proto.is_empty = function() { return this._stack.length === 0; };
	proto.val = function() {
		var points_at = this.points_at();
		if(points_at instanceof red.Dict) {
			return this;
		} else if(points_at instanceof red.Cell) {
			var cell_constraint = points_at.constraint_in_context(this);
			return cjs.get(cell_constraint);
		} else if(points_at instanceof red.StatefulProp) {
			var value_and_state = points_at.get_value_and_from_state(this);
			var value = value_and_state.value;
			if(value instanceof red.Cell) {
				var state = value_and_state.state;
				var event = state._last_run_event.get();

				var pcontext = this.push(new red.EventContext(event));

				var cell_constraint = value.constraint_in_context(pcontext);
				return cjs.get(cell_constraint);
			} else {
				return value;
			}
		} else if(points_at instanceof cjs.ArrayConstraint) {
			return points_at.toArray();
		} else if(points_at instanceof cjs.Constraint) {
			return points_at.get();
		} else {
			return points_at;
		}
	};
	proto.call = function(func_name) {
		var args = _.rest(arguments).concat(this);
		var points_at = this.points_at();
		return points_at[func_name].apply(points_at, args);
	};
	proto.eq = function(other) {
		var my_stack = this._stack;
		var other_stack = other._stack;

		if(my_stack.length !== other_stack.length) {
			return false;
		}
		for(var i = my_stack.length; i>=0; i--) {
			if(my_stack[i] !== other_stack[i]) {
				return false;
			}
		}
		return true;
	};

	var num_to_hash = 3;
	proto.hash = function() {
		var hash = 0;

		var len = this._stack.length-1;
		var mini = Math.max(0, len-num_to_hash);

		for(var i = len; i>mini; i--) {
			hash += this._stack[i].hash();
		}

		return hash;
	};

	proto.serialize = function() { return { stack: _.map(this._stack, red.serialize) }; };
	my.deserialize = function(obj) { return new RedContext({stack: _.map(obj.stack, red.deserialize)}); };
}(red.Pointer));

red.define("pointer", function(options) {
	var context = new red.Pointer(options);
	return context;
});

red.is_pointer = function(obj) {
	return obj instanceof red.Cell || obj instanceof red.StatefulProp;
};


red.check_pointer_equality =  red.check_pointer_equality_eqeqeq = function(itema, itemb) {
	if(itema instanceof red.Pointer && itemb instanceof red.Pointer) {
		return itema.eq(itemb);
	} else {
		return itema === itemb;
	}
};
red.check_pointer_equality_eqeq = function(itema, itemb) {
	if(itema instanceof red.Pointer && itemb instanceof red.Pointer) {
		return itema.eq(itemb);
	} else {
		return itema == itemb;
	}
};

}(red));
