(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var RedProperty = function() {
};
(function(my) {
	var proto = my.prototype;

}(RedProperty));

//---------------------------

var RedObject = function() {
	this.properties = cjs([]);
};
(function(my) {
	var proto = my.prototype;

	proto.set_fsm = function(fsm) {
		this.fsm = fsm;
	};


}(RedObject));

red.create_object = function() {
	return new RedObject();
};

}(red));
