(function(ist) {
	var tests = [
		{
			name: "Dynamic Events",
			expect: 2,
			create_builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("on", ist.on_event)
						.set("obj", "<stateful>")
						.cd("obj")
							.add_state("INIT")
							.start_at("INIT")
							.add_state("active")
							.add_transition("INIT", "active", "on(my_event)")
							.set("my_event", "(start)", "'ev1'")
							.set("my_state")
							.set("my_state", "INIT", "'INIT'")
							.set("my_state", "active", "'active'")
							;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("my_state"), "INIT");
					env.set("my_event", "(start)", "'ev2'");
					ist.emit("ev2");
					equal(cobj.prop_val("my_state"), "active");
				}
			}]
		},
		{
			name: "Dynamic Events with Inherited Properties",
			expect: 2,
			create_builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("on", ist.on_event)
						.set("proto_obj", "<stateful>")
						.cd("proto_obj")
							.set("my_event", "(start)", "'ev1'")
							.up()
						.set("obj", "<stateful>")
						.cd("obj")
							.add_state("INIT")
							.start_at("INIT")
							.add_state("active")
							.add_transition("INIT", "active", "on(my_event)")
							.set("(prototypes)", "(start)", "proto_obj")
							.set("my_state")
							.set("my_state", "INIT", "'INIT'")
							.set("my_state", "active", "'active'")
							;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("my_state"), "INIT");

					env		.up()
						.cd("proto_obj")
							.set("my_event", "(start)", "'ev2'");

					ist.emit("ev2");
					equal(cobj.prop_val("my_state"), "active");
					cobj = null;
				}
			}]
		},
		{
			name: "Property Basics",
			expect: 4,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.set("a", "(start)", "10")
							.add_state("INIT")
							.start_at("INIT")
							.set("x")
							.set("y")
							.set("x", "(start)", "1")
							.set("x", "INIT", "x+1")
							.set("y", "INIT", "3")
							.set("z", "(start)", "4")
							;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("a"), 10);
					ok(cobj.prop_val("x") >= 2);
					equal(cobj.prop_val("y"), 3);
					equal(cobj.prop_val("z"), 4);
				}
			}]
		},
		{
			name: "Object Ordering",
			expect: 6,
			steps: [{
				setup: function(env) {
					env	.cd("screen")
							.set("circ1", "<stateful>")
							.cd("circ1")
								.set("(prototypes)", "(start)", "shape.circle")
								.set("fill", "(start)", "'red'")
								.set("cx", "(start)", "80")
								.set("cy", "(start)", "80")
								.up()
							.set("circ2", "<stateful>")
							.cd("circ2")
								.set("(prototypes)", "(start)", "shape.circle")
								.set("fill", "(start)", "'blue'")
								.set("cx", "(start)", "100")
								.set("cy", "(start)", "100")
								.up()
								;
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					equal(circles.eq(0).attr("fill"), "#0000ff");
					equal(circles.eq(1).attr("fill"), "#ff0000");
				}
			}, {
				setup: function(env) {
					env.move("circ1", 1);
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					equal(circles.eq(0).attr("fill"), "#ff0000");
					equal(circles.eq(1).attr("fill"), "#0000ff");
				}
			}, {
				setup: function(env) {
					env.move("circ1", 0);
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					equal(circles.eq(0).attr("fill"), "#0000ff");
					equal(circles.eq(1).attr("fill"), "#ff0000");
				}
			}]
		},
		{
			name: "Groups",
			expect: 2,
			steps: [{
				setup: function(env) {
					env	.cd("screen")
						.set("compound1", "<stateful>")
							.cd("compound1")
								.set("(prototypes)", "(start)", "shape.group")
								.set("circ1", "<stateful>")
								.cd("circ1")
									.set("(prototypes)", "(start)", "shape.circle")
									.set("fill", "(start)", "'red'")
									.set("cx", "(start)", "80")
									.set("cy", "(start)", "80")
									.up()
								.set("circ2", "<stateful>")
								.cd("circ2")
									.set("(prototypes)", "(start)", "shape.circle")
									.set("fill", "(start)", "'blue'")
									.set("cx", "(start)", "100")
									.set("cy", "(start)", "100")
									.up()
									;
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					equal(circles.eq(0).attr("fill"), "#0000ff");
					equal(circles.eq(1).attr("fill"), "#ff0000");
				}
			}]
		},
		{
			name: "Incrementing Properties",
			expect: 3,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.add_state("INIT")
							.start_at("INIT")
							.add_transition("INIT", "INIT", "on('my_fire')")
							.set("x")
							.set("x", "(start)", "1")
							.set("x", "INIT-0>INIT", "x+1")
							;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 1);
					ist.emit("my_fire");
					equal(cobj.prop_val("x"), 2);
					ist.emit("my_fire");
					equal(cobj.prop_val("x"), 3);
				}
			}]
		},
		{
			name: "Start Property Value",
			expect: 6,
			steps: [{
				setup: function(env) {
					env	.cd("screen")
							.set("obj", "<stateful>")
							.cd("obj")
								.set("(prototypes)", "(start)", "shape.rect")
								.set("fill", "(start)", "'#00ff00'")
								.add_state("state1")
								.add_state("state2")
								.start_at("state1")
								.add_transition("state1", "state2", "on('my_event')")
								.set("x", "state1", "3")
								.set("x", "state2", "6")
								.set("y", "(start)", "33")
								;

				},
				test: function(env, runtime) {
					ist.emit('my_event')
					var rect = $("rect", runtime);
					equal(rect.attr("fill"), "#00ff00");
					equal(rect.attr("x"), "6");
					equal(rect.attr("y"), "33");
				}
			}, {
				setup: function(env) {
					env.reset();
				},
				test: function(env, runtime) {
					var rect = $("rect", runtime);
					equal(rect.attr("fill"), "#00ff00");
					equal(rect.attr("x"), "3");
					equal(rect.attr("y"), "33");
				}
			}]
		},
		{
			name: "Property and State Transitions",
			expect: 6,
			steps: [{
				setup: function(env) {
					env	.cd("screen")
							.set("obj", "<stateful>")
							.cd("obj")
								.set("(prototypes)", "(start)", "shape.ellipse")
								.set("fill", "(start)", "'#bada55'")
								.add_state("state1")
								.add_state("state2")
								.start_at("state1")
								.add_transition("state1", "state2", "on('e1')")
								.add_transition("state2", "state1", "on('e2')")
								.set("cx", "(start)", "1")
								.set("cx", "state2", "3")
								.set("cx", "state1->state2", "4")
								.set("cx", "state2->state1", "5")
								;
				},
				test: function(env, runtime) {
					var ellipse = $("ellipse", runtime);
					equal(ellipse.attr("fill"), "#bada55");
					equal(ellipse.attr("cx"), "1");
					ist.emit('e1');
					equal(ellipse.attr("cx"), "3");
					ist.emit('e2');
					equal(ellipse.attr("cx"), "5");
					ist.emit('e1');
					equal(ellipse.attr("cx"), "3");
					env.reset();
					equal(ellipse.attr("cx"), "1");
				}
			}]
		},
		{
			name: "Dragging Example",
			expect: 8,
			steps: [{
				setup: function(env) {
					env	.set("mouse", "<stateful>")
						.cd("mouse")
							.set("x", "0")
							.set("y", "0")
							.up()
						.cd("screen")
							.set("obj", "<stateful>")
							.cd("obj")
								.add_state("init")
								.add_state("dragging")
								.add_transition("init", "dragging", "on('drag')")
								.add_transition("dragging", "init", "on('stop')")
								.start_at("init")
								.set("(prototypes)", "(start)", "shape.rect")
								.set("hx")
								.set("hy")
								.set("x")
								.set("y")
								.set("fill")
								.set("fill", "(start)", "'#bada55'")
								.set("x", "(start)", "20")
								.set("x", "dragging->init", "x")
								.set("x", "dragging", "mouse.x - hx")
								.set("y", "(start)", "20")
								.set("y", "dragging->init", "y")
								.set("y", "dragging", "mouse.y - hy")
								.set("hx", "init->dragging", "mouse.x - x")
								.set("hy", "init->dragging", "mouse.y - y")
								;

				},
				test: function(env, runtime) {
					var rect = $("rect", runtime);
					equal(rect.attr("x"), "20");
					env	.top()
						.cd("mouse")
							.set("x", "45")
							.set("y", "45")
							;
					equal(rect.attr("x"), "20");
					ist.emit('drag'); // hx = mouse.x - x = 45 - 20 = 25
					equal(rect.attr("x"), "20"); // x = mouse.x - hx = 45 - 25 = 20
					env.set("x", "40"); // mouse.x = 40
					equal(rect.attr("x"), "15"); // x = mouse.x - hx = 40 - 25 = 20
					ist.emit('stop');
					equal(rect.attr("x"), "15"); // stay
					env.set("x", "30"); // mouse.x = 30
					equal(rect.attr("x"), "15"); // stay
					env.set("x", "20"); // mouse.x = 20
					ist.emit('drag'); // hx = mouse.x - x = 20 - 15 = 5
					equal(rect.attr("x"), "15"); // x = mouse.x - hx = 20 - 5 = 15
					env.set("x", "22"); // mouse.x = 20
					equal(rect.attr("x"), "17"); // x = mouse.x - hx = 22 - 5 = 17
				}
			}]
		},
		{
			name: "Auto Create Contextual Objects",
			expect: 2,
			create_builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("on", ist.on_event)
						.set("obj", "<stateful>")
						.cd("obj")
							.add_state("INIT")
							.start_at("INIT")
							.add_transition("INIT", "INIT", "on('my_fire')")
							.set("x")
							.set("x", "(start)", "1")
							.set("x", "INIT-0>INIT", "x+1")
							;
				},
				test: function(env, runtime) {
					ist.emit("my_fire");
					//debugger;
					ist.update_current_contextual_objects(env.get_root());
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 2);
					ist.emit("my_fire");
					equal(cobj.prop_val("x"), 3);
				}
			}]
		},
		{
			name: "Transition Prop Values",
			expect: 4,
			create_builtins: true,
			steps: [{
				setup: function(env) {
					env	
						.cd("screen")
							.set("obj", "<stateful>")
							.cd("obj")
								.add_state("s1")
								.add_state("s2")
								.add_transition("s1", "s2", "on('e1')")
								.add_transition("s2", "s1", "on('e2')")
								.start_at("s1")
								.set("(prototypes)", "(start)", "shape.rect")
								.set("width")
								.set("tv1")
								.set("tv2")
								.set("x")
								.set("tv1", "s1->s2", "1")
								.set("tv2", "s1->s2", "width + x + tv1 + 3")
								.set("width", "(start)", "10")
								.set("width", "s2", "tv2 + 1")
								.set("x", "(start)", "-10")
								.set("x", "s2", "tv2 + 1")
								;
				},
				test: function(env, runtime) {
					
					// OBJ		(start)		s1				->									s2
					// width:	10																tv2 + 1 = 4+1 = 5 = 4+1 = 5
					// tv1:									1
					// tv2:									width+x+tv1+3 = 10-10+1+3 = 4
					// x:		-10																tv2 + 1 = 4+1 = 5
					
					var rect = $("rect", runtime);
					equal(rect.attr("x"), "-10");
					equal(rect.attr("width"), "10");
					//window.dbg = true;
					//env.print();
					//debugger;
					ist.emit('e1');
					equal(rect.attr("x"), "5");
					equal(rect.attr("width"), "5");
					//env.print();
				}
			}]
		},
		{
			name: "KEEP",
			expect: 7,
			create_builtins: true,
			steps: [{
				setup: function(env) {
					env	.set("on", ist.on_event)
						.set("obj", "<stateful>")
						.cd("obj")
							.add_state("s1")
							.start_at("s1")
							.add_state("s2")
							.add_transition("s1", "s2", "on('e1')")
							.add_transition("s2", "s1", "on('e2')")
							.set("prop1")
							.set("prop1", "(start)", "100")
							.set("prop1", "s1->s2", "prop2")
							.set("prop2")
							.set("prop2", "(start)", "210")
							.set("prop2", "s2->s1", "prop2")
							.set("prop2", "s2", "prop3")
							.set("prop3")
							.set("prop3", "s2", "320")
							.set("prop3", "s2->s1", "310")
							;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("prop1"), 100);
					ist.emit("e1");
					equal(cobj.prop_val("prop1"), 210);
					equal(cobj.prop_val("prop2"), 320);
					equal(cobj.prop_val("prop3"), 320);
					ist.emit("e2");
					equal(cobj.prop_val("prop1"), 210);
					equal(cobj.prop_val("prop2"), 320);
					equal(cobj.prop_val("prop3"), 310);
				}
			}]
		},
		{
			name: "Copies",
			expect: 1,
			create_builtins: true,
			steps: [{
				setup: function(env) {
					env	.cd("screen")
							.set("my_shape", "<stateful>")
							.cd("my_shape")
								.set("(prototypes)", "(start)", "shape.circle")
								.set_copies("3")
								.set("cx", "(start)", "copy_num * 30")
								.up()
							;
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					equal(circles.size(), 3);
					//env.print();
				}
			}]
		},
		{
			name: "Inherited Start Property Values",
			expect: 1,
			create_builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("a", "<stateful>")
						.cd("a")
							.set("prop_0")
							.set("prop_0", "(start)", "'a0'")
							.up()
						.set("b", "<stateful>")
						.cd("b")
							.set("(prototypes)", "(start)", "a")
							.inherit("prop_0")
							.set("prop_0", "(start)", "'b0'")
							;
				},
				test: function(env, runtime) {
					//env.print();
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("prop_0"), "b0");
				}
			}]
		},
		{
			name: "Copies & Groups",
			expect: 12,
			create_builtins: true,
			steps: [{
				setup: function(env, runtime) {
					env	.cd("screen")
							.set("compound1", "<stateful>")
							.cd("compound1")
								.set_copies("['#ff0000', '#0000ff']")
								.set("(prototypes)", "(start)", "shape.group")
								.add_state("init")
								.add_state("clicked")
								.add_transition("init", "clicked", "on('click', this)")
								.add_transition("clicked", "init", "on('click', this)")
								.start_at("init")
								.set("group_fill", "init", "my_copy")
								.set("group_fill", "clicked", "'#00ff00'")
								.set("circ1", "<stateful>")
								.cd("circ1")
									.set("(prototypes)", "(start)", "shape.circle")
									.set("fill", "(start)", "group_fill")
									.set("cx", "(start)", "80*copy_num")
									.set("cy", "(start)", "80*copy_num")
									.up()
								.set("circ2", "<stateful>")
								.cd("circ2")
									.set("(prototypes)", "(start)", "shape.rect")
									.set("fill", "(start)", "group_fill")
									.set("x", "(start)", "100*copy_num")
									.set("y", "(start)", "100*copy_num")
									.up();
				},
				test: function(env, runtime) {
					//env.print();
					var circles = $("circle", runtime);
					var rects = $("rect", runtime);

					equal(circles.eq(0).attr("fill"), "#ff0000");
					equal(circles.eq(1).attr("fill"), "#0000ff");
					equal(rects.eq(0).attr("fill"), "#ff0000");
					equal(rects.eq(1).attr("fill"), "#0000ff");
				}
			}, {
				setup: function(env, runtime) {
					var circles = $("circle", runtime);
					var rects = $("rect", runtime);

					var ev = document.createEvent("MouseEvent");
					ev.initMouseEvent("click");

					circles[0].dispatchEvent(ev);
					rects[1].dispatchEvent(ev);
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					var rects = $("rect", runtime);
					equal(circles.eq(0).attr("fill"), "#00ff00");
					equal(circles.eq(1).attr("fill"), "#00ff00");
					equal(rects.eq(0).attr("fill"), "#00ff00");
					equal(rects.eq(1).attr("fill"), "#00ff00");
				}
			}, {
				setup: function(env, runtime) {
					var circles = $("circle", runtime);
					var rects = $("rect", runtime);

					var ev = document.createEvent("MouseEvent");
					ev.initMouseEvent("click");

					circles[1].dispatchEvent(ev);
					rects[0].dispatchEvent(ev);
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					var rects = $("rect", runtime);
					equal(circles.eq(0).attr("fill"), "#ff0000");
					equal(circles.eq(1).attr("fill"), "#0000ff");
					equal(rects.eq(0).attr("fill"), "#ff0000");
					equal(rects.eq(1).attr("fill"), "#0000ff");
				}
			}]
		},
		{
			name: "Bouncing Ball",
			expect: 0,
			create_builtins: true,
			delay: 1000,
			steps: [{
				setup: function(env) {
					env	.cd("screen")
							.set("ball", "<stateful>")
							.cd("ball")
								.set("(prototypes)", "(start)", "shape.circle")
								.set("r", "(start)", "10")
								.add_state("moving")
								.start_at("moving")
								.add_transition("moving", "moving", "on('frame')")
								.set("vx", "(start)", "10")
								.set("vy", "(start)", "10")
								.set("cx", "(start)", "Math.random() * sketch.width")
								.set("cy", "(start)", "Math.random() * sketch.height")
								.set("cx", "moving-0>moving", "cx+vx")
								.set("cy", "moving-0>moving", "cy+vy")
								.add_transition("moving", "moving", "cx < r")
								.add_transition("moving", "moving", "cy < r")
								.add_transition("moving", "moving", "cx + r > sketch.width")
								.add_transition("moving", "moving", "cy + r > sketch.height")
								.set("vx", "moving-1>moving", "-vx")
								.set("vx", "moving-3>moving", "-vx")
								.set("vy", "moving-2>moving", "-vy")
								.set("vy", "moving-4>moving", "-vy")
								.up()
							.set("outline", "<stateful>")
							.cd("outline")
								.set("(prototypes)", "(start)", "shape.rect")
								.set("width", "(start)", "sketch.width")
								.set("height", "(start)", "sketch.height")
								.set("fill", "(start)", "'none'")
								.set("x", "(start)", "0")
								.set("y", "(start)", "0")
								.up()
				},
				test: function(env, runtime) {
				}
			}]
		},
		{
			name: "Queries",
			expect: 3,
			create_builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("find", ist.find_fn)
						.set("on", ist.on_event)
						.set("obj", "<stateful>")
						.cd("obj")
							.add_state("state1")
							.add_state("state2")
							.add_transition("state1", "state2", "on('ev'+my_copy)")
							.start_at("state1")
							.set_copies("5")
							.up()
						.set("query1", "find(obj).in_state('state1')");
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("query1").size(), 5);
					ist.emit('ev1');
					equal(cobj.prop_val("query1").size(), 4);
					ist.emit('ev3');
					equal(cobj.prop_val("query1").size(), 3);
				}
			}]
		},
		{
			name: "Calling a Parsed FN",
			expect: 2,
			create_builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("fn_a", "function(a, b, c) { var sum = a+b+c; for(var i = 0; i<arguments.length; i++) { sum += arguments[i]; } return sum + d; }")
						.set("d", "1+2")
						.set("x", "fn_a(1,2,3)");
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 15);
					env.set("d", "2");
					equal(cobj.prop_val("x"), 14);
				}
			}]
		},
		{
			name: "Immediate Constraint Event Transitions",
			expect: 1,
			create_builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.add_state("state1")
							.add_state("state2")
							.add_transition("state1", "state2", "true")
							.set("x", "state1", "1")
							.set("x", "state2", "2")
							.start_at("state1")
						;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 2);
				}
			}]
		},
		{
			name: "Immediate Constraint Event Transitions",
			expect: 1,
			create_builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.add_state("state1")
							.add_state("state2")
							.add_transition("state1", "state2", "true")
							.set("x", "state1", "1")
							.set("x", "state2", "2")
							.start_at("state1")
						;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 2);
				}
			}]
		}
		/**/
	];

	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
