(function(ist) {
	module("Specific Bugs");

	function simulateClick(type, elem) {
		var evt = document.createEvent("MouseEvents");
			evt.initMouseEvent(type, true, true, window,
			0, 0, 0, 0, 0, false, false, false, false, 0, null);
		elem.dispatchEvent(evt);
	}


	var _ = ist._,
		tests = [
		{
			name: "Object initialization bug",
			expect: 3,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("x", "<stateful>")
						.set("obj", "<dict>")
						.cd("obj")
							.set("y", "<stateful>")
							.cd("y")
								.set("prop1", "(start)", "1")
								.up()
							.set("z", "<stateful>")
							.cd("z")
								.set("(prototypes)", "(start)", "obj.y")
								.up()
							.up()
						.cd("x")
							.set("(prototypes)", "(start)", "obj.z");
				},
				test: function(env, runtime) {
					runtime.dom_output("option", "root", false);
					env._cycle_stringify_destringify();
					runtime.dom_output("option", "root", env.get_root());
					env.cd("x")
					var x = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					env.top();
					env.cd("obj");
					var obj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer),
						y = obj.prop_val("y"),
						z = obj.prop_val("z");

					equal(x.prop_val("prop1"), 1);
					equal(y.prop_val("prop1"), 1);
					equal(z.prop_val("prop1"), 1);
				}
			}]
		},
		{
			name: "Referencing Fields in State Machines",
			expect: 2,
			builtins: ["functions"],
			steps: [{
				setup: function(env) {
					env.set("A", "<stateful>")
						.cd("A")
							.set("x", "(start)", "'click'")
							.add_state("init")
							.start_at("init")
							.add_state("clicked")
							.add_transition("init", "clicked", "on(x)")
							.top()
					;
				},
				test: function(env, runtime) {
					runtime.dom_output("option", "root", false);

					env.top().cd("A")
					var A = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer),
						x = A.prop_val("x");
					equal(x, 'click');

					env._cycle_stringify_destringify();
					//runtime.dom_output("option", "root", env.get_root());

					env.top().cd("A")
					A = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					x = A.prop_val("x");

					equal(x, 'click');
				}
			}]
		},
		{
			name: "Throwing Errors when removing copies",
			expect: 1,
			builtins: false,
			steps: [{
				setup: function(env) {
					env.set("A", "<stateful>")
						.cd("A")
							.set("x")
							.top()
					;
				},
				test: function(env, runtime) {
					var old_debug_value = ist.__debug;
					ist.__debug = ist.cjs.__debug = true;
					env.top().cd("A")
					var caught_error = false;
					try {
						env.set("(copies)", "1");
						env.set("(copies)", "");
						env.set("(copies)", "1");
						env.set("(copies)", "");
						env.set("(copies)", "5");
					} catch(e) {
						caught_error = true;
						console.error(e);
					}
					ok(!caught_error);
					ist.__debug = ist.cjs.__debug = old_debug_value;
				}
			}]
		},
		{
			name: "Throwing Errors when removing copies for SVG objects",
			expect: 6,
			steps: [{
				setup: function(env) {
					env.set("screen", "<stateful>")
						.cd("screen")
							.set("(prototypes)", "(start)", "svg.paper")
							.set("rect", "<stateful>")
							.cd("rect")
								.set("(prototypes)", "(start)", "[svg.rectangle]")
					;
				},
				test: function(env, runtime) {
					var old_debug_value = ist.__debug;
					ist.__debug = ist.cjs.__debug = true;
					env.top().cd("screen").cd("rect");
					var caught_error = false;
					try {
						env.set("(copies)", "2");
						equal($("rect", runtime).size(), 2);
						env.set("(copies)", "");
						equal($("rect", runtime).size(), 1);
						env.set("(copies)", "2");
						equal($("rect", runtime).size(), 2);
						env.set("(copies)", "");
						equal($("rect", runtime).size(), 1);
						env.set("(copies)", "5");
						equal($("rect", runtime).size(), 5);
					} catch(e) {
						caught_error = true;
						console.error(e);
					}
					ok(!caught_error);
					ist.__debug = ist.cjs.__debug = old_debug_value;
				}
			}]
		},
		{
			name: "Object updating bug",
			expect: 2,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("A", "<stateful>")
						.cd("A")
							.add_state("init")
							.start_at("init")
							.set("x", "init", "1")
							.top()
				},
				test: function(env, runtime) {
					env.cd("A");
					var A = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);

					equal(A.prop_val("x"), 1);
					//env.print();
					//console.log("BEGIN SET");
					env.set("x", "init", "2")
					//console.log("END SET");
					//console.log(x.get());
					//console.log(y.get());
					//console.log(z.get());
					equal(A.prop_val("x"), 2);
				}
			}]
		},
	];
	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
