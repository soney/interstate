(function() {
var cjs = red.cjs;
var _ = cjs._;

module("OBJ");
test('Basic objs', function() {
	var o1 = cjs.create("red_stateful_obj");
	var inita_event = cjs.create_event("manual");
	var ab_event = cjs.create_event("manual");
	o1	.rename_state("INIT", "a")
		.add_state("b")
		.add_transition("a", "b", ab_event);
	inita_event.fire();
	var a_state = o1.find_state("a");
	var b_state = o1.find_state("b");
	o1.set_prop("x", cjs.create("red_stateful_prop"));
	var x_prop = o1.get_prop("x");
	x_prop.set_value(a_state, cjs.create("red_cell", {str: "1"}))
	x_prop.set_value(b_state, cjs.create("red_cell", {str: "2"}))
	o1.run();

	equal(o1.prop_val("x"), 1);
	ab_event.fire();
	equal(x_prop.get(), 2);

	var o2 = cjs.create("red_stateful_obj");

	o2.set_protos([o1]);
	o2.run();
	equal(o2.prop_val("x"), 1);
	/*
	x_prop.unset_value(a_state);
	x_prop.set_value(a_state, cjs.create("red_cell", {str: "3"}))

	equal(o2.prop_val("x"), 3);
	/**/
});
test('Obj inheritance 1', function() {
	var root = cjs.create("red_dict");
	var x = cjs.create("red_dict");
	var y = cjs.create("red_dict");
	var z = cjs.create("red_dict");
	root.set_prop("x", x);
	root.set_prop("y", y);
	root.set_prop("z", z);
	y.set_protos([x]);
	z.set_protos([y]);

	var cell = cjs.create("red_cell", {str: "4"});
	x.set_prop("a", cell);
	equal(z.prop_val("a"), 4);
	cell.set_str("b + x.b");
	x.set_prop("b", 1);
	y.set_prop("b", 2);
	z.set_prop("b", 3);
	equal(x.prop_val("a"), 2);
	equal(y.prop_val("a"), 3);
	equal(z.prop_val("a"), 4);
});
test('Obj inheritance 2', function() {
	var root = cjs.create("red_dict");
	var x = cjs.create("red_stateful_obj");
	root.set_prop("x", x);
	var y = cjs.create("red_stateful_obj");
	root.set_prop("y", y);

	var xy_event = cjs.create_event("manual");
	x	.rename_state("INIT", "x_state")
		.add_state("y_state")
		.add_transition("x_state", "y_state", xy_event);
	x.run();

	var x_state = x.find_state("x_state");
	var y_state = x.find_state("y_state");

	var a = cjs.create("red_stateful_prop");
	x.set_prop("a", a);
	a.set_value(x_state, 1);
	a.set_value(y_state, 2);

	xy_event.fire();

	y.set_protos([x]);

	y.run();
/*
	equal(y.prop_val("a"), 1);
	equal(x.prop_val("a"), 2);
	/**/
});
}());

