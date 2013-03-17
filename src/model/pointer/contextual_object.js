(function(red) {
var cjs = red.cjs, _ = red._;

red.ContextualObject = function(options) {
	this.set_options(options);

	this.$value = new cjs.Constraint(_.bind(this._getter, this));
};

(function(my) {
	var proto = my.prototype;
	proto.get_pointer = function() { return this.pointer; }
	proto.set_options = function(options) {
		if(options) {
			if(options.object) {
				this.object = options.object;
			}
			if(options.pointer) {
				this.pointer = options.pointer;
			}

			if(options.name) {
				this.name = options.name || "";
			}
			if(options.inherited) {
				this.inherited = options.inherited === true;
			}
		}
	};
	proto.toString = function() {
		return "p_" + this.get_pointer().toString();
	};
	proto.hash = function() {
		return this.get_pointer().hash();
	};

	proto.val = function() {
		return this.$value.get();
	};

	proto.destroy = function() {
		this.$value.destroy();
	};

	proto.get_name = function() {
		return this.name;
	};
	proto.is_inherited = function() {
		return this.inherited;
	};

	proto.activate = function() {
	};

	proto.deactivate = function() {
	};

	proto._getter = function() {
		return this.object;
	};
}(red.ContextualObject));

red.ContextualDict = function(options) {
	red.ContextualDict.superclass.constructor.apply(this, arguments);
	this.attachments = cjs.map({
		hash: "hash"
	});
	this.get_child_pointer_objects = cjs.memoize(this._get_child_pointer_objects);
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;

	proto.get_all_protos = function() {
		var dict = this.object;
		var protos = dict.direct_protos();
		var rv;
		if(protos instanceof cjs.ArrayConstraint) {
			rv = protos.toArray();
		} else if(protos instanceof red.Cell) {
			var ptr_obj = red.find_pointer_obj(this.pointer.push(protos));
			rv = ptr_obj.val();
		} else if(protos instanceof red.StatefulProp) {
			var ptr_obj = red.find_pointer_obj(this.pointer.push(protos));
			rv = ptr_obj.val();
		}
		return [];
	};

	proto.get_children = function() {
		var dict = this.object;
		var pointer = this.pointer;

		var builtin_names = dict._get_builtin_prop_names(pointer);
		var direct_names = dict._get_direct_prop_names(pointer);
		var inherited_names = dict._get_inherited_prop_names(pointer);
		var special_context_names = dict._get_special_context_prop_names(pointer);

		var rv = [];
		
		_.each([
			["builtin", builtin_names],
			["direct", direct_names],
			["inherited", inherited_names],
			["special_context", special_context_names]
		], function(info) {
			var type = info[0];
			var names = info[1];
			var getter_fn;
			if(type === "builtin") {
				getter_fn = "_get_builtin_prop_info";
			} else if(type === "direct") {
				getter_fn = "_get_direct_prop_info";
			} else if(type === "inherited") {
				getter_fn = "_get_inherited_prop_info";
			} else if(type === "special_context") {
				getter_fn = "_get_special_context_prop_info";
			}

			var infos = _.map(names, function(name) {
				return dict[getter_fn](name, pointer);
			}, this);

			var contextual_objects = _.map(infos, function(info, i) {
				var options = _.extend({
					name: names[i],
					type: type
				}, info);

				var value = info.value;
				var contextual_object = red.find_or_put_contextual_obj(value, pointer.push(value), options);
				return contextual_object;
			});

			rv.push.apply(rv, contextual_objects);
		}, this);

		return rv;
	};
	proto.get = function(name) {
		var pointer = this.get_pointer();
		var info = this.object._get_prop_info(name, pointer);
		var options = _.extend({
			name: name
		}, info);
		var value = info.value;
		if(value instanceof red.Dict || value instanceof red.StatefulProp || value instanceof red.Cell) {
			var contextual_object = red.find_or_put_contextual_obj(value, pointer.push(value), options);
			return contextual_object;
		} else {
			return value;
		}
	};

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
		this.attachments.destroy();
		this.get_child_pointer_objects.destroy();
	};

	proto._getter = function() {
		return this;
	};
}(red.ContextualDict));

red.ContextualStatefulObj = function(options) {
	red.ContextualStatefulObj.superclass.constructor.apply(this, arguments);
	var own_statechart = this.object.get_own_statechart();
	var shadow_statechart = own_statechart.create_shadow({context: pcontext, running: true});
	this.statechart = shadow_statechart;
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;

	proto.get_own_statechart = function() {
		return this.statechart;
	};

	proto.get_statecharts = function() {
		return [this.get_own_statechart()];
	};

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.ContextualStatefulObj));

red.ContextualCell = function(options) {
	red.ContextualCell.superclass.constructor.apply(this, arguments);
	this.value_constraint = this.object.get_constraint_for_context(this.get_pointer());
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
	proto._getter = function() {
		return this.value_constraint.get();
	};
}(red.ContextualCell));

red.ContextualStatefulProp = function(options) {
	red.ContextualStatefulProp.superclass.constructor.apply(this, arguments);
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.ContextualStatefulProp));

red.check_contextual_object_equality =  red.check_contextual_object_equality_eqeqeq = function(itema, itemb) {
	if(itema instanceof red.ContextualObject && itemb instanceof red.ContextualObject) {
		return itema.get_pointer().eq(itemb.get_pointer()) && itema.get_object() === itemb.get_object();
	} else {
		return itema === itemb;
	}
};
red.check_contextual_object_equality_eqeq = function(itema, itemb) {
	if(itema instanceof red.ContextualObject && itemb instanceof red.ContextualObject) {
		return itema.get_pointer().eq(itemb.get_pointer()) && itema.get_object() == itemb.get_object();
	} else {
		return itema == itemb;
	}
};

red.create_contextual_object = function(object, pointer, options) {
	options = _.extend({
		object: object,
		pointer: pointer,
	}, options);

	var rv;
	if(object instanceof red.Cell) {
		rv = new red.ContextualCell(options);
	} else if(object instanceof red.StatefulProp) {
		rv = new red.ContextualStatefulProp(options);
	} else if(object instanceof red.StatefulObj) {
		rv = new red.ContextualStatefulObj(options);
	} else if(object instanceof red.Dict) {
		rv = new red.ContextualDict(options);
	} else {
		rv = new red.ContextualObject(options);
	}

	return rv;
};

}(red));
