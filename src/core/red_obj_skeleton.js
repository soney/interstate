(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedSkeleton = function() {
	this._statechart = cjs.create("statechart");
	this.initialize_statechart();
	this._listeners = {};

	this._direct_prototypes = [];
	this._all_prototypes = [];

	this._direct_properties = cjs.create("map");
	this._all_properties = cjs.create("map");
};
(function(my) {
	var proto = my.prototype;

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
		this.$prototypes_changed = _.bind(this.prototypes_changed, this);
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
			item.destroy(self);
			item._off("prototypes_changed", self.$prototypes_changed);

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
		return this;
	};

	proto.remove_direct_prop = function(prop_name) {
		this._direct_properties.unset(prop_name, prop, index);
		this._notify("direct_property_changed", {
			context: this
			, action: "removed"
			, prop_name: prop_name
		});
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
		return this;
	};

	proto.has_direct_prop = function(prop_name) {
		return this._direct_prop.has_key(prop_name);
	};

	proto.get_direct_props = function() {
		return this._direct_properties;
	};

	proto._get_all_props = function() {
		console.log("HI");
	};

	/*

	proto.get_all_prototypes = function() {
		return _.uniq(_.flatten(_.map(this.get_direct_prototypes(), function(p) {
			return ([p]).concat(p.get_all_prototypes());
		})));
	};

	proto.add_prop = function(prop_name, prop) {
		prop = prop || this._create_prop();
		this._properties.set(prop_name, prop);
		return this;
	};

	proto.remove_prop = function(prop_name) {
		this._properties.unset(prop_name);
		return this;
	};

	proto.find_prop = function(prop_name) {
		return this._properties.get(prop_name);
	};

	proto.get_direct_properties = function() {
	};

	proto.get_all_properties = function() {
	};

	/*

	proto.add_prototype = function(proto) {
		if(!this.has_prototype(proto)) {
			this._prototypes.push(proto);

			proto._on("prototype_added", this.$prototype_added);
			proto._on("prototype_removed", this.$prototype_removed);

			var self = this;
			_.forEach(proto.get_prototypes(), function(p) {
				if(!self.has_prototype(p)) {
					self.add_prototype(p);
				}
			});

			this._notify("prototype_added", {
				proto: proto
				, context: this
			});
		}
	};
	proto.remove_prototype = function(proto) {
		proto._off("prototype_added", this.$prototype_added);
		proto._off("prototype_removed", this.$prototype_removed);
		this._prototypes = _.without(this.prototypes, proto);
		this._notify("prototype_removed", {
			proto: proto
			, context: this
		});
	};

	proto.do_add_prototype = function(proto) {
	};

	proto.move_prototype = function(proto, to_index) {
		var from_index = _.indexOf(this._prototypes, proto);

		if(from_index >= 0) {
			_.set_index(this._prototypes, from_index, to_index);
		}
	};

	proto.prototype_added = function(event) {
		var proto = event.proto
			, context = event.context;
	};
	proto.prototype_removed = function(event) {
		var proto = event.proto
			, context = event.context;
	};
	proto.prototype_moved = function(event) {
	};
	*/




	proto.inherits_from = function() {
		var self = this;
		return _.all(arguments, function(arg) {
			return _.indexOf(self._all_prototypes, arg) >= 0;
		});
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
