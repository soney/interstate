(function(red) {
var cjs = red.cjs, _ = cjs._;

var constraint_solver = cjs._constraint_solver;

var descriptors = {};

red._set_constraint_descriptor = function(obj, desc) {
	if(red.__debug) {
		var node = constraint_solver.getNode(obj);
		descriptors[node.id] = desc;
	}
};
red._get_constraint_descriptor = function(obj) {
	if(red.__debug) {
		var node = constraint_solver.getNode(obj);
		return descriptors[node.id];
	}
};
}(red));
