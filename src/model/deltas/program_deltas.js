(function(red) {
var cjs = red.cjs, _ = red._;

red.ProgramDelta = function(options) {
	red.ProgramDelta.superclass.constructor.apply(this, arguments);
	if(options.root_pointer) {
		this.root = options.root_pointer.points_at(0);
	} else if(options.root){
		this.root = options.root;
	} else {
		console.error("Unknown option set", options);
	}
};


(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	proto.get_root = function() {
		return this.root;
	};
	red.register_serializable_type("program_delta",
									function(x) { 
										return x instanceof my;
									},
									function() {
										var serialized_root = red.serialize(this.root, true);
										return {
											root: serialized_root
										};
									},
									function(obj, options) {
										//var rest_args = _.rest(arguments);

										options = _.extend({
											used_start_transition: true
										}, options);

										var root = red.deserialize.apply(red, ([obj.root, options]).concat(_.rest(arguments,2)));
										return new my({
											root: root
										});
									});
}(red.ProgramDelta));

}(red));
