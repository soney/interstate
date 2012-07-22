(function(red) {
var cjs = red.cjs, _ = cjs._;

var stay = "STAY"
red.parse_cell = function(cell_str) {
	var tree = jsep(cell_str, {
		keywords: ["true", "false", "this", "STAY"]
	});
	return tree;
};
}(red));
