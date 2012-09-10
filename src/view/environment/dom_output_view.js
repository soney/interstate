(function(red, $) {
var cjs = red.cjs, _ = cjs._;

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

		var get_attachment_instances = function(node, context) {
			var attachment_instances = node.get_attachment_instances(context);
			
		};

		this._dom_tree_fn = cjs.liven(function() {
			var attachment_instances = get_attachment_instances(root, root_context);
		});
	}

	, _remove_change_listeners: function() {
	}

});

}(red, jQuery));
