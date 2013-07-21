(function() {
//var cjs = red.cjs;
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

var cjs = red.cjs;
asyncTest("Debugger connection", function() {
	expect(1);
	var timeout_id = window.setTimeout(function() {
		ok(false, "Could not connect to debugger");
		start();
	}, 1000);
	do_command("ping", {}, function() {
		ok(true, "Connected to debugger");
		window.clearTimeout(timeout_id);
		start();
	});
});

asyncTest("Constraint allocation", function() {
	expect(3);
	clear_snapshots(function() {
		take_snapshot([], function(response) {
			var x = cjs.$(1);
			var y = cjs.$(function() { return x.get() + 1; });
			equal(y.get(), 2);
			equal(x.get(), 1);
			x.get();
			x.destroy();
			x = null;
			y = null;
			take_snapshot(["ConstraintNode", "SettableConstraint", "red."], function(response) {
				ok(!response.illegal_strs, "Make sure nothing was allocated");
				start();
			});
		});
	});
});

asyncTest("Map Allocation", function() {
	expect(3);
	clear_snapshots(function() {
		take_snapshot([], function() {
			var m = cjs.map();
			m.put("a", 1);
			equal(m.get("b"), undefined);
			equal(m.get("a"), 1);
			m.destroy();
			m = null;
			take_snapshot(["ConstraintNode", "SettableConstraint", "red."], function(response) {
				ok(!response.illegal_strs, "Make sure nothing was allocated");
				start();
			});
		});
	});
});
/*
asyncTest("State Allocation", function() {
	expect(1);
	clear_snapshots(function() {
		take_snapshot([], function() {
			var sc = new red.Statechart();
			sc.add_state("state_1");
			sc.add_state("state_2");
			sc.add_state("state_2.X");
			sc.add_state("state_2.Y");
			sc.starts_at("state_1");
			sc.add_transition("state_1", "state_2", new red.TimeoutEvent(100));
			sc.add_transition("state_2", "state_1", new red.TimeoutEvent(100));
			sc.run();
			sc.print();
			window.setTimeout(function() {
				sc.print();
				sc.destroy();
				sc = null;
				take_snapshot(["ConstraintNode", "SettableConstraint", "red."], function(response) {
					ok(true, "Make sure nothing was allocated");
					start();
				});
			}, 350);
		});
	});
});
*/
asyncTest("Environment Collection", function() {
	expect(1);
	var the_div = $("<div />").appendTo(document.body);
	clear_snapshots(function() {
		take_snapshot([], function() {
			var env = new red.Environment({create_builtins: true});
			env	.cd("screen")
					.set("my_circle", "<stateful>")
					.cd("my_circle")
						.add_state("init")
						.add_state("hover")
						.start_at("init")
						.add_transition("init", "hover", "on('mouseover', this)")
						.add_transition("hover", "init", "x == 1")
						.set("(prototypes)", "init", "shape.circle")
						.set("fill")
						.set("fill", "init", "'red'")
						.set("fill", "hover", "'blue'")
			;
			env.print();
			var root = env.get_root();
			the_div.dom_output({
				root: root,
				editor_url: window.location.protocol + "//" + window.location.host + "/src/view/editor/editor.ejs.html"
			});

			window.setTimeout(function() {
				the_div.dom_output("destroy");
				env.destroy();
				env = null;
				the_div.remove();
				take_snapshot(["ConstraintNode", "SettableConstraint", "red."], function(response) {
					ok(!response.illegal_strs, "Make sure nothing was allocated");
					start();
				});
			}, 2000);
		});
	});
});
asyncTest("Communication Wrapper", function() {
	expect(3);
	clear_snapshots(function() {
		take_snapshot([], function() {
			var env = new red.Environment({create_builtins: true});
			env.print();

			var pss = new red.ProgramStateServer({
				root: env.get_root()
			});

			pss.set_communication_mechanism(new red.SameWindowCommWrapper());
			var psc = new red.ProgramStateClient({
				comm_mechanism: new red.SameWindowCommWrapper()
			});
			psc.on_loaded();

			var root_client = psc.root_client;

			psc.root_client.async_get("children", function(children) {
				var croot = red.find_or_put_contextual_obj(env.get_root());
				var env_children = croot.children();

				ok(env_children.length === children.length);
				for(var i = 0; i<children.length; i++) {
					if(env_children[i].name !== children[i].name) {
						throw new Error();
					}
				}
				env.set("x", 20);
				psc.root_client.async_get("children", function(children) {
					var croot = red.find_or_put_contextual_obj(env.get_root());
					var env_children = croot.children();

					ok(env_children.length === children.length);
					for(var i = 0; i<children.length; i++) {
						if(env_children[i].name !== children[i].name) {
							throw new Error();
						}
					}
				});

				croot = null;
			});

			root_client = null;

			psc.destroy();
			psc = null;

			pss.destroy();
			pss = null;

			env.destroy();
			env = null;

			take_snapshot(["ConstraintNode", "SettableConstraint", "red."], function(response) {
				ok(!response.illegal_strs, "Make sure nothing was allocated");
				start();
			});
		});
	});
});

asyncTest("Pointer Bucket Collection", function() {
	expect(7);
	clear_snapshots(function() {
		take_snapshot([], function(response) {
			var root = new red.Dict();
			var a_dict = new red.Dict();
			var b_dict = new red.Dict();
			var croot = red.find_or_put_contextual_obj(root);
			root.set("a", a_dict);
			root.set("b", b_dict);
			var ca_dict = croot.prop("a");
			var cb_dict = croot.prop("b");
			equal(ca_dict.get_object(), a_dict);
			equal(cb_dict.get_object(), b_dict);
			root.unset("a");
			equal(croot.prop("a"), undefined);
			var expired_cobjs = red.get_expired_contextual_objects(root);
			equal(expired_cobjs.length, 1);
			equal(expired_cobjs[0], ca_dict);
			ca_dict.destroy();
			expired_cobjs = red.get_expired_contextual_objects(root);
			equal(expired_cobjs.length, 0);

			a_dict.destroy();
			croot.destroy();
			root.destroy();
			a_dict = b_dict = croot = root = null;

			take_snapshot(["ConstraintNode", "SettableConstraint", "red."], function(response) {
				ok(!response.illegal_strs, "Make sure nothing was allocated");
				start();
			});
		});
	});
});
asyncTest("Editor", function() {
	expect(1);
	clear_snapshots(function() {
		take_snapshot([], function() {
			var env = new red.Environment({create_builtins: true});
			var root = env.get_root();

			var runtime_div = $("<div />")	.appendTo(document.body)
											.dom_output({
												root: root,
												open_separate_client_window: false,
												edit_on_open: true,
												show_edit_button: false
											});
			var editor_div = $("<div />")	.appendTo(document.body)
											.editor({
												debug_env: true,
												server_window: window
											});

			var cleanup_button = $("<a />")	.attr("href", "javascript:void(0)")
											.text("Clean up")
											.appendTo(document.body)
											.on("click.clean", function() {
												cleanup_button.off("click.clean")
																.remove();
												cleanup_button = null;

												env.destroy();
												env = root = null;
												editor_div.editor("destroy");
												runtime_div.dom_output("destroy");
												window.setTimeout(function() {
													take_snapshot(["ConstraintNode", "SettableConstraint", "red."], function(response) {
														ok(!response.illegal_strs, "Make sure nothing was allocated");
														editor_div.remove();
														runtime_div.remove();
														editor_div = runtime_div = null;
														start();
													});
												}, 0);
											});
			window.setTimeout(function() {
				if(cleanup_button) {
					cleanup_button.click();
				}
			}, 5000);
		});
	});
});

}());
