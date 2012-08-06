(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedSkeleton = function() {
	this._direct_prototypes = [];
	this._all_prototypes = [];
	this._statechart = cjs.create("statechart");
	this._properties = cjs.create("map");
	this.initialize_statechart();
	this._listeners = {};
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

		this.running_statechart = cjs	.create("statechart")
										.concurrent(true)
										.add_state("own", this.own_statechart);

		statechart	.add_state("running", this.running_statechart)
					.add_transition("INIT", "running", cjs.create_event("on_enter", init_state))
					.add_transition("running", "INIT", reset_event);
	};

	proto._create_prop = function(prop_name) {
		var prop = new RedProperty(this);
		return prop;
	};
	proto.add_prop = function(prop_name) {
		var prop = this._create_prop();
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
	proto.get_direct_prototypes = function() {
	};
	proto.set_direct_prototypes = function(new_protos) {
		this._direct_prototypes = new_protos;

		var old_all_prototypes = this._all_prototypes;
		this._all_prototypes = this.get_all_prototypes();

		var diff = _.diff(old_all_prototypes, this._all_prototypes);
		console.log(old_all_prototypes, this._all_prototypes, diff);
		var self = this;
		_.forEach(diff.removed, function(removed) {
			var item = removed.item
				, index = removed.index;
			item.destroy(self);
		});
		_.forEach(diff.added, function(added) {
			var item = added.item
				, index = added.index;
			item.initialize(self);
		});
		_.forEach(diff.moved, function(moved) {
		});
	};
	proto.get_all_prototypes = function() {
		return this._all_prototypes;
	};
	proto.initialize = function(self) {};
	proto.destroy = function(self) {};

	proto.get_all_prototypes = function() {
		return _.uniq(_.flatten(_.map(this._direct_prototypes, function(p) {
			return ([p]).concat(p.get_all_prototypes());
		})));
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




	proto.inherits_from = function(proto) {
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
