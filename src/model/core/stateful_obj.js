(function(red) {
var cjs = red.cjs, _ = cjs._;


var RedStatefulObj = function(options) {
	RedStatefulObj.superclass.constructor.apply(this, arguments);

	this._$sc_proto_removed = _.bind(this._sc_proto_removed, this);
	this._$sc_proto_added   = _.bind(this._sc_proto_added,   this);
	this._$sc_proto_moved   = _.bind(this._sc_proto_moved,   this);

	this._statechart = cjs.create("statechart");
	this._states = cjs(_.bind(this._states_getter, this));
	this._active_states = cjs(_.bind(this._active_states_getter, this));
	this.initialize_statechart();
	this._all_protos.onRemove(this._$sc_proto_removed)
					.onAdd   (this._$sc_proto_added)
					.onMove  (this._$sc_proto_moved);
	this.type = "red_stateful_obj";
};
(function(my) {
	_.proto_extend(my, red.RedDict);
	var proto = my.prototype;

	//
	// ===== STATECHARTS =====
	//

	proto.initialize_statechart = function() {
		var statechart = this._statechart;

		this.own_statechart = cjs	.create("statechart")
									.add_state("INIT")
									.starts_at("INIT");
		this._init_state = this.own_statechart.get_state_with_name("INIT");

		this.inherited_statecharts = cjs.create("statechart")
										.concurrent(true);

		statechart	.concurrent(true)
					.add_state("own", this.own_statechart)
					.add_state("inherited", this.inherited_statecharts);



		statechart._on("state_added", this._states.invalidate);
		statechart._on("state_removed", this._states.invalidate);
		statechart._on("state_moved", this._states.invalidate);
		statechart._on("transition_added", this._states.invalidate);
		statechart._on("transition_removed", this._states.invalidate);
	};
	proto.reset = function() {
		var statechart = this.get_statechart();
		statechart.reset();
	};
	proto.get_init_state = function() {
		return this._init_state;
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
			var name = state.get_name(candidate_proto.get_own_statechart());
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
	};

	proto._interested_in_state = function(state) {
		if(state.get_type() === "pre_init") {
			return false;
		} else if(state.parent() === this.inherited_statecharts) {
			return false;
		} else {
			return true;
		}
	};

	proto._states_getter = function() {
		var self = this;
		var own_states = _.rest(this.get_own_statechart().flatten().filter(function(state) {
			return self._interested_in_state(state);
		}));
		var inherited_states = this.get_inherited_states();

		return own_states.concat(inherited_states);
	};
	proto.get_states = function() {
		return this._states.get();
	};
	proto._active_states_getter = function() {
		var statechart = this.get_statechart();
		var states = statechart.get_state();
		var self = this;
		active_states = _.filter(states, function(state) {
			return self._interested_in_state(state);
		});
		return states;
	};
	proto.get_active_states = function() {
		return this._active_states.get();
	};
	proto.get_inherited_states = function() {
		var self = this;
		var inherited_states = _.rest(this.inherited_statecharts.flatten().filter(function(state) {
			return self._interested_in_state(state);
		}));
		return inherited_states;
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
		if(item.get_own_statechart) {
			var item_statechart = item.get_own_statechart();
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
	proto.run = function() {
		var statechart = this.get_statechart();
		statechart.run();
	};
	proto.get_own_statechart = function() { return this.own_statechart; };
	proto.add_state = function() {
		var own_statechart = this.get_own_statechart();
		own_statechart.add_state.apply(own_statechart, arguments);
		return this;
	};
	proto.find_state = function(state) {
		if(_.isString(state)) {
			var statechart = this.get_statechart();
			var rv = statechart.get_state_with_name(state);
			if(rv) { return rv; }

			var own_statechart = this.get_own_statechart();
			rv = own_statechart.get_state_with_name(state);
			if(rv) { return rv; }

			var my_states = this.get_states();
			var my_state_names = _.map(my_states, function(my_state) {
				return my_state.get_name(my_state.parent());
			});

			var index = _.indexOf(my_state_names, state);
			if(index>=0) { return my_states[index]; }

			return undefined;
		} else {
			return state;
		}
	};
	proto.get_state = function() {
		var statechart = this.get_statechart();
		return statechart.get_state();
	};
	proto.add_transition = function(from_state, to_state, event) {
		var statechart = this.get_own_statechart();
		if(arguments.length === 1) {
			statechart.add_transition.apply(statechart, arguments);
		} else {
			from_state = this.find_state(from_state);
			to_state = this.find_state(to_state);
			statechart.add_transition(from_state, to_state, event);
		}
		return this;
	};
	proto.is = function(state) {
		var statechart = this.get_statechart();
		return statechart.is(state);
	};
	proto.starts_at = function(transition_to) {
		var statechart = this.get_own_statechart();
		transition_to = this.find_state(transition_to);
		statechart.starts_at(transition_to);
		return this;
	};
	proto.rename_state = function() {
		var own_statechart = this.get_own_statechart();
		own_statechart.rename_state.apply(own_statechart, arguments);
		return this;
	};
}(RedStatefulObj));

red.RedStatefulObj = RedStatefulObj;

cjs.define("red_stateful_obj", function(options) {
	var dict = new RedStatefulObj(options);
	dict.on_ready();
	return dict;
});

}(red));
