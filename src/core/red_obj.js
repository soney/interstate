(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var RedObject = function() {
	this._local_properties = cjs([]);
};
(function(my) {
	var proto = my.prototype;

	proto.set_fsm = function(fsm) {
		this._fsm = fsm;
	};
	proto.get_fsm = function() { return this._fsm; };

	proto.get_state = function() {
		var fsm = this.get_fsm();
		return fsm.get_state();
	};

	proto._create_prop = function(prop_name) {
		var prop = red._create_prop(this);
		return prop;
	};

	proto.add_state = function(state, index) {
	};

	proto.move_state = function(state, to_index) {
	};

	proto.remove_state = function(state) {
	};

}(RedObject));

red.create_object = function() {
	return new RedObject();
};

}(red));
