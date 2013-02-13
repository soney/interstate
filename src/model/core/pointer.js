(function(red) {
var cjs = red.cjs, _ = red._;


red.Pointer = function(options) {
	this._stack = (options && options.stack) || [];
	this._special_contexts = (options && options.special_contexts) || new Array(this._stack.length);

	if(this._stack.length !== this._special_contexts.length) {
		throw new Error("Different lengths for stack and special contexts");
	}
};
(function(my) {
	var proto = my.prototype;
	proto.points_at = function(index) {
		if(!_.isNumber(index)) { index = this._stack.length-1; }
		else if(index < 0) { index += this._stack.length; }
		return this._stack[index];
	};
	proto.length = function() { return this._stack.length; };
	proto.special_contexts = function(index) {
		if(!_.isNumber(index)) { index = this._special_contexts.length-1; }
		else if(index < 0) { index += this._special_contexts.length; }
		return this._special_contexts[index] || [];
	};
	proto.slice = function() {
		return new red.Pointer({
						stack: this._stack.slice.apply(this._stack, arguments),
						special_contexts: this._special_contexts.slice.apply(this._special_contexts, arguments)
					});
	};
	proto.splice = function() {
		var stack_copy = _.clone(this._stack);
		var special_contexts_copy = _.clone(this._special_contexts);
		stack_copy.splice.apply(stack_copy, arguments);
		special_contexts_copy.splice.apply(special_contexts_copy, arguments);
		return new red.Pointer({ stack: stack_copy, special_contexts: special_contexts_copy });
	};
	proto.push = function(onto_stack, onto_special_contexts) {
		var new_special_contexts;
		if(onto_special_contexts) {
			new_special_contexts = this._special_contexts.concat([[onto_special_contexts]]);
		} else {
			new_special_contexts = this._special_contexts.concat(undefined);
		}
		return new red.Pointer({
						stack: this._stack.concat(onto_stack),
						special_contexts: new_special_contexts
					});
	};
	proto.push_special_context = function(special_context) {
		var new_special_contexts_obj = _.clone(this._special_contexts);
		var len_m_1 = new_special_contexts_obj.length - 1;
		var nscolm1 = new_special_contexts_obj[len_m_1];
		if(nscolm1) {
			new_special_contexts_obj[len_m_1] = nscolm1.concat(special_context);
		} else {
			new_special_contexts_obj[len_m_1] = [special_context];
		}
		return new red.Pointer({
						stack: this._stack,
						special_contexts: new_special_contexts_obj
					});
	};
	proto.pop = function() {
		return new red.Pointer({
			stack: this._stack.slice(0, this._stack.length-1),
			special_contexts: this._special_contexts.slice(0, this._stack.length-1)
		});
	};
	proto.has = function(item) {
		return this.indexOf(item) >= 0;
	};
	proto.indexOf = function(item) {
		return this._stack.indexOf(item);
	};

	proto.is_empty = function() { return this._stack.length === 0; };

	proto.val = function() {
		var points_at = this.points_at();
		if(points_at instanceof red.Dict) {
			return this;
		} else if(points_at instanceof red.Cell) {
			var cell_constraint = points_at.constraint_in_context(this);
			return cjs.get(cell_constraint);
		} else if(points_at instanceof red.StatefulProp) {
			var pointer = points_at.get_pointer_for_context(this);
			return pointer.val();
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
		var j;
		for(var i = my_stack.length; i>=0; i--) {
			if(my_stack[i] !== other_stack[i]) {
				return false;
			}
			var my_special_contexts = this._special_contexts[i],
				other_special_contexts = other._special_contexts[i];
			if(my_special_contexts && other_special_contexts) {
				var my_len = my_special_contexts.length;
				if(my_len !== other_special_contexts.length) {
					return false;
				}
				for(j = 0; j<my_len; j++) {
					if(my_special_contexts[j] !== other_special_contexts[j]) {
						return false;
					}
				}
			} else if(my_special_contexts || other_special_contexts) { // One is an array and the other is not, assumes the previous IF FAILED
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
		var sc;
		var j, lenj;

		for(var i = len; i>mini; i--) {
			hash += this._stack[i].hash();
			sc = this._special_contexts[i];
			if(sc) {
				for(j = 0; j<lenj && j<num_to_hash; j++) {
					hash += sc[j].hash();
				}
			}
		}

		return hash;
	};

	proto.serialize = function() {
		return {
			stack: _.map(this._stack, red.serialize),
			special_contexts: _.map(this._special_contexts, red.serialize)
		};
	};
	my.deserialize = function(obj) {
		return new RedContext({
			stack: _.map(obj.stack, red.deserialize),
			special_contexts: _.map(obj.special_contexts, red.deserialze)
		});
	};
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

red.pointer_hash = function(item) {
	if(item && item.hash) {
		return item.hash();
	} else {
		return "" + item;
	}
};

}(red));
