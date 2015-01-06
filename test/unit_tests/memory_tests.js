(function(root, ist) {
	var default_delay_between_steps = false,
		default_delay_before_test = false,
		command_id = 0,
		callbacks = {},
		_ = ist._,
		do_command = function(command_name, parameters, callback) {
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
		root.take_snapshot = function(forbidden_tokens, callback) {
			callback({
				ililegal_strs: false
			});
		};
		root.collect_garbage = function(callback) {
			callback();
		};

		connected = false;
		QUnit.start();
	}, 500);

	do_command("ping", {}, function() {
		clearTimeout(timeout_id);

		root.take_snapshot = function(forbidden_tokens, callback) {
			do_command("take_snapshot", {forbidden_tokens: forbidden_tokens}, callback);
		};
		root.collect_garbage = function(callback) {
			do_command("collect_garbage", {}, callback);
		};

		connected = true;
		QUnit.start();
	});

	module("Debugger");
	test("Debugger Connection", function() {
		if(connected) {
			ok(true, "Connected to debugger");
		} else {
			ok(true, "Could not connect to debugger");
		}
	});
	/**/

	root.dt = function(name, test) {
		asyncTest(name, function() {
			var env, root, runtime_div,
				delay_between_steps = default_delay_between_steps || test.delay_between_steps || test.delay,
				delay_before_test = default_delay_before_test || test.delay_before_test || test.delay,
				root_setup = function(callback) {
					if(test.filename) {
						loadFile(test.filename, function(errors,str) {
							if(errors) { throw new Error(errors); }
							root = ist.destringify(str);
							env = new ist.Environment({root: root});
							runtime_div = $("<div />")	.appendTo(document.body)
														.dom_output({
															root: root,
															show_edit_button: false
														});
							callback();
						});
					} else {
						env = new ist.Environment({builtins: test.builtins});
						root = env.get_root();
						runtime_div = $("<div />")	.appendTo(document.body)
													.dom_output({
														root: root,
														show_edit_button: false
													});
						callback();
					}
				},
				run_step = function(step, callback) {
					var test_will_say_when_ready = false,
						signal_async = function() {
							test_will_say_when_ready = true;
							return callback;
						};

					if(_.isFunction(step.setup)) {
						step.setup(env, runtime_div);
					}

					if(!test_will_say_when_ready) {
						if(delay_before_test) {
							window.setTimeout(function() {
								run_step_test(step, callback);
							}, delay_before_test);
						} else {
							run_step_test(step, callback);
						}
					}
				},
				run_step_test = function(step, callback) {
					var test_will_say_when_ready = false,
						signal_async = function() {
							test_will_say_when_ready = true;
							return callback;
						};

					if(_.isFunction(step.test)) {
						step.test(env, runtime_div, signal_async);
					}

					if(!test_will_say_when_ready) {
						if(delay_between_steps) {
							window.setTimeout(function() {
								callback();
							}, delay_between_steps);
						} else {
							callback();
						}
					}
				},
				run_tests = function(callback, test_index) {
					if(arguments.length === 1) { test_index = 0; }

					if(test_index >= test.steps.length) {
						callback();
					} else {
						run_step(test.steps[test_index], function() { run_tests(callback, test_index+1); });
					}
				},
				destroy = function() {
					runtime_div.dom_output("destroy").remove();
					env.destroy();
					env = root = null;
				};

			expect(test.expect + 1);
			root_setup(function() {
				run_tests(function() {
					destroy();
					collect_garbage(function() {
						take_snapshot(["ist.", "interstate."], function(response) {
							ok(!response.illegal_strs, "Make sure nothing was allocated");
							start();
						});
					});
				});
			});
		});
	};
	function loadFile(fname, callback) {
		var xmlhttp;

		if (root.XMLHttpRequest) {
			// code for IE7+, Firefox, Chrome, Opera, Safari
			xmlhttp = new XMLHttpRequest();
		} else {
			// code for IE6, IE5
			xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
		}

		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState === 4 ) {
				if(xmlhttp.status === 200) {
					callback(false, xmlhttp.responseText);
				} else {
					callback(xmlhttp.status);
				}
			}
		};

		xmlhttp.open("GET", fname, true);
		xmlhttp.send();
	}
}(this, interstate));
