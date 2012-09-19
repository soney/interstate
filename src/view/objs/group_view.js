(function(red, $) {
var cjs = red.cjs, _ = red._;

var insert_at = function(child_node, parent_node, index) {
	var children = parent_node.childNodes;
	if(children.length <= index) {
		parent_node.appendChild(child_node);
	} else {
		var before_child = children[index];
		parent_node.insertBefore(child_node, before_child);
	}
};
var remove = function(child_node) {
	var parent_node = child_node.parentNode;
	if(parent_node) {
		parent_node.removeChild(child_node);
	}
};
var move = function(child_node, from_index, to_index) {
	var parent_node = child_node.parentNode;
	if(parent_node) {
		if(from_index < to_index) { //If it's less than the index we're inserting at...
			to_index++; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
		}
		insert_at(child_node, parent_node, to_index);
	}
};

$.widget("red.group", {
	
	options: {
		group: undefined
		, context: undefined
		, indent: 0
	}

	, _create: function() {
		var group = this.option("group");
		var context = this.option("context");

		this.element.addClass("group");
		this._builtin_child_props = $("<div />").addClass("builtin dict_entries")
												.appendTo(this.element);
		var basis = group.get_basis();
		this._basis_view = $("<div />").appendTo(this._builtin_child_props)
										.dict_entry({
											prop_name: "(basis)"
											, dict: group
											, context: context.push(basis)
											, indent: this.option("indent")
											, static: true
											, value: basis
										});

		var template = group.get_template();
		this._template_view = $("<div />").appendTo(this._builtin_child_props)
										.dict_entry({
											prop_name: "(template)"
											, dict: group
											, context: context.push(template)
											, indent: this.option("indent")
											, static: true
											, value: template
										});
		this._add_change_listeners();
	}

	, _create_add_prop_row: function(prop_type, factory) {
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		this._super(key, value);
	}

	, _destroy: function() {
		this._remove_change_listeners();
		this.element.removeClass("group");
		this._basis_view.dict_entry("destroy");
		this._template_view.dict_entry("destroy");
	}

	, _add_change_listeners: function() {
	}

	, _remove_change_listeners: function() {
	}

});

}(red, jQuery));
