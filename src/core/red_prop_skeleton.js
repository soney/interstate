(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedProperty = function(parent) {
	this._parent = cjs(parent);
	this._direct_values = cjs.create("map");
	this._statechart = _.bind(this.get_root_statechart, this);
	this._statechart_constraint = cjs.create("statechart_constraint", this._statechart);

	this._context = cjs.create("red_context", {thisable: false});

	this._states = cjs(_.bind(this._get_states, this));
	this._values = this._states.map(
						_.bind(this._value_for_state, this)
					);
	this._values.onAdd(_.bind(this._value_added, this))
				.onRemove(_.bind(this._value_removed, this))
				.onMove(_.bind(this._value_moved, this));
};
(function(my) {
	var proto = my.prototype;

	//
	// ===== INITIALIZERS/DESTROYERS =====
	//
	
	proto.destroy = function() {};


	//
	// ===== PARENTAGE =====
	//
	proto.get_parent = function() {
		return this._parent.get();
	};

	proto.get_root_statechart = function() {
		var parent = this.parent();
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
		
		if(direct_value) {
			return direct_value;
		} else {
			var proto_value = this._get_prototype_value_for_state(state);
			var cloned_value = proto_value.clone();
			cloned_value.set_parent(this);
			return cloned_value;
		}
	};
	
	proto.value_for_state = function(state) {
		var root_statechart = this.get_root_statechart();
		return this._value.get_value_for_state(state);
	};

	proto.get = function() {
		return this._statechart_constraint.get();
	};

	proto._on_value_added = function(value, index) {
		var states = this._states.get();
		var state = state[index];
		if(state) {
			this._statechart_constraint.set(state, value);
		}
	};
	proto._on_value_removed = function(value, index) {
		var states = this._states.get();
		var state = state[index];
		if(state) {
			this._statechart_constraint.unset(state);
		}
	};
	proto._on_value_moved = function(value, from_index, to_index) {
		var states = this._states.get();
		var state = state[index];
		if(state) {
			this._statechart_constraint.move(state, value);
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
		var parent = this.get_parent();
		if(parent) {
			var p = parent.get_obj_for_state(state);
			if(p && p instanceof RedProperty) {
				var p_value = p.value_for_state(state);
				if(!_.isUndefined(p_value)) {
					return p_value;
				}
			}
		}
		return undefined;
	};
}(RedProperty));

red.RedProperty = RedProperty;

cjs.define("red_prop", function() {
	var property = new RedProperty();
	var constraint = cjs(function() {
		return property.get();
	});
	return constraint;
});

}(red));
