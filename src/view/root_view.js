(function(red, $) {
var cjs = red.cjs, _ = cjs._;

$.widget("red.root", {
	
	options: {
		controller: undefined
	}

	, _create: function() {
		this._localize_functions("_on_command");
		var controller = this.option("controller");
		var root = controller.get_root();
		this._root_view = $("<div />")	.dict({
												dict: controller.get_root()
												, context: controller.get_root_context()
										})
										.appendTo(this.element)
										.on("red_command", this.$_on_command);

	}

	, _destroy: function() {
		this._root_view.destroy();
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

});

}(red, jQuery));
