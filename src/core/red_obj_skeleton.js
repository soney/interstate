(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedSkeleton = function() {
	this._statechart = cjs.create("statechart");
	this.initialize_statechart();
	this._listeners = {};

	this._direct_prototypes = [];
	this._all_prototypes = [];

	this._direct_properties = cjs.create("map");
	this._inherited_properties = cjs.create("map");
	this._all_properties = cjs.create("map");
	this.$prototypes_changed = _.bind(this.prototypes_changed, this);
	this.$direct_property_changed = _.bind(this.direct_property_changed, this);
	this._context = red.create_context();
};
(function(my) {
	var proto = my.prototype;

	proto.get_context = function() {
		return this._context;
	};
	proto.set_parent = function(parent) {
		if(parent instanceof RedSkeleton) {
			this._context.set_parent(parent.get_context());
		}
	};

	proto.initialize_statechart = function() {
		var statechart = this._statechart;

		statechart	.add_state("INIT")
					.starts_at("INIT");

		var reset_event = cjs.create_event("manual");
		this.do_reset = reset_event.fire;

		var init_state = statechart.get_state_with_name("INIT");

		this.own_statechart = cjs.create("statechart");

		this.inherited_statecharts = cjs.create("statechart")
										.concurrent(true);

		this.running_statechart = cjs	.create("statechart")
										.concurrent(true)
										.add_state("own", this.own_statechart)
										.add_state("inherited", this.inherited_statecharts);

		statechart	.add_state("running", this.running_statechart)
					.add_transition("INIT", "running", cjs.create_event("on_enter", init_state))
					.add_transition("running", "INIT", reset_event);
	};
	proto.get_statechart = function() { return this._statechart; };

	proto.get_direct_prototypes = function() {
		return this._direct_prototypes;
	};
	proto.set_direct_prototypes = function(new_protos) {
		this._direct_prototypes = new_protos;
		this.update_all_prototypes();
	};
	proto.prototypes_changed = function() {
		this.update_all_prototypes();
	};
	proto.update_all_prototypes = function() {
		var old_all_prototypes = this._all_prototypes;
		this._all_prototypes = this._get_all_prototypes();

		var diff = _.diff(old_all_prototypes, this._all_prototypes);
		var self = this;
		_.forEach(diff.removed, function(removed) {
			var item = removed.item
				, index = removed.index;

			//Remove listeners
			item.destroy(self);
			item._off("prototypes_changed", self.$prototypes_changed);
			item._off("direct_property_changed", self.$direct_property_changed);

			//Update the statechart
			self.inherited_statecharts.remove_state("proto_"+index);
			var i = index;
			while(self.inherited_statecharts.has_state("proto_"+(i+1))) {
				self.inherited_statecharts.rename_state("proto_"+(i+1), "proto_"+i);
				i++;
			}
		});
		_.forEach(diff.added, function(added) {
			var item = added.item
				, index = added.index;
			item.initialize(self);
			item._on("prototypes_changed", self.$prototypes_changed);
			item._on("direct_property_changed", self.$direct_property_changed);

			var item_statechart = item.get_statechart().get_state_with_name("running.own");
			var shadow_statechart = red._shadow_statechart(item_statechart);

			var i = index;
			while(self.inherited_statecharts.has_state("proto_"+i)) {
				i++;
			}
			i--;
			while(i >= index) {
				self.inherited_statecharts.rename_state("proto_"+i, "proto_"+(i+1));
				i--;
			};
			self.inherited_statecharts.add_state("proto_"+index, shadow_statechart);
		});
		_.forEach(diff.moved, function(moved) {
			var item = moved.item
				, from_index = moved.from_index
				, to_index = moved.to_index;

			var shadow_statechart = self.inherited_statecharts.get_state_with_name("proto_"+from_index);

			self.inherited_statecharts.remove_state("proto_"+from_index);
			var i = from_index;
			if(from_index > to_index) {
				while(i > to_index) {
					self.inherited_statecharts.rename_state("proto_"+(i-1), "proto_"+(i));
					i--;
				}
			} else {
				while(i < to_index) {
					self.inherited_statecharts.rename_state("proto_"+(i+1), "proto_"+(i));
					i++;
				}
			}
			self.inherited_statecharts.add_state("proto_"+to_index, shadow_statechart);
		});

		if(diff.added.length > 0 || diff.removed.length > 0 || diff.moved.length > 0) {
			this._update_all_props();
			this._notify("prototypes_changed", {
				context: this
			});
		}
	};
	proto._get_all_prototypes = function() {
		return _.uniq(_.flatten(_.map(this.get_direct_prototypes(), function(p) {
			return ([p]).concat(p._get_all_prototypes());
		})));
	};
	proto.initialize = function(self) {};
	proto.destroy = function(self) {};

	proto._create_prop = function(prop_name) {
		var prop = new red.RedProperty(this);
		return prop;
	};

	proto.set_direct_prop = function(prop_name, prop, index) {
		prop = prop || this._create_prop();
		this._direct_properties.set(prop_name, prop, index);
		this._notify("direct_property_changed", {
			context: this
			, action: "set"
			, prop_name: prop_name
			, prop: prop
		});
		this._update_all_props();
		return this;
	};

	proto.remove_direct_prop = function(prop_name) {
		this._direct_properties.unset(prop_name, prop, index);
		this._notify("direct_property_changed", {
			context: this
			, action: "removed"
			, prop_name: prop_name
		});
		this._update_all_props();
		return this;
	};

	proto.move_direct_prop = function(prop_name, to_index) {
		this._direct_properties.move(prop_name, to_index);
		this._notify("direct_property_changed", {
			context: this
			, action: "moved"
			, prop_name: prop_name
			, to_index: to_index
		});
		this._update_all_props();
		return this;
	};

	proto.rename_direct_prop = function(old_name, new_name) {
		this._direct_properties.rename(old_name, new_name);
		this._notify("direct_property_changed", {
			context: this
			, action: "renamed"
			, old_name: old_name
			, new_name: new_name
		});
		this._update_all_props();
		return this;
	};

	proto.has_direct_prop = function(prop_name) {
		return this._direct_prop.has_key(prop_name);
	};

	proto.get_direct_props = function() {
		return this._direct_properties;
	};

	proto.get_direct_prop = function(name) {
		return this._direct_properties.get(name);
	};

	proto._get_direct_prop_names = function() {
		return this._direct_properties.get_keys();
	};

	proto._get_all_prop_names = function() {
		var my_prop_names = this._get_direct_prop_names();
		var other_prop_names = _.flatten(_.map(this._all_prototypes, function(p) {
				return p._get_direct_prop_names();
			}), true);
		var all_prop_names = _.uniq(my_prop_names.concat(other_prop_names));
		return all_prop_names;
	};


	proto._update_all_props = function() {
		var direct_prop_names = this._get_direct_prop_names();
		var old_all_prop_names = this._all_properties.get_keys();
		var new_all_prop_names = this._get_all_prop_names();

		var diff = _.diff(old_all_prop_names, new_all_prop_names);

		var self = this;
		_.forEach(diff.removed, function(removed) {
			var prop_name = removed.item
				, index = removed.index;
			self._remove_prop(prop_name);
		});
		_.forEach(diff.added, function(added) {
			var prop_name = added.item
				, index = added.index;
			var prop_val = self.get_direct_prop(prop_name) || self._create_prop();

			self._set_prop(prop_name, prop_val, index);
		});
		_.forEach(diff.moved, function(moved) {
			var prop_name = moved.item
				, from_index = moved.from_index
				, to_index = moved.to_index;
			self._move_prop(prop_name, to_index);
		});


		this._all_properties.forEach(function(my_prop, prop_name, prop_index) {
			var proto_props = _.map(self._all_prototypes, function(p) {
				return p.get_direct_prop(prop_name);
			});
			var existing_prototypes = my_prop.get_prototypes();
			var proto_prop_diff = _.diff(existing_prototypes, proto_props);
			_.forEach(proto_prop_diff.removed, function(removed) {
				var prop_proto = removed.item
					, index = removed.index;
				my_prop.remove_prototype_at_index(index);
			});
			_.forEach(proto_prop_diff.added, function(added) {
				var prop_proto = added.item
					, index = added.index;
				my_prop.add_prototype(prop_proto, index);
			});
			_.forEach(proto_prop_diff.moved, function(moved) {
				var prop_proto = moved.item
					, from_index = moved.from_index
					, to_index = moved.to_index;
				my_prop.move_prototype(prop_proto, to_index);
			});
		});

		var inherited_property_names = _.difference(new_all_prop_names, direct_prop_names);
		_.forEach(inherited_property_names, function(inherited_property_name) {
			var prop = self._get_prop(inherited_property_name);
			if(_.isEmpty(_.compact(prop.get_prototypes()))) { // not inherited any more
				self._remove_prop(inherited_property_name);
			}
		});
	};

	proto.direct_property_changed = function() {
		this._update_all_props();
	};

	proto._set_prop = function(prop_name, prop, index) {
		prop = prop || this._create_prop();
		this._all_properties.set(prop_name, prop, index);
		this._context.set_prop(prop_name, prop);
		this._notify("property_changed", {
			context: this
			, action: "set"
			, prop_name: prop_name
			, prop: prop
		});
		return this;
	};

	proto._remove_prop = function(prop_name) {
		this._all_properties.unset(prop_name);
		this._context.unset_prop(prop_name);
		this._notify("property_changed", {
			context: this
			, action: "removed"
			, prop_name: prop_name
		});
		return this;
	};

	proto._move_prop = function(prop_name, to_index) {
		this._all_properties.move(prop_name, to_index);
		this._notify("property_changed", {
			context: this
			, action: "moved"
			, prop_name: prop_name
			, to_index: to_index
		});
		return this;
	};

	proto._get_prop = function(prop_name) {
		return this._all_properties.get(prop_name);
	};
	proto._has_prop = function(prop_name) {
		return this._all_properties.has_key(prop_name);
	};

	proto.inherits_from = function() {
		var self = this;
		return _.all(arguments, function(arg) {
			return _.indexOf(self._all_prototypes, arg) >= 0;
		});
	};

	proto.get_state_shadow = function(state) {
		var state_root = state.get_root();
		if(state_root === this.get_statechart()) { // Belongs to me
			return state;
		}
		
		var candidate_index = -1;
		var candidate_proto = null;
		var i, len = this._all_prototypes.length;
		for(i = 0; i<len; i++) {
			var p = this._all_prototypes[i];
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

	proto._on = function(event_type, func) {
		var listeners;
		if(_.has(this._listeners, event_type)) {
			listeners = this._listeners[event_type];
		} else {
			this._listeners[event_type] = listeners = [];
		}
		listeners.push(func);
		return this;
	};

	proto._off = function(event_type, func) {
		var listeners = this._listeners[event_type];
		this._listeners[event_type] = _.without(this._listeners[event_type], func);
		if(_.isEmpty(this._listeners[event_type])) {
			delete this._listeners[event_type];
		}
		return this;
	};

	proto._notify = function(event_type, event) {
		var listeners = this._listeners[event_type];
		_.forEach(listeners, function(func) {
			func(event);
		});
		return this;
	};
}(RedSkeleton));

red.RedSkeleton = RedSkeleton;

}(red));
