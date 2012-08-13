(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedProperty = function(parent, name) {
	this._parent = cjs(parent);
	this._direct_values = cjs.create("map");
	this._statechart = cjs.create("constraint", _.bind(this.get_root_statechart, this));
	this._statechart_constraint = cjs.create("statechart_constraint", this._statechart);
	this._name = cjs.create("constraint", name);

	this._context = cjs.create("red_context", {thisable: false});

	var self = this;

	this._states = cjs(_.bind(this.get_states, this));
	this._values = this._states.map(
						function(state) {
							//console.log(_.map(cjs.get(self._states), function(x) { return x.id; }));
							return cjs.create("constraint", function() {
								return cjs.get(self._value_for_state(state));	
							});
						}
					);
	_.forEach(this._values.get(), function(value, index) {
		self._on_value_added(value, index);
	});
	this._values.onAdd   (_.bind(this._on_value_added,   this))
				.onRemove(_.bind(this._on_value_removed, this))
				.onMove  (_.bind(this._on_value_moved,   this));
};
(function(my) {
	var proto = my.prototype;

	//
	// ===== INITIALIZERS/DESTROYERS =====
	//
	
	proto.destroy = function() {};

	proto.get_context = function() { return this._context; };
	proto.set_name = function(name) { this._name.set(name); return this; };
	proto.get_name = function(name) { return this._name.get(); };

	//
	// ===== PARENTAGE =====
	//

	proto.get_parent = function() {
		return this._parent.get();
	};

	proto.get_root_statechart = function() {
		var parent = this.get_parent();
		if(!parent) {
			return undefined;
		} else {
			return parent.get_statechart();
		}
	};

	proto.get_statechart_event = function() {
		var root_statechart = this.get_root_statechart();
		return root_statechart._event;
	};

	//
	// ===== VALUES =====
	//
	
	proto._direct_value_for_state = function(state) {
		return this._direct_values.get(state);
	};

	proto._value_for_state = function(state) {
		var direct_value = this._direct_value_for_state(state);
		//console.log(direct_value, state, state.id);
		
		if(direct_value) {
			return direct_value;
		} else {
			var proto_value = this._get_prototype_value_for_state(state);
			if(proto_value) {
				var cloned_value = proto_value.clone(this);
				//cloned_value.set_parent(this);
				return cloned_value;
			} else {
				return undefined;
			}
		}
	};
	
	proto.value_for_state = function(state) {
		var root_statechart = this.get_root_statechart();
		return this._value.get_value_for_state(state);
	};

	proto.get = function() {
		return cjs.get(this._statechart_constraint, true);
	};
	proto.set = function(state, value) {
		this._direct_values.set(state, value);
		return this;
	};
	proto.unset = function(state) {
		this._direct_values.unset(state);
		return this;
	};

	proto._on_value_added = function(value, index) {
		var states = this._states.get();
		var state = states[index];
		if(state) {
			//debugger;
			this._statechart_constraint.set_value_for_state(state, value);
		}
	};
	proto._on_value_removed = function(value, index) {
		var states = this._states.get();
		var state = states[index];
		if(state) {
			this._statechart_constraint.unset_value_for_state(state);
		}
	};
	proto._on_value_moved = function(value, from_index, to_index) {
		var states = this._states.get();
		var state = states[from_index];
		if(state) {
			this._statechart_constraint.move_value_for_state(state, value);
		}
	};

	//
	// ===== STATECHART =====
	//

	proto.my_version_of_state = function(state) {
		var parent = this.parent();
		if(parent) {
			return parent.get_state_shadow(state);
		} else {
			return undefined;
		}
	};

	proto.get_states = function() {
		var parent = this.get_parent();
		if(parent) {
			return parent.get_states();
		} else {
			return [];
		}
	};

	proto.state_is_inherited = function(state) {
		var parent = this.get_parent();
		if(parent) {
			return parent.state_is_inherited(state);
		} else {
			return false;
		}
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
		if(!basis) { basis = state; }
		var parent = this.get_parent();
		if(parent) {
			var p = parent.get_obj_for_state(basis);
			if(p === parent) {
				return undefined;
			}
			if(p) {
				var my_name = this.get_name();
				var prop = p.get_prop(my_name);
				if(prop) {
					var p_value = prop._direct_value_for_state(basis);
					if(!_.isUndefined(p_value)) {
						return p_value;
					}
				}
			}
		}
		return undefined;
	};
}(RedProperty));

red.RedProperty = RedProperty;

cjs.define("red_prop", function(parent, name) {
	var property = new RedProperty(parent, name);
	var constraint = cjs(function() {
		var val = property.get();
		return cjs.get(val); //Double constraint if inherited
		/*
		if(cjs.is_constraint(val)) {
		}
		return property.get();
		*/
	});
	constraint.set = _.bind(property.set, property);
	constraint.unset = _.bind(property.unset, property);
	constraint.get = _.bind(property.get, property);
	constraint.get_context = _.bind(property.get_context, property);
	constraint.set_name = _.bind(property.set_name, property);
	constraint._direct_value_for_state= _.bind(property._direct_value_for_state, property);
	constraint.type = "red_prop";
	constraint.prop = property;
	return constraint;
});

}(red));
