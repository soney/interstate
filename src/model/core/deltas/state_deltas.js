(function(red) {
var cjs = red.cjs, _ = red._;

red.CurrentStateDelta = function(options) {
	red.CurrentStateDelta.superclass.constructor.apply(this, arguments);
	this.state_info = options.state_info;
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
											state_info: this.state_info
										};
									},
									function(obj) {
										return new my({
											state_info: obj.state_info
										});
									});
}(red.CurrentStateDelta));


red.TransitionFiredDelta = function(options) {
	red.TransitionFiredDelta.superclass.constructor.apply(this, arguments);
};

(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	red.register_serializable_type("transition_fired_delta",
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
}(red.TransitionFiredDelta));

}(red));
