(function() {
var cjs = red.cjs;

module("OBJ Skeleton");

test('Shadow Statecharts', function() {
	expect(0);
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

	b.set_direct_prototypes([a]);
	c.set_direct_prototypes([a,b]);
	d.set_direct_prototypes([c,b]);

	deepEqual(b.get_all_prototypes(), [a]);
	deepEqual(c.get_all_prototypes(), [a,b]);
	deepEqual(d.get_all_prototypes(), [c,a,b]);

	f.set_direct_prototypes([e,d]);
	deepEqual(f.get_all_prototypes(), [e,d,c,a,b]);
	b.set_direct_prototypes([]);
	deepEqual(c.get_all_prototypes(), [a,b]);
	c.set_direct_prototypes([a]);
	deepEqual(c.get_all_prototypes(), [a]);

	d.set_direct_prototypes([g,h]);
	deepEqual(f.get_all_prototypes(), [e,d,g,h]);
	d.set_direct_prototypes([h,g]);
	deepEqual(f.get_all_prototypes(), [e,d,h,g]);
});

}());
