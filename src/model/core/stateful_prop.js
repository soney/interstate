(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedStatefulProp = function(options) {
	options = options || {};
	if(!options.parent) { options.parent = undefined; }

	var self = this;

	this._parent = cjs.create("constraint", options.parent, true);
	this._statechart = cjs.create("constraint", _.bind(this._root_statechart_getter, this));

	this._direct_values = cjs.create("map");
	this._active_states = cjs.create("constraint", _.bind(this._active_states_getter, this));
	this._active_values = cjs.create("constraint", _.bind(this._active_values_getter, this));
	this._active_state = cjs.create("constraint", _.bind(this._active_state_getter, this));
	this._active_value = cjs.create("constraint", _.bind(this._active_value_getter, this));
};
(function(my) {
	var proto = my.prototype;

	//
	// ===== PARENTAGE =====
	//

	proto.get_parent = function() { return this._parent.get(); };
	proto.set_parent = function(parent) { this._parent.set(parent); };
	proto.get_stateful_obj_parent = function() {
		var prop_obj = this.get_parent();
		if(prop_obj) {
			var stateful_obj = prop_obj.get_parent();
			if(stateful_obj) {
				return stateful_obj;
			}
		}
		return undefined;
	};
	proto._root_statechart_getter = function() {
		var stateful_obj = this.get_stateful_obj_parent();
		if(stateful_obj) {
			return stateful_obj.get_statechart();
		} else {
			return undefined;
		}
	};
	proto.get_statechart = function() {
		return this._statechart.get();
	};
	
	//
	// ===== STATECHART =====
	//
	
	proto._inherited_states_getter = function() {
		var stateful_obj = this.get_stateful_obj_parent();
		if(stateful_obj) {
			return stateful_obj.get_inherited_states();
		} else {
			return [];
		}
	};
	
	//
	// ===== VALUES =====
	//
	
	proto._set_direct_value_for_state = function(state, value) {
		this._direct_values.set(state, value);
	};
	proto._unset_direct_value_for_state = function(state) {
		this._direct_values.unset(state);
	};
	
	proto._direct_value_for_state = function(state) {
		return this._direct_values.get(state);
	};
	
	proto._inherited_value_for_state = function(state) {
		var proto_value = this._get_prototype_value_for_state(state);
		if(proto_value && proto_value.clone) {
			var cloned_value = proto_value.clone({parent: this});
			return cloned_value;
		} else if(proto_value) {
			return proto_value;
		} else {
			return undefined;
		}
	};

	proto._value_for_state = function(state) {
		var direct_value = this._direct_value_for_state(state);
		
		if(direct_value) {
			return direct_value;
		} else {
			return this._inherited_value_for_state(state);
		}
	};

	
	proto.get_value = function(state) {
		var rv = this._statechart_constraint.get_value_for_state(state);
		return rv;
	};

	proto.get = function() {
		var active_value = this.get_active_value();
		return cjs.get(active_value);
	};

	proto.set_value = proto._set_direct_value_for_state;
	proto.get_value = proto._value_for_state;
	proto.unset_value = proto._unset_direct_value_for_state;

	proto._active_states_getter = function() {
		var stateful_obj = this.get_stateful_obj_parent();
		return stateful_obj.get_active_states();
	};
	proto.get_active_states = function() {
		return this._active_states.get();
	};
	proto._active_values_getter = function() {
		var active_states = this.get_active_states();
		var self = this;
		var active_values = _.map(active_states, function(state) {
			return self._value_for_state(state);
		});
		return active_values;
	};
	proto.get_active_values = function() {
		return this._active_values.get();
	};
	proto._active_state_getter = function() {
		var active_states = this.get_active_states();
		var active_values = this.get_active_values();
		for(var i = 0; i<active_states.length; i++) {
			var active_state = active_states[i];
			var active_value = active_values[i];
			if(!_.isUndefined(active_value)) {
				return active_state;
			}
		}
		return undefined;
	};
	proto.get_active_state = function() {
		return this._active_state.get();
	};
	proto._active_value_getter = function() {
		var active_state = this.get_active_state();
		return this._value_for_state(active_state);
	};
	proto.get_active_value = function() {
		return this._active_value.get();
	};
	
	// 
	// ===== PROTOTYPES =====
	//
	
	proto.get_prototypes = function() {
		var parent = this.get_parent();
		if(parent) {
			return parent.prop_prototypes(this);
		}
	};

	proto._get_prototype_value_for_state = function(state) {
		var basis = state.get_basis();
		if(basis) {
			var inherits_from = this._get_inherits_from();
			var len = inherits_from.length;
			for(var i = 0; i<len; i++) {
				var p_value = inherits_from[i].get_value(basis);
				if(!_.isUndefined(p_value)) {
					return p_value;
				}
			}
		}
		return undefined;
	};

	proto._get_inherits_from = function() {
		var parent = this.get_parent();
		if(parent) {
			var parent_inherits_from = parent.inherits_from();
			return _.map(parent_inherits_from, function(prop_obj) {
				return prop_obj.get_value();
			});
		}
		return [];
	};
}(RedStatefulProp));

red.RedStatefulProp = RedStatefulProp;

cjs.define("red_stateful_prop", function(options) {
	var property = new RedStatefulProp(options);
	var constraint = cjs(function() {
		var val = property.get();
		return cjs.get(val); //Double constraint if inherited
	});
	property._constraint = constraint;
	constraint.set_value = _.bind(property.set_value, property);
	constraint.unset_value = _.bind(property.unset_value, property);
	constraint.get_value = _.bind(property.get_value, property);
	constraint.get_parent = _.bind(property.get_parent, property);
	constraint.set_parent = _.bind(property.set_parent, property);
	constraint.get_stateful_obj_parent = _.bind(property.get_stateful_obj_parent, property);
	constraint.clone = function(options) {
		options = options || {};
		return cjs.create("red_stateful_prop", options);
	};

	constraint.type = "red_stateful_prop";
	return constraint;
});

}(red));
