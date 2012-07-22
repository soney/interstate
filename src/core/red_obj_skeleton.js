(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedSkeleton = function() {
	this._properties = red._create_map();
};
(function(my) {
	var proto = my.prototype;

	proto.set_statechart = function(statechart) {
		this._statechart = statechart;
		return this;
	};
	proto.get_statechart = function() { return this._statechart; };

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
}(RedSkeleton));

var RedProperty = function(parent) {
	this._parent = parent;
	this._state_map = red._create_map();
};
(function(my) {
	var proto = my.prototype;
	proto.up = proto.parent = function() {
		return this._parent;
	};

	proto.get = function() {
		return this.do_get();
	};

	proto.do_get = function() {
		var parent = this.parent();
		var parent_statechart = parent.get_statechart();
		var parent_state = parent_statechart.get_state();
		var initial_state = _.first(parent_state);
		var value = this._state_map.get(initial_state);
		return cjs.get(value);
	};

	proto.set_value = function(state, value) {
		this._state_map.set(state, value);
		return this;
	};

	proto.unset_value = function(state) {
		this._state_map.unset(state);
		return this;
	};
}(RedProperty));

red.RedSkeleton = RedSkeleton;

}(red));
