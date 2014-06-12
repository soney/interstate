(function(ist) {
	module("Runtime");

	function simulateClick(type, elem) {
		var evt = document.createEvent("MouseEvents");
			evt.initMouseEvent(type, true, true, window,
			0, 0, 0, 0, 0, false, false, false, false, 0, null);
		elem.dispatchEvent(evt);
	}


	var _ = ist._,
		tests = [
		{
			name: "Very Basics",
			expect: 3,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("A", "<stateful>")
						.cd("A")
							.set("x", "(start)", "1")
							.up()
						.set("B", "<stateful>")
						.cd("B")
							.set("(prototypes)", "(start)", "A")
							.set("x", "(start)", "3")
							.up()
						.cd("A")
							.set("y", "(start)", "2")
							.up()
							;
				},
				test: function(env, runtime) {
					env.cd("A");
					var A = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					env.up().cd("B");
					var B = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);

					equal(A.prop_val("x"), 1);
					equal(A.prop_val("y"), 2);
					equal(B.prop_val("x"), 3);
					env.print();
				}
			}]
		},
		{
			name: "Dynamic Events",
			expect: 2,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("on", ist.on_event)
						.set("obj", "<stateful>")
						.cd("obj")
							.add_state("INIT")
							.start_at("INIT")
							.add_state("active")
							.set("my_event", "(start)", "'ev1'")
							.add_transition("INIT", "active", "on(my_event)")
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
			builtins: false,
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
							.set("(prototypes)", "(start)", "proto_obj")
							.add_transition("INIT", "active", "on(my_event)")
							.set("my_state")
							.set("my_state", "INIT", "'INIT'")
							.set("my_state", "active", "'active'")
							;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("my_state"), "INIT");

					env .top()
						.cd("proto_obj")
							.set("my_event", "(start)", "'ev2'");

					ist.emit("ev2");
					equal(cobj.prop_val("my_state"), "active");
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
					env	.set("screen", "<stateful>")
						.cd("screen")
							.set("(prototypes)", "(start)", "svg.paper")
							.set("circ1", "<stateful>")
							.cd("circ1")
								.set("(prototypes)", "(start)", "svg.circle")
								.set("fill", "(start)", "'red'")
								.set("cx", "(start)", "80")
								.set("cy", "(start)", "80")
								.up()
							.set("circ2", "<stateful>")
							.cd("circ2")
								.set("(prototypes)", "(start)", "svg.circle")
								.set("fill", "(start)", "'blue'")
								.set("cx", "(start)", "100")
								.set("cy", "(start)", "100")
								.up()
								;
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					equal(circles.eq(0).attr("fill"), "#ff0000");
					equal(circles.eq(1).attr("fill"), "#0000ff");
				}
			}, {
				setup: function(env, runtime) {
					env.move("circ1", 1);
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					equal(circles.eq(0).attr("fill"), "#0000ff");
					equal(circles.eq(1).attr("fill"), "#ff0000");
				}
			}, {
				setup: function(env) {
					env.move("circ1", 0);
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					equal(circles.eq(0).attr("fill"), "#ff0000");
					equal(circles.eq(1).attr("fill"), "#0000ff");
				}
			}]
		},
		{
			name: "Groups",
			expect: 2,
			steps: [{
				setup: function(env) {
					env	.set("screen", "<stateful>")
						.cd("screen")
						.set("(prototypes)", "(start)", "svg.paper")
						.set("compound1", "<stateful>")
							.cd("compound1")
								.set("(prototypes)", "(start)", "svg.group")
								.set("circ1", "<stateful>")
								.cd("circ1")
									.set("(prototypes)", "(start)", "svg.circle")
									.set("fill", "(start)", "'red'")
									.set("cx", "(start)", "80")
									.set("cy", "(start)", "80")
									.up()
								.set("circ2", "<stateful>")
								.cd("circ2")
									.set("(prototypes)", "(start)", "svg.circle")
									.set("fill", "(start)", "'blue'")
									.set("cx", "(start)", "100")
									.set("cy", "(start)", "100")
									.up()
									;
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					equal(circles.eq(0).attr("fill"), "#ff0000");
					equal(circles.eq(1).attr("fill"), "#0000ff");
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
					env	.set("screen", "<stateful>")
						.cd("screen")
							.set("(prototypes)", "(start)", "svg.paper")
							.set("obj", "<stateful>")
							.cd("obj")
								.set("(prototypes)", "(start)", "svg.rectangle")
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
					env	.set("screen", "<stateful>")
						.cd("screen")
							.set("(prototypes)", "(start)", "svg.paper")
							.set("obj", "<stateful>")
							.cd("obj")
								.set("(prototypes)", "(start)", "svg.ellipse")
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
						.set("screen", "<stateful>")
						.cd("screen")
							.set("(prototypes)", "(start)", "svg.paper")
							.set("obj", "<stateful>")
							.cd("obj")
								.add_state("init")
								.add_state("dragging")
								.add_transition("init", "dragging", "on('drag')")
								.add_transition("dragging", "init", "on('stop')")
								.start_at("init")
								.set("(prototypes)", "(start)", "svg.rectangle")
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
			builtins: false,
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
			builtins: true,
			steps: [{
				setup: function(env) {
					env	
						.set("screen", "<stateful>")
						.cd("screen")
							.set("(prototypes)", "(start)", "svg.paper")
							.set("obj", "<stateful>")
							.cd("obj")
								.add_state("s1")
								.add_state("s2")
								.add_transition("s1", "s2", "on('e1')")
								.add_transition("s2", "s1", "on('e2')")
								.start_at("s1")
								.set("(prototypes)", "(start)", "svg.rectangle")
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
			builtins: true,
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
			steps: [{
				setup: function(env) {
					env	
						.set("screen", "<stateful>")
						.cd("screen")
							.set("(prototypes)", "(start)", "svg.paper")
							.set("my_shape", "<stateful>")
							.cd("my_shape")
								.set("(prototypes)", "(start)", "svg.circle")
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
			builtins: false,
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
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("prop_0"), "b0");
				}
			}]
		},
		{
			name: "Copies & Groups",
			expect: 12,
			builtins: true,
			delay_before_test: 5,
			steps: [{
				setup: function(env, runtime) {
					env	
						.set("screen", "<stateful>")
						.cd("screen")
							.set("(prototypes)", "(start)", "svg.paper")
							.set("compound1", "<stateful>")
							.cd("compound1")
								.set_copies("['#ff0000', '#0000ff']")
								.set("(prototypes)", "(start)", "svg.group")
								.add_state("init")
								.add_state("clicked")
								.add_transition("init", "clicked", "on('click', this)")
								.add_transition("clicked", "init", "on('click', this)")
								.start_at("init")
								.set("group_fill", "init", "my_copy")
								.set("group_fill", "clicked", "'#00ff00'")
								.set("circ1", "<stateful>")
								.cd("circ1")
									.set("(prototypes)", "(start)", "svg.circle")
									.set("fill", "(start)", "group_fill")
									.set("cx", "(start)", "80*copy_num")
									.set("cy", "(start)", "80*copy_num")
									.up()
								.set("rect1", "<stateful>")
								.cd("rect1")
									.set("(prototypes)", "(start)", "svg.rectangle")
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
					equal(  rects.eq(0).attr("fill"), "#ff0000");
					equal(  rects.eq(1).attr("fill"), "#0000ff");
				}
			}, {
				setup: function(env, runtime) {
					var circles = $("circle", runtime);
					var rects = $("rect", runtime);

					var ev = document.createEvent("MouseEvent");
					ev.initMouseEvent("click");

					circles[0].dispatchEvent(ev);
				},
				test: function(env, runtime) {
					var circles = $("circle", runtime);
					var rects = $("rect", runtime);
					equal(circles.eq(0).attr("fill"), "#00ff00");
					equal(circles.eq(1).attr("fill"), "#0000ff");
					equal(rects.eq(0).attr("fill"), "#00ff00");
					equal(rects.eq(1).attr("fill"), "#0000ff");
				}
			}, {
				setup: function(env, runtime) {
					var circles = $("circle", runtime);
					var rects = $("rect", runtime);

					var ev = document.createEvent("MouseEvent");
					ev.initMouseEvent("click");

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
			}]
		},
		{
			name: "Bouncing Ball",
			expect: 0,
			builtins: true,
			delay: 1000,
			steps: [{
				setup: function(env) {
					env	
						.set("screen", "<stateful>")
						.cd("screen")
							.set("(prototypes)", "(start)", "svg.paper")
							.set("ball", "<stateful>")
							.cd("ball")
								.set("(prototypes)", "(start)", "svg.circle")
								.set("r", "(start)", "10")
								.add_state("moving")
								.start_at("moving")
								.add_transition("moving", "moving", "on('frame')")
								.set("vx", "(start)", "10")
								.set("vy", "(start)", "10")
								.set("cx", "(start)", "Math.random() * screen.width")
								.set("cy", "(start)", "Math.random() * screen.height")
								.set("cx", "moving-0>moving", "cx+vx")
								.set("cy", "moving-0>moving", "cy+vy")
								.add_transition("moving", "moving", "cx < r")
								.add_transition("moving", "moving", "cy < r")
								.add_transition("moving", "moving", "cx + r > screen.width")
								.add_transition("moving", "moving", "cy + r > screen.height")
								.set("vx", "moving-1>moving", "-vx")
								.set("vx", "moving-3>moving", "-vx")
								.set("vy", "moving-2>moving", "-vy")
								.set("vy", "moving-4>moving", "-vy")
								.up()
							.set("outline", "<stateful>")
							.cd("outline")
								.set("(prototypes)", "(start)", "svg.rectangle")
								.set("width", "(start)", "screen.width")
								.set("height", "(start)", "screen.height")
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
			name: "Calling a Parsed FN",
			expect: 2,
			builtins: false,
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
			builtins: false,
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
			builtins: false,
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
			name: "StopPropagation on Events",
			expect: 10,
			builtins: true,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.set("(prototypes)", "(start)", "dom.h1")
							.add_state("state1")
							.add_state("state2")
							.add_transition("state1", "state2", "on('mousedown', this).stopPropagation()")
							.add_transition("state2", "state1", "on('mousedown', this)")
							.set("x", "state1", "1")
							.set("x", "state2", "2")
							.start_at("state1")
						;
				},
				test: function(env, runtime, make_async) {
					var window_md_count = 0,
						window_md_listener = function() {
							window_md_count++;
						},
						cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer),
						h1 = $("h1", runtime),
						callback = make_async();

					window.addEventListener("mousedown", window_md_listener);

					equal(cobj.prop_val("x"), 1);
					equal(window_md_count, 0);

					simulateClick("mousedown", h1[0]);

					_.delay(function() {
						equal(cobj.prop_val("x"), 2);
						equal(window_md_count, 0);

						simulateClick("mousedown", h1[0]);

						_.delay(function() {
							equal(cobj.prop_val("x"), 1);
							equal(window_md_count, 1);

							simulateClick("mousedown", h1[0]);

							_.delay(function() {
								equal(cobj.prop_val("x"), 2);
								equal(window_md_count, 1);

								simulateClick("mousedown", h1[0]);

								_.delay(function() {
									equal(cobj.prop_val("x"), 1);
									equal(window_md_count, 2);
									window.removeEventListener("mousedown", window_md_listener);
									callback();
								}, 10);
							}, 10);
						}, 10);
					}, 10);

				}
			}]
		},
		{
			name: "Breakpoints",
			expect: 10,
			builtins: ["functions"],
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.add_state("state1")
							.add_state("state2")
							.start_at("state1")
							.add_transition("state1", "state2", "on('fwd')")
							.add_transition("state2", "state1", "on('bak')")
							.set("x", "state1", "1")
							.set("x", "state2", "2")
						;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 1);
					ist.emit("fwd");
					equal(cobj.prop_val("x"), 2);
					ist.emit("bak");
					equal(cobj.prop_val("x"), 1);
					cobj.pause();
					ist.emit("fwd");
					equal(cobj.prop_val("x"), 1);
					cobj.resume();
					equal(cobj.prop_val("x"), 1);
					ist.emit("fwd");
					equal(cobj.prop_val("x"), 2);
					cobj.pause();
					equal(cobj.prop_val("x"), 2);
					ist.emit("bak");
					equal(cobj.prop_val("x"), 2);
					cobj.resume();
					equal(cobj.prop_val("x"), 2);
					ist.emit("bak");
					equal(cobj.prop_val("x"), 1);
				}
			}]
		},
		{
			name: "CObj Inherits From",
			expect: 1,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.set("x", "(start)", "1")
							.up()
						.set("obj2", "<stateful>")
						.cd("obj2")
							.set("(prototypes)", "(start)", "obj")
							.up()
						;
				},
				test: function(env, runtime) {
					env.cd("obj");
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					env.up().cd("obj2");
					var cobj2 = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);

					var cobjx = cobj.prop("x"),
						cobj2x = cobj2.prop("x");
					ok(cobj2x.is_inherited() === cobjx);
				}
			}]
		},
		{
			name: "this, $this, $$this",
			expect: 9,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("A", "<stateful>")
						.cd("A")
							.set("x", "(start)", "this")
							.set("y", "(start)", "$this")
							.set("z", "(start)", "$$this")
							.up()
						.set("B", "<stateful>")
						.cd("B")
							.set("(prototypes)", "(start)", "A")
							.up()
						.set("C", "<stateful>")
						.cd("C")
							.set("(prototypes)", "(start)", "B")
							.up()
						;
				},
				test: function(env, runtime) {
					env.cd("A");
					var A = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer),
						Ax = A.prop_val("x"),
						Ay = A.prop_val("y")
						Az = A.prop_val("z");
					env.up().cd("B");
					var B = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer),
						Bx = B.prop_val("x"),
						By = B.prop_val("y"),
						Bz = B.prop_val("z");
					env.up().cd("C");
					var C = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer),
						Cx = C.prop_val("x"),
						Cy = C.prop_val("y"),
						Cz = C.prop_val("z");

					ok(Ax === A);
					ok(Ay === A);
					ok(Az === A);
					ok(Bx === B);
					ok(By === A);
					ok(Bz === A);
					ok(Cx === C);
					ok(Cy === B);
					ok(Cz === A);

					Ax = Ay = Az = Bx = By = Bz = Cx = Cy = Cz = A = B = C = null;
				}
			}]
		},
	];
	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
