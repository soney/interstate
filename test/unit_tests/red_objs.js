(function() {
var cjs = red.cjs;

module("OBJ");
test('Basic objs', function() {
	var o1 = new red.RedSkeleton();
	var ab_event = cjs.create_event("manual");
	o1.own_statechart	.add_state("a")
						.add_state("b")
						.add_transition("a", "b", ab_event)
						.starts_at("a");
	var a_state = o1.own_statechart.get_state_with_name("a");
	var b_state = o1.own_statechart.get_state_with_name("b");
	o1.set_direct_prop("x");
	var x_prop = o1._get_prop("x");
	x_prop.set(a_state, new red.RedCell("1", x_prop.get_context()))
	x_prop.set(b_state, new red.RedCell("2", x_prop.get_context()))
	o1.get_statechart().run();
	equal(x_prop.get(), 1);
	ab_event.fire();
	equal(x_prop.get(), 2);

	var o2 = new red.RedSkeleton();
	o2.set_direct_prototypes([o1]);
	o2.get_statechart().run();
	equal(o2._get_prop("x").get(), 1);
	x_prop.unset(a_state)
	x_prop.set(a_state, new red.RedCell("3", x_prop.get_context()))
	equal(o2._get_prop("x").get(), 3);
});
}());
