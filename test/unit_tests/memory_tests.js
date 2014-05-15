(function(root, ist) {
	var step_delay = 10;

	QUnit.config.autostart = false;
	QUnit.config.reorder = false;
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

	var connected;
	var timeout_id = setTimeout(function() {
		root.clear_snapshots = function(callback) {
			callback();
		};

		root.take_snapshot = function(forbidden_tokens, callback) {
			callback({
				ililegal_strs: false
			});
		};

		connected = false;
		QUnit.start();
	}, 1000);

	do_command("ping", {}, function() {
		clearTimeout(timeout_id);
		root.clear_snapshots = function(callback) {
			do_command("clear_snapshots", {}, callback);
		};

		root.take_snapshot = function(forbidden_tokens, callback) {
			do_command("take_snapshot", {forbidden_tokens: forbidden_tokens}, callback);
		};

		connected = true;
		QUnit.start();
	});

	module("Debugger");
	/*
	test("Debugger Connection", function() {
		if(connected) {
			ok(true, "Connected to debugger");
		} else {
			ok(true, "Could not connect to debugger");
		}
	});
	/**/

	root.dt = function(name, test) {
		asyncTest(test.name, function() {
			var env, root, runtime_div;
			var delay = test.delay || step_delay;

			var root_setup = function() {
				env = new ist.Environment({create_builtins: test.create_builtins !== false});
				root = env.get_root();
				runtime_div = $("<div />")	.appendTo(document.body)
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
					}, delay);
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

			expect(test.expect + 1);
			clear_snapshots(function() {
				take_snapshot([], function() {
					root_setup();
					run_tests(function() {
						destroy();
						take_snapshot(["ist.", "interstate.", "$.(anonymous function).(anonymous function)"], function(response) {
							ok(!response.illegal_strs, "Make sure nothing was allocated");
							start();
						});
					});
				});
			});
		});
	};
}(this, interstate));
