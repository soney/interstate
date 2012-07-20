(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var RedCell = function(str, parent) {
	this.str = str;
	this.tree = jsep(this.str, {
		keywords: ["true", "false", "this", "STAY"]
	});
};
(function(my) {
}(RedCell));

red.create_cell = function(str, parent) {
	return new RedCell(str, parent);
};

}(red));
