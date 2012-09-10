(function(red, $) {
var cjs = red.cjs, _ = cjs._;

$.widget("red.environment", {
	
	options: {
		controller: undefined
	}

	, _create: function() {
		var controller = this.option("controller");
		this.dom_output = $("<div />")	.appendTo(this.element)
										.dom_output({
											root: controller.get_root()
											, context: controller.get_root_context()
										});
		this.root = $("<div />").appendTo(this.element)
								.root({
									controller: this.option("controller")
								});
	}

	, _destroy: function() {
		this.dom_output	.dom_output("destroy")
						.remove();
		this.root	.root("destroy")
					.remove();
	}

});

}(red, jQuery));
