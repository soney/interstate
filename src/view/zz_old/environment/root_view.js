(function(red, $) {
var cjs = red.cjs, _ = red._;

$.widget("red.root", {
	
	options: {
		controller: undefined
	}

	, _create: function() {
		this._localize_functions("_on_command");
		this._setup_shortcut_listeners(); 
		var controller = this.option("controller");
		var root = controller.get_root();
		this._root_view = $("<div />")	.dict({
												dict: controller.get_root()
												, context: controller.get_root_context()
												, show_protos: false
										})
										.appendTo(this.element)
										.on("red_command", this.$_on_command);
	}

	, _destroy: function() {
		this._root_view	.dict("destroy")
						.off("red_command", this.$_on_command);
		$(window).off("keydown.red_keyboard_commands");
	}

	, _localize_functions: function() {
		var self = this;
		_.forEach(arguments, function(fn_name) {
			self["$"+fn_name] = _.bind(self[fn_name], self);
		});
	}

	, _on_command: function(event) {
		var controller = this.option("controller");
		var command = event.command;
		controller._do(command);
	}

	, _setup_shortcut_listeners: function() {
		var self = this;
		var controller = this.option("controller");
		$(window).on("keydown.red_keyboard_commands", function(event) {
			if(event.ctrlKey || event.metaKey) {
				if(event.which === 90) { // 'Z'
					if(event.shiftKey) {
						controller.redo();
					} else {
						controller.undo();
					}
					event.preventDefault();
					event.stopPropagation();
				}
			} else if(event.which === 9) {
				if(event.shiftKey) {
					self._focus_prev();
				} else {
					self._focus_next();
				}
				event.preventDefault();
				event.stopPropagation();
			}
		});
	}

	, _focus_next: function() {
		//console.log("focus next");
	}
	, _focus_prev: function() {
		//console.log("focus prev");
	}
});

}(red, jQuery));
