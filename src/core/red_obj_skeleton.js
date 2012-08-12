(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedSkeleton = function() {
	this._statechart = cjs.create("statechart");
	this._context = cjs.create("red_context", {
		thisable: true
	});

	this._$prototype_removed = _.bind(this._prototype_removed, this);
	this._$prototype_added   = _.bind(this._prototype_added,   this);
	this._$prototype_moved   = _.bind(this._prototype_moved,   this);

	this._direct_prototypes = cjs.create("array");
	this._all_prototypes = cjs	.create("constraint", _.bind(this._get_all_prototypes, this))
								.onRemove(this._$prototype_removed)
								.onAdd   (this._$prototype_added)
								.onMove  (this._$prototype_moved);

	this._$prop_removed = _.bind(this._prop_removed, this);
	this._$prop_added   = _.bind(this._prop_added,   this);
	this._$prop_moved   = _.bind(this._prop_moved,   this);

	this._direct_properties = cjs.create("map");
	this._all_property_names = cjs(_.bind(this.get_prop_names, this));
	this._all_properties = this._all_property_names.map(this._$prop_added, this._$prop_removed, this._$prop_moved);

	this._states = cjs(_.bind(this.get_states, this));
	this.initialize_statechart();
};
(function(my) {
	var proto = my.prototype;

	//
	// ===== STATECHARTS =====
	//

	proto.initialize_statechart = function() {
		var statechart = this._statechart;

		statechart	.add_state("INIT")
					.starts_at("INIT");

		var reset_event = cjs.create_event("manual");
		this.do_reset = reset_event.fire;


		this.own_statechart = cjs.create("statechart");

		this.inherited_statecharts = cjs.create("statechart")
										.concurrent(true);

		this.running_statechart = cjs	.create("statechart")
										.concurrent(true)
										.add_state("own", this.own_statechart)
										.add_state("inherited", this.inherited_statecharts);

		this._init_state = statechart.get_state_with_name("INIT");
		statechart	.add_state("running", this.running_statechart)
					.add_transition("INIT", "running", cjs.create_event("on_enter", this._init_state))
					.add_transition("running", "INIT", reset_event);

		statechart._on("state_added", this._states.invalidate);
		statechart._on("state_removed", this._states.invalidate);
		statechart._on("state_moved", this._states.invalidate);
		statechart._on("transition_added", this._states.invalidate);
		statechart._on("transition_removed", this._states.invalidate);
	};

	proto.remove_shadow_shatestart = function(index) {
		this.inherited_statecharts.remove_state("proto_"+index);
		var i = index;
		while(this.inherited_statecharts.has_state("proto_"+(i+1))) {
			this.inherited_statecharts.rename_state("proto_"+(i+1), "proto_"+i);
			i++;
		}
	};

	proto.add_shadow_statechart = function(shadow_statechart, index) {
		var i = index;
		while(this.inherited_statecharts.has_state("proto_"+i)) {
			i++;
		}
		i--;
		while(i >= index) {
			this.inherited_statecharts.rename_state("proto_"+i, "proto_"+(i+1));
			i--;
		};
		this.inherited_statecharts.add_state("proto_"+index, shadow_statechart);
	};

	proto.move_shadow_statechart = function(from_index, to_index) {
		var shadow_statechart = this.inherited_statecharts.get_state_with_name("proto_"+from_index);

		this.inherited_statecharts.remove_state("proto_"+from_index);
		var i = from_index;
		if(from_index > to_index) {
			while(i > to_index) {
				this.inherited_statecharts.rename_state("proto_"+(i-1), "proto_"+(i));
				i--;
			}
		} else {
			while(i < to_index) {
				this.inherited_statecharts.rename_state("proto_"+(i+1), "proto_"+(i));
				i++;
			}
		}
		this.inherited_statecharts.add_state("proto_"+to_index, shadow_statechart);
	};


	proto.get_state_shadow = function(state) {
		var state_root = state.get_root();
		if(state_root === this.get_statechart()) { // Belongs to me
			return state;
		}
		
		var candidate_index = -1;
		var candidate_proto = null;
		var all_prototypes = this._all_prototypes.get();
		var i, len = all_prototypes.length;
		for(i = 0; i<len; i++) {
			var p = all_prototypes[i];
			if(state_root === p.get_statechart()) {
				candidate_proto = p;
				candidate_index = i;
				break;
			}
		}
		if(candidate_index < 0) {
			return undefined;
		} else {
			var shadow_root = this.inherited_statecharts.get_state_with_name("proto_"+candidate_index);
			var name = state.get_name(candidate_proto.own_statechart);
			return shadow_root.get_state_with_name(name);
		}
	};

	proto.get_states = function() {
		var init_state = [this._init_state];
		var own_states = this.own_statechart.flatten();
		var inherited_states = _.flatten(_.map(this.inherited_statecharts, function(inherited_statechart) {
			return inherited_statechart.flatten();
		}), true);
		return init_state.concat(own_states, inherited_states);
	};

	proto.state_is_inherited = function(state) {
		var parent = state;
		do {
			if(parent === this.inherited_statecharts) { return true; }
			parent = parent.parent();
		} while(parent);
		return false;
	};

	proto.get_obj_for_state = function(state) {
		var basis = state.get_basis();
		if(!basis) {
			basis = state;
		}
		var root = basis.get_root();
		if(root === this.get_statechart()) {
			return this;
		} else {
			var all_prototypes = this._all_prototypes.get();
			var len = all_prototypes.length;
			for(var i = 0; i<len; i++) {
				var p = all_prototypes[i];
				if(root === p.get_statechart()) {
					return p;
				}
			}
			return undefined;
		}
	};

	proto.get_statechart = function() {
		return this._statechart;
	};

	// 
	// ===== PROTOTYPES =====
	//
	
	proto.set_direct_prototypes = function(protos) {
		this._direct_prototypes.set(protos);
	};

	proto._get_direct_prototypes = function() {
		return this._direct_prototypes.get();
	};

	proto._prototype_removed = function(item, index) {
		item.destroy(this);
		this.remove_shadow_statechart(index);
	};
	proto._prototype_added = function(item, index) {
		//Update the statechart
		var item_statechart = item.get_statechart().get_state_with_name("running.own");
		var shadow_statechart = red._shadow_statechart(item_statechart);
		this.add_shadow_statechart(shadow_statechart, index);
		item.initialize(this);
	};
	proto._prototype_moved = function(item, from_index, to_index) {
		this.move_shadow_statechart(from_index, to_index);
	};

	proto._get_all_prototypes = function() {
		var direct_prototypes = this._get_direct_prototypes();
		var all_prototypes = _.map(direct_prototypes, function(direct_prototype) {
			return ([direct_prototype]).concat(direct_prototype._get_all_prototypes());
		});

		var flattened_all_prototypes = _.flatten(all_prototypes);
		
		return _.uniq(_.flatten(_.map(this._get_direct_prototypes(), function(p) {
			return ([p]).concat(p._get_all_prototypes());
		})));
	};

	//
	// ===== PROPERTIES =====
	//
	
	proto._get_direct_prop_names = function() {
		return this._direct_properties.get_keys();
	};

	proto.get_prop_names = function() {
		var my_prop_names = this._get_direct_prop_names();
		var protos = this._get_all_prototypes();

		var all_proto_prop_names = _.map(this._all_prototypes.get(), function(my_proto) {
			return my_proto._get_direct_prop_names();
		});
		var all_prop_names = ([my_prop_names]).concat(all_proto_prop_names);
		var flattened_all_prop_names = _.flatten(all_prop_names, true);
		var all_prop_names = _.uniq(flattened_all_prop_names);

		return all_prop_names;
	};

	proto._get_inherited_prop_names = function() {
		var my_prop_names = this._get_direct_prop_names();
		var inherited_prop_names = this.get_prop_names();
		return _.difference(inherited_prop_names, my_prop_names);
	};

	proto.name_for_prop = function(prop) {
		var all_properties = this._all_properties.get();
		var prop_index = _.indexOf(all_properties, prop);
		if(prop_index < 0) {
			return undefined;
		} else {
			var prop_names = this.get_prop_names();
			return prop_names[index];
		}
	};

	proto.prop_prototypes = function(prop) {
		var prop_name = this.name_for_prop(prop);
		if(_.isUndefined(prop_name)) {
			return [];
		} else {
			var all_prototypes = this._all_prototypes.get();
			var props = _.map(all_prototypes, function(p) {
				return p.get_prop(prop_name);
			});
			var filtered_props = _.compact(props);
			return filtered_props;
		}
	};

	proto._prop_index = function(prop_name) {
		var prop_names = this._all_property_names.get();
		return _.indexOf(prop_names, prop_name);
	};

	proto._has_prop = function(prop_name) {
		return this._prop_index(prop_name) >= 0;
	};

	proto.inherits_from = function() {
		var all_prototypes = this._get_all_prototypes();
		return _.all(arguments, function(arg) {
			return _.indexOf(_all_prototypes, arg) >= 0;
		});
	};

	proto.prop_is_inherited = function(prop_name) {
		if(this._has_prop(prop_name)) {
			var inherited_prop_names = this._get_inherited_prop_names();
			return _.indexOf(inherited_prop_names, prop_name >= 0);
		} else {
			return false;
		}
	};

	proto._create_prop = function() {
		var prop = cjs.create("red_prop", this);
		return prop;
	};

	proto.set_prop = function(prop_name, prop, index) {
		prop = prop || this._create_prop();
		this._direct_properties.set(prop_name, prop, index);
		return this;
	};

	proto.remove_prop = function(prop_name) {
		this._direct_properties.unset(prop_name);
		return this;
	};

	proto.move_prop = function(prop_name, index) {
		this._direct_properties.move(prop_name, index);
		return this;
	};

	proto.rename_prop = function(old_name, new_name) {
		this._direct_properties.rename(old_name, new_name);
		return this;
	};

	proto._prop_removed = function(prop_name, index, prop) {
		prop.destroy();
	};

	proto._prop_added = function(prop_name, index) {
		if(this.prop_is_inherited(prop_name)) {
			return this._create_prop();
		} else {
			return this._direct_properties.get(prop_name);
		}
	};
	proto._prop_moved = function(prop_name, from_index, to_index) { };

	proto.get_prop = function(prop_name) {
		var prop_index = this._prop_index(prop_name);
		if(prop_index < 0) {
			return undefined;
		} else {
			var all_properties = this._all_properties.get();
			return all_properties[prop_index];
		}
	};

	//
	// ===== INITIALIZERS AND DESTROYERS =====
	//
	proto.initialize = function(self) {};
	proto.destroy = function(self) {};
}(RedSkeleton));

red.RedSkeleton = RedSkeleton;

cjs.define("red_skeleton", function() {
	return new RedSkeleton();
});

}(red));
