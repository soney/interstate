(function(red) {
var cjs = red.cjs, _ = cjs._;
var esprima = window.esprima;

var RedCell = function(str, parent) {
	this.set_str(str);
};
(function(my) {
	var proto = my.prototype;
	proto.set_str = function(str) {
		this._str = str;
		this._update_tree();
		this._update_value();
		return this;
	};
	proto.get_str = function() { return this._str; };

	proto._update_tree = function() {
		this._tree = esprima.parse(this.get_str());
	};

	proto._update_value = function() {
		console.log(this._tree);
	};
}(RedCell));

red.create_cell = function(str, parent) {
	return new RedCell(str, parent);
};

}(red));
