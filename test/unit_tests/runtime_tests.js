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
				env.print();
			}
		}, {
			setup: function(env) {
				env.move("circ1", 1);
			},
			test: function(env, runtime) {
				var circles = $("circle", runtime);
				equal(circles.eq(0).attr("fill"), "#0000ff");
				equal(circles.eq(1).attr("fill"), "#ff0000");
				env.print();
			}
		}, {
			setup: function(env) {
				env.move("circ1", 0);
			},
			test: function(env, runtime) {
				var circles = $("circle", runtime);
				equal(circles.eq(0).attr("fill"), "#ff0000");
				equal(circles.eq(1).attr("fill"), "#0000ff");
				env.print();
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
		var callback = callbacks[id];
		delete callbacks[id];
		callback(event.data.response);
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
			step.test(env, runtime_div);
			window.setTimeout(function() {
				callback();
			}, step_delay);
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
