(function(red) {
var cjs = red.cjs, _ = red._;
var RedContext = function(options) {
	this._stack = (options && options.stack) || [];
};
(function(my) {
	var proto = my.prototype;
	//proto.get_stack = function() { return _.clone(this._stack); };
	proto.first = function() {
		return this._stack[0];
	};
	proto.last = function() {
		return this._stack[this._stack.length-1];
	};
	proto.length = function() { return this._stack.length; };
	proto.slice = function() { return new RedContext({ stack: this._stack.slice.apply(this._stack, arguments) }); };
	proto.push = function() { return red.create("context", {stack: this._stack.concat.apply(this._stack, arguments)}); };
	proto.has = function(item) { return this._stack.indexOf(item) >= 0; };
	proto.pop = function() { return red.create("context", {stack: this._stack.slice(0, this._stack.length-1)}); };
	proto.prop = function(prop_name) {
		var dict = this.last();
		return dict.get_prop_context(prop_name, this);
	};
	proto.val = function() {
		var obj = this.last();
		if(red.is_contextualizable(obj)) { return obj.get(this); }
		return obj;
	};
	proto.prop_val = function(prop_name) {
		var prop = this.prop(prop_name);
		if(prop === undefined) { return undefined; }
		else { return prop.get(); }
	};
	proto.manifestations = function() {
		var dict = this.last();

		var manifestation_objs = dict.get_manifestation_objs(this);

		var manifestation_contexts =  _.map(manifestation_objs, function(manifestation_obj) {
			var manifestation_context = this.push(manifestation_obj);
			return manifestation_context;
		}, this);

		return manifestaiton_contexts;
	};
	proto.set = function() {
		var obj = this.last();
		obj.set.apply(obj, arguments);
		return this;
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
	proto.type = function() {
		var last = this.last();
		if(last instanceof red.RedDict) {
			return "dict";
		} else if(last instanceof red.RedStatefulObj) {
			return "obj";
		} else if(last instanceof red.RedStatefulProp) {
			return "prop";
		} else if(last instanceof red.RedCell) {
			return "cell";
		}
	};
	proto.is_empty = function() {
		return this._stack.length === 0;
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

red.check_context_equality =  red.check_context_equality_eqeqeq = function(itema, itemb) {
	if(itema instanceof red.RedContext && itemb instanceof red.RedContext) {
		return itema.eq(itemb);
	} else {
		return itema === itemb;
	}
};
red.check_context_equality_eqeq = function(itema, itemb) {
	if(itema instanceof red.RedContext && itemb instanceof red.RedContext) {
		return itema.eq(itemb);
	} else {
		return itema == itemb;
	}
};

}(red));
