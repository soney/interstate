(function(red) {
var cjs = red.cjs, _ = red._;
var RedContext = function(options) {
	options = options || {};
	this._stack = options.stack || [];
	this._stack_pointer_index = _.size(this.get_stack())-1;
};
(function(my) {
	var proto = my.prototype;
	proto.get_stack = function() {
		return _.clone(this._stack);
	};
	proto.first = function() {
		return _.first(this._stack);
	};
	proto.last = function() {
		return _.last(this._stack);
	};
	proto.push = function(item) {
		var stack = this.get_stack();
		stack.push(item); //It's a clone, so it doesn't affect my stack
		return red.create("context", {stack: stack});
	};
	proto.has = function(item) {
		return this._stack.indexOf(item) >= 0;
	};
	proto.pop = function() {
		var stack = this.get_stack();
		stack.pop(); //It's a clone, so it doesn't affect my stack
		return red.create("context", {stack: stack});
	};
	proto.iter = function() {
		if(this._stack_pointer_index >= 0) {
			var stack = this.get_stack();
			var rv = stack[this._stack_pointer_index];
			this._stack_pointer_index--;
			return rv;
		} else {
			return undefined;
		}
	};
	proto.reset_iterator = function() {
		this._stack_pointer_index = _.size(this.get_stack())-1;
	};
	proto.eq = function(other_context) {
		var my_stack = this.get_stack();
		var other_stack = other_context.get_stack();
		if(my_stack.length !== other_stack.length) {
			return false;
		}
		for(var i = 0; i<my_stack.length; i++) {
			if(my_stack[i] !== other_stack[i]) {
				return false;
			}
		}
		return true;
	};
	proto.is_empty = function() {
		return _.isEmpty(this._stack);
	};
	proto.hash = function() {
		var hash = 0;
		_.each(_.last(this._stack, 3), function(dict) {
			hash +=  dict.hash();
		});
		return hash;
	};

	proto.serialize = function() {
		return { stack: _.map(this._stack, red.serialize) };
	};
		
	my.deserialize = function(obj) {
		return new RedContext({stack: _.map(obj.stack, red.deserialize)});
	};
	proto.print = function() {
		var rarr = [];
		for(var i = 0; i<this._stack.length; i++) {
			var item = this._stack[i];

			var str = item.id + "";

			var manifestation_of = item.get_manifestation_of();
			if(manifestation_of) {
				var basis_index = item._get_direct_prop("basis_index");
				str += "(" + manifestation_of.id + "," + basis_index + ")";
			}

			rarr.push(str);
		}
		return rarr.join(" > ");
	};
}(RedContext));

red.RedContext = RedContext;
red.define("context", function(options) {
	var context = new RedContext(options);
	return context;
});

red.is_contextualizable = function(obj) {
	return obj instanceof red.RedCell || obj instanceof red.RedStatefulProp;
};

red.get_contextualizable = function(obj, context) {
	if(red.is_contextualizable(obj)) {
		return obj.get(context);
	}
	return cjs.get(obj);
};

red.check_context_equality = function(itema, itemb) {
	if(itema instanceof red.RedContext && itemb instanceof red.RedContext) {
		return itema.eq(itemb);
	} else {
		return itema === itemb;
	}
};

}(red));
