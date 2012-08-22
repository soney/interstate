(function() {
var cjs = red.cjs;
var _ = cjs._;

module("Groups");
test('Counted groups', function() {
	var d1 = cjs.create("red_dict");
	d1.set_prop("x", cjs.create("red_cell", {str: "basis + 1"}));
	var g1 = cjs.create("red_group");
	g1.set_protos(d1);
	g1.set_basis(cjs(1));

	var val = g1.get();
	ok(val.length === 1);
	g1.set_basis(cjs(2));
	val = g1.get();
	ok(val.length === 2);
	equal(val[0].get_prop("basis"), 0);
	equal(val[1].get_prop("basis"), 1);
	equal(val[1].get_prop("x").get(), 2);
});
}());

