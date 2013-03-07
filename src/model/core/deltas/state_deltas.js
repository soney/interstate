(function(red) {
var cjs = red.cjs, _ = red._;

red.StateDelta = function(options) {
	red.StateDelta.superclass.constructor.apply(this, arguments);
};


(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	red.register_serializable_type("state_delta",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
										};
									},
									function(obj) {
										return new my({
										});
									});
}(red.StateDelta));

}(red));
