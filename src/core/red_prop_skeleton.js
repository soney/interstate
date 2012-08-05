(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedProperty = function(parent) {
	this._parent = parent;
	//this._value = cjs.create("fsm_constraint");
	this._values = cjs.create("map");
	this._prototypes = [this];
	this._listeners = [];
};
(function(my) {
	var proto = my.prototype;
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
	proto.add_prototype = function(proto_obj, index) {
		if(!_.isNumber(index) || index < 0 || index > this._prototypes.length) {
			index = this._prototypes.length;
		}
		index++;
		_.insertAt(this._prototypes, proto_obj, index);

		var missing_states = _.difference(proto_obj._states(), this._states());

		_.forEach(missing_states, function(missing_state) {
			this._value.set(missing_state, []);
		});

		var self = this;
		this._values.forEach(function(value, state)  {
			_.insertAt(value, state, index);
			self.update_state_value(state);
		});

		proto_obj._add_listener(this);

		return this;
	};
	proto.remove_prototype = function(proto_obj) {
		var index = _.indexOf(this._prototypes, proto_obj);

		if(index >= 0) {
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
		}

		proto_obj._remove_listener(this);

		return this;
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

	proto._notify = function() {
		var func = arguments[0];
		var args = _.rest(arguments);

		_.foreach(this._listeners, function(listener) {
			listener[func].apply(this, args);
		});
	};
	proto.update_state_value = function(state) {
		var v = this._values.get(state);
		var do_clone = !!v[0];
		var values = _.compact(v);
		var new_value = _.first(value);
		var old_value = this._value.get(state);
		if(old_value !== new_value) {
			if(do_clone) {
				new_value = new_value.clone();
			}
			this._values.set(state, new_value);
		}
	};
	proto._states = function() {
		return this._values.keys();
	};
	proto._add_listener = function(listener) {
		this._listeners.push(listener);
	};
	proto._remove_listener = function(listener) {
		_.remove(this._listeners, listener);
	};
	proto.my_version_of_state = function(state) {
		var parent = this.parent();
		return parent.my_version_of_state(state);
	};
	/*

	proto.do_get = function() {
		var parent = this.parent();
		var parent_statechart = parent.get_statechart();
		var parent_state = parent_statechart.get_state();
		var initial_state = _.first(parent_state);
		var cell = this._state_map.get(initial_state);
		return cell.get();
	};

	proto.set_value = function(state, value) {
		state.on_enter(_.bind(function() {
			this.do_set(value);
		}, this));
		this._state_map.set(state, value);
		return this;
	};

	proto.unset_value = function(state) {
		this._state_map.unset(state);
		return this;
	};

	proto.do_set = function(value) {
		this._value = value;
	};
	*/
}(RedProperty));

red.RedProperty = RedProperty;

}(red));
