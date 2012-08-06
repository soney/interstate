(function() {
var cjs = red.cjs;

module("OBJ Skeleton");

test('Shadow Statecharts', function() {
	expect(0);
	var ab = cjs.create_event("manual");
	var bax = cjs.create_event("manual");
	var sc = cjs.create("statechart")
				.add_state("A")
				.add_state("A.x")
				.add_state("B")
				.starts_at("B")
				.add_transition("A", "B", ab)
				.add_transition("B", "A.x", bax);
	var shadow = red._shadow_statechart(sc);

	sc.add_state("B.y");
	sc.add_state("C.W.Z");

	sc.remove_state("C.W.Z");

	console.log(sc.stringify());
	console.log(shadow.stringify());
});

}());
