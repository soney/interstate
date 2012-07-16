(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var RedProperty = function(parent) {
	this._parent = parent;
	this._value = cjs(_.bind(this.do_get, this));
	this._state_map = red._create_map();
};
(function(my) {
	var proto = my.prototype;
	proto.parent = function() {
		return this._parent;
	};

	proto.get = function() {
		return this._value.get();
	};

	proto.do_get = function() {
		var parent = this.parent();
		var parent_state = parent.get_state();
		var initial_state = _.first(parent_state);
		var value = this._state_map.get(initial_state);
		return value;
	};

	proto.set_value = function(state, value) {
		this._state_map.set(state, value);
	};

	proto.remove_state = function(state) {
		this._state_map.unset(state);
	};
}(RedProperty));

red._create_prop = function(parent) {
	return new RedProperty(parent);
};

}(red));
