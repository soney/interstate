(function(red) {
var cjs = red.cjs, _ = red._;

red.ContextualObject = function(options) {
	this.object = options.object;
	this.pcontext = options.pcontext;
	this.inherited = options.inherited;

	this.$value = options.value || cjs.$(_.bind(this._getter, this));
};

(function(my) {
	var proto = my.prototype;
	proto.get_pointer = function() { return this.pointer; }
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

	proto.activate = function() {
	};

	proto.deactivate = function() {
	};

	proto._getter = function() {
		return this;
	};
}(red.ContextualObject));

red.ContextualDict = function(options) {
	red.ContextualDict.superclass.constructor.apply(this, arguments);
	this.dict = options.dict;
	this.attachments = cjs.map({
		hash: "hash"
	});
	this.get_child_pointer_objects = cjs.memoize(this._get_child_pointer_objects);
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;

	proto.get_all_protos = function() {
		var dict = this.dict;
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

	proto._get_child_pointer_objects = function() {
		var dict = this.dict;
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

			var names_plus_infos = _.map(infos, function(info, i) {
				return _.extend({
					name: names[i],
					type: type
				}, info);
			});
			rv.push.apply(rv, names_plus_infos);
		}, this);

		return rv;
	};

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
		this.attachments.destroy();
		this.get_child_pointer_objects.destroy();
	};
}(red.ContextualDict));

red.ContextualStatefulObj = function(options) {
	red.ContextualStatefulObj.superclass.constructor.apply(this, arguments);
	var own_statechart = this.dict.get_own_statechart();
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

red.CellPointerObject = function(options) {
	red.CellPointerObject.superclass.constructor.apply(this, arguments);
};

(function(my) {
	_.proto_extend(my, red.PointerObject);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.CellPointerObject));

red.ContextualStatefulPropPointer = function(options) {
	red.ContextualStatefulPropPointer.superclass.constructor.apply(this, arguments);
};

(function(my) {
	_.proto_extend(my, red.PointerObject);
	var proto = my.prototype;

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
}(red.ContextualStatefulPropPointer));

red.get_pointer_object = function(obj, pointer) {
	if(!pointer) {
		pointer = new red.Pointer({stack: [obj]});
	}

	switch(obj.constructor) {
		case red.Dict:
			return new red.DictPointerObject({
				pointer: pointer,
				dict: obj
			})
	}
};

red.check_contextual_object_equality =  red.check_pointer_object_equality_eqeqeq = function(itema, itemb) {
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

}(red));
