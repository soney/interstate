(function(ist) {
	module("Editor");
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
}(interstate));
