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
	proto.get_object = function() {
		return this.object;
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
		var rv = new Set({
			value: [this.get_object()],
			hash: "hash"
		});

		var pointer = this.get_pointer();
		var i = 0;
		while(i < rv.len()) {
			var dict = rv.item(i);
			var proto_obj = dict.direct_protos();
			var proto_contextual_obj = red.find_or_put_contextual_obj(proto_obj, pointer.push(proto_obj));
			var proto_val = proto_contextual_obj.val();
			proto_val = _	.chain(_.isArray(proto_val) ? proto_val : [proto_val])
							.map(function(x) {
								if(x && x instanceof red.ContextualDict) {
									return x.get_object();
								} else {
									return false;
								}
							})
							.compact()
							.value();
			rv.add_at.apply(rv, ([i+1].concat(proto_val)));
			i++;
		}
		var rv_arr = rv.toArray();
		return rv_arr.slice(1); // don't include me
	};

	proto.get_contextual_protos = function() {
		var proto_objects = this.get_all_protos();
		var rv = _.map(proto_objects, function(proto_object) {
			return red.find_or_put_contextual_obj(proto_object, this.pointer)
		}, this);

		return rv;
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
	proto.has = function(name) {
		var pointer = this.get_pointer();
		return this.object._has_prop(name);
	};
	proto.get = function(name) {
		var pointer = this.get_pointer();
		var info = this.object._get_prop_info(name, pointer);
		var options = _.extend({
			name: name
		}, info);
		var value = info.value;
		var contextual_object = red.find_or_put_contextual_obj(value, pointer.push(value), options);
		return contextual_object;
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
	var shadow_statechart = own_statechart.create_shadow({context: this.get_pointer(), running: true});
	this.statechart = shadow_statechart;
};

(function(my) {
	_.proto_extend(my, red.ContextualDict);
	var proto = my.prototype;

	proto.get_own_statechart = function() {
		return this.statechart;
	};

	proto.get_statecharts = function() {
		var contextual_protos = this.get_contextual_protos();
		var proto_statecharts = _	.chain(contextual_protos)
									.map(function(x) {
										if(x instanceof red.ContextualStatefulObject) {
											return x.get_own_statechart();
										} else {
											return false;
										}
									})
									.compact()
									.value();

		return ([this.get_own_statechart()]).concat(proto_statecharts);
	};

	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
		this.statechart.destroy();
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
		this.value_constraint.destroy();
	};
	proto._getter = function() {
		return this.value_constraint.get();
	};
}(red.ContextualCell));

red.ContextualStatefulProp = function(options) {
	red.ContextualStatefulProp.superclass.constructor.apply(this, arguments);
	this.transition_times_run = {};
	this.used_start_transition = false;
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;

	proto.get_parent = function() {
		var context = this.get_pointer();
		var popped_item, last;

		while(!context.is_empty()) {
			last = context.points_at();
			if(last instanceof red.StatefulObj) {
				var contextual_object = red.find_or_put_contextual_obj(last, context);
				return contextual_object;
			}
			popped_item = last;
			context = context.pop();
		}
		return undefined;
	};

	proto.get_all_protos = function() {
		var parent = this.get_parent();
		var parent_protos = parent.get_all_protos();
		return [];
	};

	proto._get_direct_values = function() {
		var parent = this.get_parent();
		var statechart = parent.get_own_statechart();
		var stateful_prop = this.get_object();
		var direct_values = stateful_prop.get_direct_values();

		var entries = direct_values.entries();
		var rv = _.map(entries, function(entry) {
			var state = red.find_equivalent_state(entry.key, statechart);
			return {
				state: state,
				value: entry.value
			};
		});
		return rv;
	};

	proto.get_values = function() {
		var direct_values = this._get_direct_values();
		var rv = direct_values;

		return rv;
	};

	proto.get_transition_times_run = function(transition) {
		var transition_id = transition.id();
		return this.transition_times_run[transition_id];
	};
	proto.set_transition_times_run = function(transition, tr) {
		var transition_id = transition.id();
		this.transition_times_run[transition_id] = tr;
	};

	proto._getter = function() {
		var values = this.get_values();
		var len = values.length;
		var info;

		var using_val, using_state;
		for(var i = 0; i<len; i++){
			info = values[i];
			var state = info.state,
				val = info.value;
			if(state instanceof red.State) {
				if(!using_val && state.is_active()) {
					using_val = val;
					using_state = state;
				}
			} else if(state instanceof red.Transition) {

			}
		}
		if(using_val) {
			if(using_val instanceof red.Cell) {
				var pointer = this.get_pointer();
				var event = state._last_run_event

				var eventized_pointer = pointer.push(using_val, new red.EventContext(event));

				var rv = using_val.get_constraint_for_context(eventized_pointer);
				return rv.get();
			} else {
				return using_val;
			}
		}
		return undefined;
	};

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
