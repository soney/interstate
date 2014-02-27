(function(ist) {
	var cjs = ist.cjs;

	test("Map diff", function() {
		var md;
		md = ist.get_map_diff(['a'], ['a'], [1], [1]);
		equal(md.set.length, 0);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['a'], ['b'], [1], [1]);
		equal(md.set.length, 0);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 1);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['a','b','c'], ['b'], [1,2,3], [2]);
		equal(md.set.length, 0);
		equal(md.unset.length, 2);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['b'], ['a','b','c'], [2], [1,2,3]);
		equal(md.set.length, 2);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['b', 'a', 'c'], ['a','b','c'], [2,1,3], [1,2,3]);
		equal(md.set.length, 0);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['a'], ['b','c','a'], [undefined], [undefined,undefined,undefined]);
		equal(md.set.length, 2);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['a', 'b', 'c'], ['a','b','c'], [2,1,3], [1,2,3]);
		equal(md.set.length, 0);
		equal(md.unset.length, 0);
		equal(md.value_change.length, 2);
		equal(md.key_change.length, 0);

		md = ist.get_map_diff(['c', 'a', 'd'], ['a','b','c'], [2,3,1], [1,2,3]);
		equal(md.set.length, 1);
		equal(md.unset.length, 1);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 2);
		/**/
	});
	asyncTest("Remote Constraints", function() {
		expect(3);
		clear_snapshots(function() {
			take_snapshot([], function() {
				var comm_wrapper1 = new ist.SameWindowCommWrapper();
				var comm_wrapper2 = new ist.SameWindowCommWrapper();
				var x = cjs(1);
				var constraint_server = new ist.RemoteConstraintServer(x);
				var constraint_client = new ist.RemoteConstraintClient(constraint_server.id());
				constraint_server.set_communication_mechanism(comm_wrapper1);
				constraint_client.set_communication_mechanism(comm_wrapper2);
				equal(constraint_client.get(), 1);
				x.set(2);
				equal(constraint_client.get(), 2);
				window.setTimeout(function() {
					take_snapshot(["ConstraintNode", "SettableConstraint", "interstate.", "ist."], function(response) {
						ok(true, "Make sure nothing was allocated");
						start();
					});
				}, 350);
			});
		});
	});
	
	asyncTest("State Allocation", function() {
		expect(1);
		clear_snapshots(function() {
			take_snapshot([], function() {
				var sc = new ist.Statechart();
				sc.add_state("state_1");
				sc.add_state("state_2");
				sc.add_state("state_2.X");
				sc.add_state("state_2.Y");
				sc.starts_at("state_1");
				sc.add_transition("state_1", "state_2", new ist.TimeoutEvent(100));
				sc.add_transition("state_2", "state_1", new ist.TimeoutEvent(100));
				sc.run();
				//sc.print();
				window.setTimeout(function() {
					//sc.print();
					sc.destroy();
					sc = null;
					take_snapshot(["ConstraintNode", "SettableConstraint", "interstate.", "ist."], function(response) {
						ok(true, "Make sure nothing was allocated");
						start();
					});
				}, 350);
			});
		});
	});
	asyncTest("Environment Collection", function() {
		expect(1);
		var the_div = $("<div />").appendTo(document.body);
		clear_snapshots(function() {
			take_snapshot([], function() {
				var env = new ist.Environment({builtins: true});
				env	.cd("screen")
						.set("my_circle", "<stateful>")
						.cd("my_circle")
							.add_state("init")
							.add_state("hover")
							.start_at("init")
							.add_transition("init", "hover", "on('mouseover', this)")
							.add_transition("hover", "init", "on('mouseout', this)")
							.set("(prototypes)", "init", "shape.circle")
							.set("fill")
							.set("fill", "init", "'red'")
							.set("fill", "hover", "'blue'")
				;
				//env.print();
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
					take_snapshot(["ConstraintNode", "SettableConstraint", "interstate.", "ist."], function(response) {
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
				var env = new ist.Environment({builtins: true});
				//env.print();

				var pss = new ist.ProgramStateServer({
					root: env.get_root(),
					command_stack: env._command_stack
				});

				pss.set_communication_mechanism(new ist.SameWindowCommWrapper());
				var psc = new ist.ProgramStateClient({
					comm_mechanism: new ist.SameWindowCommWrapper()
				});
				psc.on_loaded();

				var root_client = psc.root_client;

				psc.root_client.async_get("children", function(children) {
					var croot = ist.find_or_put_contextual_obj(env.get_root());
					var env_children = croot.children();

					ok(env_children.length === children.length);
					for(var i = 0; i<children.length; i++) {
						if(env_children[i].name !== children[i].name) {
							throw new Error();
						}
					}
					env.set("x", 20);
					psc.root_client.async_get("children", function(children) {
						var croot = ist.find_or_put_contextual_obj(env.get_root());
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

				take_snapshot(["ConstraintNode", "SettableConstraint", "interstate.", "ist."], function(response) {
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
				var root = new ist.Dict();
				var a_dict = new ist.Dict();
				var b_dict = new ist.Dict();
				var croot = ist.find_or_put_contextual_obj(root);
				root.set("a", a_dict);
				root.set("b", b_dict);
				var ca_dict = croot.prop("a");
				var cb_dict = croot.prop("b");
				equal(ca_dict.get_object(), a_dict);
				equal(cb_dict.get_object(), b_dict);
				root.unset("a");
				equal(croot.prop("a"), undefined);
				var expired_cobjs = ist.get_expired_contextual_objects(root);
				equal(expired_cobjs.length, 1);
				equal(expired_cobjs[0], ca_dict);
				ca_dict.destroy();
				expired_cobjs = ist.get_expired_contextual_objects(root);
				equal(expired_cobjs.length, 0);

				a_dict.destroy();
				croot.destroy();
				root.destroy();
				a_dict = b_dict = croot = root = null;

				take_snapshot(["ConstraintNode", "SettableConstraint", "interstate.", "ist."], function(response) {
					ok(!response.illegal_strs, "Make sure nothing was allocated");
					start();
				});
			});
		});
	});
	asyncTest("Basic Statechart View", function() {
		expect(1);
		var master = new ist.Statechart();

		var dict = new ist.Dict();
		var context = new ist.Pointer({stack: [dict]});
		master	.add_state("a")
				.add_state("a.x")
				.add_state("a.y")
				.add_transition("a.x", "a.y", new ist.ParsedEvent({str: "false", context: context}))
				.add_state("b")
				.starts_at("a")
				.find_state("a")
					.starts_at("x")
					.parent();

		var sc_display_div = $("<div />")	.appendTo(document.body)
											.statechart({
												statecharts: [master]
											}).on("command", function(event) {
												var type = event.command_type;
												if(type === "add_state") {
													var statechart = event.state;
													var substates = statechart.get_substates();
													var substates_size = ist._.size(substates);
													var state_name, make_start;

													if(substates_size === 0) {
														state_name = "init";
														make_start = true;
													} else {
														state_name = "state_" + substates_size;
														make_start = false;
													}
													statechart.add_state(state_name);
													if(make_start) {
														statechart.starts_at(state_name);
													}
												} else if(type === "set_transition_str") {
													var transition = event.transition, event_str = event.str;
													var transition_event = transition.event();
													transition_event.set_str(event_str);
												} else if(type === "add_transition") {
													var from = event.from,
														to = event.to;
													var transition_event = new ist.ParsedEvent( {str: "(event)", context: context});
													from.parent().add_transition(from, to, transition_event);
												} else if(type === "rename_state") {
													var state = event.state,
														to_name = event.new_name;
													state.parent().rename_substate(state.get_name("parent"), to_name);
												} else if(type === "remove_state") {
													var state = event.state;
													state.parent().remove_substate(state.get_name("parent"), state);
												} else if(type === "remove_transition") {
													var transition = event.transition;
													transition.remove();
												} else if(type === "set_transition_to") {
													var transition = event.transition,
														state = event.to;
													transition.setTo(state);
												} else if(type === "set_transition_from") {
													var transition = event.transition,
														state = event.from;
													transition.setFrom(state);
												} else if(type === "make_concurrent") {
													var state = event.state,
														concurrent = event.concurrent;

													state.make_concurrent(concurrent);
												} else {
													console.log(type, event);
												}
											});

		clear_snapshots(function() {
			take_snapshot([], function() {
				var cleanup_button = $("<a />")	.attr("href", "javascript:void(0)")
												.text("Clean up")
												.appendTo(document.body)
												.on("click.clean", function() {
													cleanup_button	.off("click.clean")
																	.remove();
													sc_display_div.statechart("destroy").remove();
													master.destroy();
													sc_display_div = null;
													master = null;
													dict.destroy();
													dict = null;
													context = null;
													window.setTimeout(function() {
														take_snapshot(["ConstraintNode", "SettableConstraint", "interstate.", "ist.", "$.(anonymous function).(anonymous function)"], function(response) {
															ok(!response.illegal_strs, "Make sure nothing was allocated");
															start();
														});
													}, 0);
												});

				window.setTimeout(function() {
					if(cleanup_button) {
						cleanup_button.click();
					}
				}, 2000);
			});
		});
	});
	asyncTest("Basic Editor", function() {
		expect(1);
		clear_snapshots(function() {
			take_snapshot([], function() {
				var env = new ist.Environment({builtins: true});
				//env	.set("height", "10")
					//.set("obj", "<stateful>");
				var root = env.get_root();

				var runtime_div = $("<div />").appendTo(document.body);
				var editor_div = $("<div />").appendTo(document.body);
				runtime_div	.dom_output({
								root: root,
								open_separate_client_window: false,
								edit_on_open: true,
								show_edit_button: false
							});
				editor_div	.editor({
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
													editor_div.editor("destroy").remove();
													runtime_div.dom_output("destroy").remove();
													window.setTimeout(function() {
														take_snapshot(["ConstraintNode", "SettableConstraint", "interstate.", "ist.", "$.(anonymous function).(anonymous function)"], function(response) {
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
				}, 2000);
			});
		});
	});

	asyncTest("Loading Files", function() {
		expect(1);
		clear_snapshots(function() {
			take_snapshot([], function() {
				var env = new ist.Environment({create_builtins: true});
				env	.set("height", "10")
					.set("obj", "<stateful>");
				var root = env.get_root();

				var runtime_div = $("<div />").appendTo(document.body);
				var editor_div = $("<div />").appendTo(document.body);
				runtime_div	.dom_output({
								root: root,
								open_separate_client_window: false,
								edit_on_open: true,
								show_edit_button: false
							});
				editor_div	.editor({
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
													editor_div.editor("destroy").remove();
													runtime_div.dom_output("destroy").remove();
													window.setTimeout(function() {
														take_snapshot(["ConstraintNode", "SettableConstraint", "interstate.", "ist.", "$.(anonymous function).(anonymous function)"], function(response) {
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
				}, 2000);
			});
		});
	});

	/**/
}(interstate));
