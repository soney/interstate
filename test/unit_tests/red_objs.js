(function() {
var cjs = red.cjs;
var _ = cjs._;

module("OBJ");
test('Basic objs', function() {
	var o1 = cjs.create("red_stateful_obj");
	var ab_event = cjs.create_event("manual");
	o1.get_own_statechart()	.add_state("a")
							.add_state("b")
							.add_transition("a", "b", ab_event)
							.starts_at("a");
	var a_state = o1.get_own_statechart().get_state_with_name("a");
	var b_state = o1.get_own_statechart().get_state_with_name("b");
	o1.set_prop("x", cjs.create("red_stateful_prop"));
	var x_prop = o1.get_prop("x");
	x_prop.set_value(a_state, cjs.create("red_cell", {str: "1"}))
	x_prop.set_value(b_state, cjs.create("red_cell", {str: "2"}))
	o1.get_statechart().run();

	console.log(x_prop.get());
	equal(x_prop.get(), 1);
	/*
	ab_event.fire();
	equal(x_prop.get(), 2);

	var o2 = cjs.create("red_stateful_obj");
	o2.set_protos([o1]);
	o2.get_statechart().run();
	equal(o2.get_prop("x").get(), 1);
	x_prop.unset_value(a_state)
	x_prop.set_value(a_state, cjs.create("red_cell", {str: "3"}))

	equal(o2.get_prop("x").get(), 3);
	*/
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
	equal(z.get_prop("a").get(), 4);
	cell.set_str("b + x.b");
	x.set_prop("b", 1);
	y.set_prop("b", 2);
	z.set_prop("b", 3);
	equal(x.get_prop("a").get(), 2);
	equal(y.get_prop("a").get(), 3);
	equal(z.get_prop("a").get(), 4);
});
test('Obj inheritance 2', function() {
	var root = cjs.create("red_dict");
	var x = cjs.create("red_stateful_obj");
	root.set_prop("x", x);
	var y = cjs.create("red_stateful_obj");
	root.set_prop("y", y);

	var running = x.get_statechart().get_state_with_name("running.own");
	var xy_event = cjs.create_event("manual");
	running	.add_state("x_state")
			.add_state("y_state")
			.add_transition("x_state", "y_state", xy_event)
			.starts_at("x_state");
	x.get_statechart().run();

	var x_state = running.get_state_with_name("x_state");
	var y_state = running.get_state_with_name("y_state");

	var a = cjs.create("red_stateful_prop");
	x.set_prop("a", a);
	a.set_value(x_state, 1);
	a.set_value(y_state, 2);

	xy_event.fire();

	y.set_protos([x]);

	y.get_statechart().run();
	equal(y.get_prop("a").get(), 1);
	equal(x.get_prop("a").get(), 2);
});
}());

