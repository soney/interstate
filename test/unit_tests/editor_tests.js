(function(ist) {
	module("Editor");

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

		//clear_snapshots(function() {
			//take_snapshot([], function() {
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
														take_snapshot(["interstate.", "ist."], function(response) {
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
			//});
		//});
	});

	/*
	asyncTest("Basic Editor", function() {
		expect(1);
		//clear_snapshots(function() {
			//take_snapshot([], function() {
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
														take_snapshot(["interstate.", "ist."], function(response) {
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
			//});
		//});
	});

	asyncTest("Loading Files", function() {
		expect(1);
		//clear_snapshots(function() {
			//take_snapshot([], function() {
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
														take_snapshot(["interstate.", "ist."], function(response) {
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
			//});
		//});
	});
	/**/
}(interstate));
