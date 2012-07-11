(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var RedStatechart = function() {
	this.states = {};
	this._starts_at = undefined;
	this._parent = undefined;
	this._concurrent = false;
};
(function(my) {
	var proto = my.prototype;
	proto.add_state = function(state_name) {
		var state = this.states[state_name] = new RedStatechart();
		state.set_parent(this);
		return this;
	};
	proto.in_state = function(state_name) {
		return this.get_state_with_name(state_name);
	};
	proto.starts_at = function(state_name) {
		this._starts_at = state_name;
		return this;
	};
	proto.get_initial_state = function() {
		return this.get_state_with_name(this._starts_at);
	};
	proto.parent = function() {
		return this._parent;
	};
	proto.set_parent = function(parent) {
		this._parent = parent;
		return this;
	};
	proto.get_state_with_name = function(state_name) {
		return this.states[state_name];
	};
	proto.concurrent = function(is_concurrent) {
		this._concurrent = is_concurrent;
		return this;
	};
	proto.is_concurrent = function() {
		return this._concurrent;
	};
}(RedStatechart));

red.create_statechart = function() {
	return new RedStatechart();
};

}(red));
