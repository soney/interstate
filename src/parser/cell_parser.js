(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var stay = "STAY"
red.parse_cell = function(cell_str) {
	var tree = jsep(cell_str);
	return tree;
};
}(red));
