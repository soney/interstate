(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var RedObject = function() {
	this._local_properties = cjs([]);
};
(function(my) {
	var proto = my.prototype;

	proto.set_statechart = function(statechart) {
		this._statechart = statechart;
	};
	proto.get_statechart = function() { return this._statechart; };

	proto.get_state = function() {
		var statechart = this.get_statechart();
		return statechart.get_state();
	};

	proto._create_prop = function(prop_name) {
		var prop = red._create_prop(this);
		return prop;
	};

	proto.add_state = function(state, index) {
		var statechart = this.get_statechart();
		this.statechart.add_state(state, index);
		return this;
	};

	proto.move_state = function(state, to_index) {
		var statechart = this.get_statechart();
		this.statechart.move_state(state, to_index);
		return this;
	};

	proto.remove_state = function(state) {
		var statechart = this.get_statechart();
		this.statechart.remove_state(state);
		return this;
	};

}(RedObject));

red.create_object = function() {
	return new RedObject();
};

}(red));
