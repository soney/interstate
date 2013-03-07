(function(red) {
var cjs = red.cjs, _ = red._;

red.ProgramDelta = function(options) {
	red.ProgramDelta.superclass.constructor.apply(this, arguments);
	this.str = options.str;
};


(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	proto.get_str = function() {
		return this.str;
	};
	red.register_serializable_type("program_delta",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											str: this.str
										};
									},
									function(obj) {
										return new my({
											str: info.str
										});
									});
}(red.ProgramDelta));

}(red));
