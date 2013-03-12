(function(red, $) {
var cjs = red.cjs, _ = red._;
var origin = window.location.protocol + "//" + window.location.host;

$.widget("red.editor", {
	
	options: {
		debug_ready: false
	}

	, _create: function() {
		this.env = red.create("environment");
		this.load_viewer();
		var root_pointer = this.env.get_root_pointer();
		this.root = root_pointer.root();
		this.element.dom_output({
			root: root_pointer
		});


		this.client_socket = new red.ProgramStateClient({
			ready_func: this.option("debug_ready")
		}).on("message", function(data) {
			if(data.type === "color") {
				var color = data.value;
				$("html").css({
					"border-bottom": "10px solid " + color,
					height: "100%",
					"box-sizing": "border-box"
				});
			}
		}, this).on("root_loaded", function(root) {
			this.root.set("external_root", root, {literal: true});
		}, this);
	}

	, load_viewer: function() {
		this.env

.top()
.cd("children")
	.set("obj", "<stateful>")
	.cd("obj")
		.set("(protos)", "INIT", "dom")
		.set("text", "<stateful_prop>")
		.set("text", "INIT", "euclase_view.get_prop_names()")
		.up()
	.up()
;

	}

	, _destroy: function() {
		this.remove_message_listener();
		this.client_socket.destroy();
	}
});

}(red, jQuery));
