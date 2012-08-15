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
	var a = cjs.create("red_stateful_obj");
	var b = cjs.create("red_stateful_obj");
	var c = cjs.create("red_stateful_obj");
	var d = cjs.create("red_stateful_obj");
	var e = cjs.create("red_stateful_obj");
	var f = cjs.create("red_stateful_obj");
	var g = cjs.create("red_stateful_obj");
	var h = cjs.create("red_stateful_obj");

	a.get_own_statechart().add_state("a");
	b.get_own_statechart().add_state("b");
	c.get_own_statechart().add_state("c");
	d.get_own_statechart().add_state("d");
	e.get_own_statechart().add_state("e");
	f.get_own_statechart().add_state("f");
	g.get_own_statechart().add_state("g");
	h.get_own_statechart().add_state("h");

	b.set_protos([a]);
	c.set_protos([a,b]);
	d.set_protos([c,b]);

	deepEqual(b.get_protos(), [a]);
	deepEqual(c.get_protos(), [a,b]);
	deepEqual(d.get_protos(), [c,a,b]);

	f.set_protos([e,d]);
	deepEqual(f.get_protos(), [e,d,c,a,b]);

	b.set_protos([]);
	deepEqual(c.get_protos(), [a,b]);
	c.set_protos([a]);
	deepEqual(c.get_protos(), [a]);

	d.set_protos([g,h]);
	deepEqual(f.get_protos(), [e,d,g,h]);
	d.set_protos([h,g]);
	deepEqual(f.get_protos(), [e,d,h,g]);
});

test('Properties', function() {
	var A = cjs.create("red_stateful_obj");
	var B = cjs.create("red_stateful_obj");
	var C = cjs.create("red_stateful_obj");
	var D = cjs.create("red_stateful_obj");
	var E = cjs.create("red_stateful_obj");
	var F = cjs.create("red_stateful_obj");
	var G = cjs.create("red_stateful_obj");
	var H = cjs.create("red_stateful_obj");

	A.get_own_statechart().add_state("a");
	B.get_own_statechart().add_state("b");
	C.get_own_statechart().add_state("c");
	D.get_own_statechart().add_state("d");
	E.get_own_statechart().add_state("e");
	F.get_own_statechart().add_state("f");
	G.get_own_statechart().add_state("g");
	H.get_own_statechart().add_state("h");

	A.set_prop("x");
	B.set_protos([A]);
	ok(B.has_prop("x"));
	A.set_prop("y");
	ok(B.has_prop("y"));

	B.set_protos([]);
	ok(!B.has_prop("x"));
	ok(!B.has_prop("y"));
});

}());
