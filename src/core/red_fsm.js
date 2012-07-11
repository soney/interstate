(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var RedFSM = function() {
	this.fsm = cjs.fsm();
};
(function(my) {
	var proto = my.prototype;
	proto.add_state = function(state_name) {
		return this.fsm.add_state(state_name);
	};
}(RedFSM));

red.create_fsm = function() {
	return new RedFSM();
};

}(red));
