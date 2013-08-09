(function() {
var check_memory_leaks = true;
var step_delay = 100;

var tests = [
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
				equal(circles.eq(0).attr("fill"), "#ff0000");
				equal(circles.eq(1).attr("fill"), "#0000ff");
			}
		}, {
			setup: function(env) {
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
				var cobj = red.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
				cobj.prop_val("x");
			},
			test: function(env, runtime) {
				var cobj = red.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
				equal(cobj.prop_val("x"), 1);
				red.emit("my_fire");
				equal(cobj.prop_val("x"), 2);
				red.emit("my_fire");
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
				red.emit('my_event')
				env.print();
				var rect = $("rect", runtime);
				equal(rect.attr("fill"), "#00ff00");
				equal(rect.attr("x"), "6");
				equal(rect.attr("y"), "33");
			}
		}, {
			setup: function(env) {
				env.reset();
				env.print();
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
				red.emit('e1');
				equal(ellipse.attr("cx"), "3");
				red.emit('e2');
				equal(ellipse.attr("cx"), "5");
				red.emit('e1');
				equal(ellipse.attr("cx"), "3");
				env.reset();
				equal(ellipse.attr("cx"), "1");
			}
		}]
	}
];

var command_id = 0;
var callbacks = {};
var do_command = function(command_name, parameters, callback) {
	var id = command_id++;
	callbacks[id] = callback;
	var message = { id: id, type: "FROM_PAGE", command: command_name };
	for(var key in parameters) {
		if(parameters.hasOwnProperty(key)) {
			message[key] = parameters[key];
		}
	}
	window.postMessage(message, "*");
};
var clear_snapshots = function(callback) {
	do_command("clear_snapshots", {}, callback);
};
var take_snapshot = function(forbidden_tokens, callback) {
	do_command("take_snapshot", {forbidden_tokens: forbidden_tokens}, callback);
};

window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window) { return; }

    if (event.data.type && (event.data.type == "FROM_EXTENSION")) {
		var id = event.data.id;
		if(callbacks.hasOwnProperty(id)) {
			var callback = callbacks[id];
			delete callbacks[id];
			callback(event.data.response);
		}
    }
}, false);

tests.forEach(function(test) {
	asyncTest(test.name, function() {
		var env, root, runtime_div;

		var root_setup = function() {
			env = new red.Environment({create_builtins: true});
			root = env.get_root();
			runtime_div = $("<div />")	.prependTo(document.body)
										.dom_output({
											root: root,
											show_edit_button: false
										});
		};
		var run_step = function(step, callback) {
			step.setup(env, runtime_div);
			window.setTimeout(function() {
				step.test(env, runtime_div);
				window.setTimeout(function() {
					callback();
				}, step_delay);
			}, 0);
		};
		var run_tests = function(callback, test_index) {
			if(arguments.length === 1) {
				test_index = 0;
			}
			if(test_index >= test.steps.length) {
				callback();
			} else {
				run_step(test.steps[test_index], function() { run_tests(callback, test_index+1); });
			}
		};
		var destroy = function() {
			runtime_div.dom_output("destroy").remove();
			env.destroy();
			env = root = null;
		};

		if(check_memory_leaks) {
			expect(test.expect + 1);
			clear_snapshots(function() {
				take_snapshot([], function() {
					root_setup();
					run_tests(function() {
						destroy();
						take_snapshot(["ConstraintNode", "SettableConstraint", "red.", "$.(anonymous function).(anonymous function)"], function(response) {
							ok(!response.illegal_strs, "Make sure nothing was allocated");
							start();
						});
					});
				});
			});
		} else {
			expect(test.expect);
			root_setup();
			run_tests(function() {
				destroy();
				start();
			});
		}
	});
});

}());
