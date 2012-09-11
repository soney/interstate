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
			var dom_attachment = node.get_attachment_instance("dom", context);
			if(_.isUndefined(dom_attachment)) { return false; }
			else {
				var children = node.get_prop("children", context);
				var children_context = context.push(children);

				var children_got = red.get_contextualizable(children, children_context);
				var prop_values = []

				if(children_got instanceof red.RedDict) {
					var prop_names = children.get_prop_names(children_context);
					prop_values = _.map(prop_names, function(prop_name) {
						return children.get_prop(prop_name, children_context);
					});
				} else if(_.isArray(children)) {
					prop_values = children;
				}
				var child_attachments = _.map(prop_values, function(prop_value) {
					return get_attachment_instances(prop_value, children_context.push(prop_value));
				});
				child_attachments = _.compact(child_attachments);
				return {
					attachment: dom_attachment
					, children: child_attachments
				};
			}
		};

		this._dom_tree_fn = cjs.liven(function() {
			var dom_tree = get_attachment_instances(root, root_context);
		});
	}

	, _remove_change_listeners: function() {
	}

});

}(red, jQuery));
