(function() {
var cjs = red.cjs;

module("OBJ Skeleton");

test('Shadow Statecharts', function() {
	var ab = cjs.create_event("manual");
	var bax = cjs.create_event("manual");
	var axcw = cjs.create_event("manual");
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
	sc.add_transition("A.x", "C.W", axcw);
	var last_transition = sc.get_last_transition();
	sc.remove_transition(last_transition);

	var sc1 = cjs.create("statechart");
	sc1.add_state("A.x");
	sc1.rename_state("A", "B");
	ok(!sc1.has_state("A"));
	ok(sc1.has_state("B"));
	ok(sc1.has_state("B.x"));
});

test('Prototypes', function() {
	var a = new red.RedSkeleton();
	var b = new red.RedSkeleton();
	var c = new red.RedSkeleton();
	var d = new red.RedSkeleton();
	var e = new red.RedSkeleton();
	var f = new red.RedSkeleton();
	var g = new red.RedSkeleton();
	var h = new red.RedSkeleton();

	a.own_statechart.add_state("a");
	b.own_statechart.add_state("b");
	c.own_statechart.add_state("c");
	d.own_statechart.add_state("d");
	e.own_statechart.add_state("e");
	f.own_statechart.add_state("f");
	g.own_statechart.add_state("g");
	h.own_statechart.add_state("h");


	b.set_direct_prototypes([a]);
	c.set_direct_prototypes([a,b]);
	d.set_direct_prototypes([c,b]);

	deepEqual(b.get_all_prototypes(), [a]);
	deepEqual(c.get_all_prototypes(), [a,b]);
	deepEqual(d.get_all_prototypes(), [c,a,b]);

	f.set_direct_prototypes([e,d]);
	deepEqual(f.get_all_prototypes(), [e,d,c,a,b]);

	console.log(f.get_statechart().stringify());

	b.set_direct_prototypes([]);
	deepEqual(c.get_all_prototypes(), [a,b]);
	c.set_direct_prototypes([a]);
	deepEqual(c.get_all_prototypes(), [a]);

	d.set_direct_prototypes([g,h]);
	deepEqual(f.get_all_prototypes(), [e,d,g,h]);
	d.set_direct_prototypes([h,g]);
	deepEqual(f.get_all_prototypes(), [e,d,h,g]);

	console.log(f.get_statechart().stringify());
});

}());
