(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedStatefulObj = function(options) {
	RedStatefulObj.superclass.constructor.apply(this, arguments);

	this._$sc_proto_removed = _.bind(this._sc_proto_removed, this);
	this._$sc_proto_added   = _.bind(this._sc_proto_added,   this);
	this._$sc_proto_moved   = _.bind(this._sc_proto_moved,   this);

	this._statechart = cjs.create("statechart");
	this._states = cjs(_.bind(this._state_getter, this));
	this.initialize_statechart();
	this._all_protos.onRemove(this._$sc_proto_removed)
					.onAdd   (this._$sc_proto_added)
					.onMove  (this._$sc_proto_moved);
};
(function(my) {
	_.proto_extend(my, red.RedDict);
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
	proto.remove_shadow_statechart = function(index) {
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
	};;

	proto._state_getter = function() {
		var init_state = [this._init_state];
		var own_states = _.rest(this.own_statechart.flatten().filter(function(state) {
			return state.get_type() !== "pre_init";
		}));
		var self = this;
		var inherited_states = _.rest(this.inherited_statecharts.flatten().filter(function(state) {
			if(state.get_type() === "pre_init") { return false; }
			else if(state.parent() === self.inherited_statecharts) { return false; }

			return true;
		}));

		return init_state.concat(own_states, inherited_states);
	};
	proto.get_states = function() {
		return this._states.get();
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
	// === PROTOS ===
	//
	proto._sc_proto_removed = function(item, index) {
		this.remove_shadow_statechart(index);
	};
	proto._sc_proto_added = function(item, index) {
		if(item.get_statechart) {
			var item_statechart = item.get_statechart().get_state_with_name("running.own");
			var shadow_statechart = red._shadow_statechart(item_statechart);
			this.add_shadow_statechart(shadow_statechart, index);
		} else {
			var fake_shadow_statechart = cjs.create("statechart");
			this.add_shadow_statechart(fake_shadow_statechart, index);
		}
	};
	proto._sc_proto_moved = function(item, from_index, to_index) {
		this.move_shadow_statechart(from_index, to_index);
	};
}(RedStatefulObj));

red.RedStatefulObj = RedStatefulObj;

cjs.define("red_stateful_obj", function(options) {
	var dict = new RedStatefulObj(options);
	var constraint = cjs(function() {
		return dict;
	});
	dict._constraint = constraint;
	constraint.has_prop = _.bind(dict.has_prop, dict);
	constraint.get_parent = _.bind(dict.get_parent, dict);
	constraint.set_parent = _.bind(dict.set_parent, dict);
	constraint.get_prop = _.bind(dict._get_all_prop, dict);
	constraint.set_prop = _.bind(dict._set_direct_prop, dict);
	constraint.set_protos = _.bind(dict._set_direct_protos, dict);
	constraint.get_protos = _.bind(dict._get_all_protos, dict);
	constraint._get_all_protos = _.bind(dict._get_all_protos, dict);
	constraint._get_direct_props = _.bind(dict._get_direct_props, dict);
	constraint._inherited_props_with_name = _.bind(dict._inherited_props_with_name, dict);
	constraint.get_statechart = _.bind(dict.get_statechart, dict);
	constraint.get_states = _.bind(dict.get_states, dict);
	constraint.initialize = function(self) {};
	constraint.destroy = function(self) { };
	constraint.get_own_statechart = function() {
		return dict.own_statechart;
	};
	constraint.get_blueprint_datum = function(blueprint_name, key) {
		return dict._blueprint_data[blueprint_name][key];
	};
	constraint.set_blueprint_datum = function(blueprint_name, key, value) {
		dict._blueprint_data[blueprint_name][key] = value;
	};
	constraint.add_blueprint_data = function(blueprint_name) {
		dict._blueprint_data[blueprint_name] = {};
	};
	constraint.remove_blueprint_data = function(blueprint_name) {
		delete dict._blueprint_data[blueprint_name];
	};
	constraint.type = "red_stateful_obj";
	return constraint;
});

}(red));
