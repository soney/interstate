(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedProperty = function(parent) {
	this._parent = parent;
	var root_statechart = this.get_root_statechart();
	this._value = cjs.create("statechart_constraint", root_statechart);
	this._values = cjs.create("map");
	this._prototypes = [this];
	this._listeners = {};
	this._context = red .create_context({parent: parent.get_context(), thisable: false})
						.set_prop("event", root_statechart._event);
	this.$on_value_set = _.bind(this.on_value_set, this);
	this.$on_value_unset = _.bind(this.on_value_unset, this);
	this._on("on_value_set", this.$on_value_set);
	this._on("on_value_unset", this.$on_value_unset);
};
(function(my) {
	var proto = my.prototype;
	proto.get_context = function() { return this._context; };
	proto.up = proto.parent = function() {
		return this._parent;
	};

	proto.get = function() {
		return this._value.get();
	};

	proto.set = function(state, value) {
		this._notify("on_value_set", this, state, value);
		return this;
	};
	proto.unset = function(state) {
		this._notify("on_value_unset", this, state);
		return this;
	};
	proto.on_value_set = function(obj, nonlocalized_state, value) {
		var state = this.my_version_of_state(nonlocalized_state);
		var proto_index = _.indexOf(this._prototypes, obj);
		if(proto_index >= 0) {
			var v = this._values.get(state);
			if(!_.isArray(v)) {
				v = [];
				this._values.set(state, v);
			}
			v[proto_index] = value;
			this.update_state_value(state);
		}
	};
	proto.on_value_unset = function(obj, nonlocalized_state) {
		var state = this.my_version_of_state(nonlocalized_state);
		var proto_index = _.indexOf(this._prototypes, obj);
		if(proto_index >= 0) {
			var v = this._values.get(state);
			delete v[proto_index];
			this.update_state_value(state);
		}
	};
	proto.get_prototypes = function() {
		return _.rest(this._prototypes);
	};
	proto.add_prototype = function(proto_obj, index) {
		if(!_.isNumber(index) || index < 0 || index > this._prototypes.length) {
			index = this._prototypes.length;
		}
		index++;
		_.insert_at(this._prototypes, proto_obj, index);

		var self = this;
		var proto_states = proto_obj._states();
		_.forEach(proto_states, function(proto_state) {
			var my_equivalent = self.my_version_of_state(proto_state);
			var value;
			if(self._values.has_key(my_equivalent)) {
				value = self._values.get(my_equivalent);
			} else {
				value = [];
				self._values.set(my_equivalent, value);
			}
			_.insert_at(value, proto_obj.get_value_for_state(proto_state), index);
			console.log(proto_obj, proto_state, proto_obj.get_value_for_state(proto_state));
		});

		proto_obj._on("on_value_set", this.$on_value_set);
		proto_obj._on("on_value_unset", this.$on_value_unset);

		return this;
	};
	proto.remove_prototype = function(proto_obj) {
		var index = _.indexOf(this._prototypes, proto_obj);
		if(index >= 0) {
			this.remove_prototype_at_index(index);
		}
		return this;
	};
	proto.remove_prototype_at_index = function(index) {
		var proto_obj = this._prototypes[index];
		_.remove_index(this._prototypes, index);
		var to_remove_states = [];
		var self = this;
		this._values.forEach(function(value, state)  {
			_.remove_index(value, index+1);
			self.update_state_value(state);
			if(_.isEmpty(_.compact(value))) {
				to_remove_states.push(state);
			}
		});
		_.forEach(to_remove_states, function(state) {
			this._values.unset(state);
		});
		if(proto_obj) {
			proto_obj._off("on_value_set", this.$on_value_set);
			proto_obj._off("on_value_unset", this.$on_value_unset);
		}
	};
	proto.move_prototype = function(proto_obj, to_index) {
		var from_index = _.indexOf(this._prototypes, proto_obj);
		if(index >= 0) {
			to_index++;
			_.move_index(this._prototypes, from_index, to_index);
			this._values.forEach(function(value, state)  {
				_.move_index(value, index);
			});
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
	proto._notify = function(event_type) {
		var listeners = this._listeners[event_type];
		var args = _.rest(arguments);

		_.forEach(listeners, function(listener) {
			listener.apply(this, args);
		});
	};
	proto.update_state_value = function(state) {
		var v = this._values.get(state);
		var do_clone = !v[0];
		var values = _.compact(v);
		var new_value = _.first(values);
		var old_value = this._value.get_value_for_state(state);
		if(old_value !== new_value) {
			if(do_clone) {
				new_value = new_value.clone(this.get_context());
			}
			this._value.set_value_for_state(state, new_value);
		}
	};
	proto.get_value_for_state = function(state) {
		return this._value.get_value_for_state(state);
	};
	proto._states = function() {
		return this._values.get_keys();
	};
	proto.my_version_of_state = function(state) {
		var parent = this.parent();
		return parent.get_state_shadow(state);
	};
	proto.get_root_statechart = function() {
		var parent = this.parent();
		return parent.get_statechart();
	};
}(RedProperty));

red.RedProperty = RedProperty;

}(red));
