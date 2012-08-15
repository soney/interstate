(function() {
var cjs = red.cjs;
module("Parser");
test('Cell', function() {
	var c1 = cjs.create("red_cell", {str: "2"});
	equal(c1.get(), 2);
	c1.set_str("1");
	equal(c1.get(), 1);

	var c2 = cjs.create("red_cell", {str: "-1"});
	equal(c2.get(), -1);
	c2.set_str("1+(1+1)");
	equal(c2.get(), 3);

	var context3 = cjs.create("red_dict");
	var c3 = cjs.create("red_cell", {str: "a"});
	context3.set_prop("a", 1);
	context3.set_prop("c3", c3);
	equal(c3.get(), 1);
	context3.set_prop("a", 2);
	equal(c3.get(), 2);

	var context4 = cjs.create("red_dict");;
	context4.set_prop("x", 2);
	context3.set_prop("b", context4);
	var c4 = cjs.create("red_cell", {str: "b.x"});
	context3.set_prop("c4", c4);
	equal(c4.get(), 2);
	var context5 = cjs.create("red_dict");
	context5.set_prop("x", 3);
	context3.set_prop("b", context5);
	equal(c4.get(), 3);
});
}());
