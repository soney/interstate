(function(red, $) {
var cjs = red.cjs, _ = red._;

$.widget("red.dom_output", {
	
	options: {
		root: undefined
		, context: undefined
	}

	, _create: function() {
		this.element.css("height", "100px");
		this._add_change_listeners();
	}

	, _destroy: function() {
		this._remove_change_listeners();
	}

	, _add_change_listeners: function() {
		var root = this.option("root");
		var root_context = this.option("context");

		this._dom_tree_fn = cjs.liven(function() {
			var dom_attachment = root.get_attachment_instance("dom", root_context);
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

});

}(red, jQuery));
