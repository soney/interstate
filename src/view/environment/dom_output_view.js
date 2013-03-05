(function(red, $) {
var cjs = red.cjs, _ = red._;

$.widget("red.dom_output", {
	
	options: {
		root: undefined,
		show_edit_button: true,
		edit_on_open: true,
		editor_url: "../src/view/editor.ejs.html",
		editor_name: "red_editor",
		editor_window_options: "toolbar=no, location=no, directories=no, status=yes, menubar=no, scrollbars=yes, resizable=yes, width=800, height=600"
	}

	, _create: function() {
		if(this.option("show_edit_button")) {
			this.$on_message = _.bind(this.on_message, this);
			$(window).on("message", this.$on_message);
			var edit_button_css = {
					float: "right",
					opacity: 0.3,
					"text-decoration": "none",
					"font-variant": "small-caps",
					padding: "3px",
					position: "fixed",
					top: "0px",
					right: "0px",
					color: "#900",
					"background-color": "",
					"font-size": "0.9em"
				};
			var edit_hover_css = {
					opacity: 1.0,
					color: "white",
					"background-color": "#900"
				};
			this.edit_button = $("<a />")	.attr("href", "javascript:void(0)")
											.text("source")
											.css(edit_button_css)
											.hover(function() {
												$(this).css(edit_hover_css);
											}, function() {
												$(this).css(edit_button_css);
											})
											.appendTo($(this.element).parent())
											.on("click", _.bind(this.open_editor, this));
			if(this.option("edit_on_open")) {
				this.open_editor();
			}
		}
		this._add_change_listeners();
	}

	, _destroy: function() {
		if(this.edit_button) {
			this.edit_button.remove();
		}
		$(window).off("message", this.$on_message);
		this._remove_change_listeners();
	}

	, _add_change_listeners: function() {
		var root_pointer = this.option("root");
		var root_dict = root_pointer.points_at();

		this._dom_tree_fn = cjs.liven(function() {
			var dom_attachment = root_dict.get_attachment_instance("dom", root_pointer);
			var dom_element = dom_attachment.get_dom_obj();

			if(this.element.children().is(dom_element)) {
				this.element.children().not(dom_element).remove();
			} else {
				this.element.children().remove();
				this.element.append(dom_element);
			}
		}, {
			context: this
			, pause_while_running: true
		});
	}

	, _remove_change_listeners: function() {
		this._dom_tree_fn.destroy();
	}
	, on_message: function(jq_event) {
		var event = jq_event.originalEvent;
		if(event.source === this.editor_window) {
			var data = event.data;
			if(data === "ready") {
				var root_pointer = this.option("root");
				var root = root_pointer.points_at();
				var stringified_root = red.stringify(root, true);

				this.post_delta(new red.ProgramDelta({
					str: stringified_root
				}));
			} else {
				var type = data.type;
				if(type === "command") {
					var stringified_command = data.command;
					var command = red.destringify(stringified_command);
					console.log(command);
				}
			}
		}
	}
	, post_delta: function(delta) {
		var stringified_delta = red.stringify(delta);
		var origin = window.location.protocol + "//" + window.location.host;
		this.editor_window.postMessage({
			type: "delta",
			value: stringified_delta
		}, origin);
	}

	, open_editor: function() {
		this.close_editor();
		this.editor_window = window.open(this.option("editor_url"), this.option("editor_name"), this.option("editor_window_options"));
		$(window)	.on("unload", _.bind(this.close_editor, this))
	}
	, close_editor: function() {
		if(this.editor_window) {
			this.editor_window.close();
			delete this.editor_window;
		}
	}
});

}(red, jQuery));
