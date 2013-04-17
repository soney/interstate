$(function() {
	var examples = {
			one_obj: function() {
				var env = red.create("environment", {create_builtins: false});
				return env.get_root();
			},
		};

	var get_example = function(name) {
		var example = examples[name];
		var rest_args = Array.prototype.slice.call(arguments, 1);

		return example.apply(this, rest_args);
	};

	$(function() {
		var unique_client_id = 0;
		var euc_data_objects = $("div[data-euc]");
		euc_data_objects.each(function() {
			var $this = $(this);

			var euc_args = $this.attr("data-euc").split(" ");
			var command = euc_args[0];
			var rest_args = euc_args.slice(1);

			var example_root = get_example.apply(this, rest_args);
			if(command === "edit") {
				$("<div/>").insertBefore($this).dom_output({
					client_id: unique_client_id,
					show_edit_button: false,
					root: example_root,
					open_separate_client_window: false,
					immediately_create_server_socket: true
				}).hide();

				$this.attr("id", "editor").editor({
					client_id: unique_client_id,
					server_window: window
				});
				unique_client_id++;
				$this.addClass("euc_editor");
			} else if(command === "run") {
				$this.dom_output({
					root: example_root,
					show_edit_button: false
				});
				$this.addClass("euc_output");
			} else if(command === "editrun") {
				var editor_div = $("<div />").addClass("euc_editor").appendTo($this);
				var output_div = $("<div />").addClass("euc_output").appendTo($this);

				output_div.dom_output({
					client_id: unique_client_id,
					show_edit_button: false,
					root: example_root,
					open_separate_client_window: false,
					immediately_create_server_socket: true
				});

				editor_div.attr("id", "editor").editor({
					client_id: unique_client_id,
					server_window: window
				});
				unique_client_id++;

				$this.addClass("euc_split_view");
			}
		});
	});
});
