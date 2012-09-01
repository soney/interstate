(function(red, $) {
var cjs = red.cjs, _ = cjs._;

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

$.widget("red.dict", {
	
	options: {
		dict: undefined
		, context: undefined
		, property_types: ["Cell", "Dictionary", "Stateful Object", "Stateful Property"]
		, property_factories: {
			"Cell": function() {
				return cjs.create("red_cell", {str: ""});
			}
			, "Dictionary": function() {
				return cjs.create("red_dict");
			}
			, "Stateful Object": function() {
				return cjs.create("red_stateful_obj");
			}
			, "Stateful Property": function() {
				return cjs.create("red_stateful_prop");
			}
		}
		, get_new_prop_name: function(dict, context) {
			var prop_names = dict.get_prop_names(context);

			var num_props = _.size(prop_names);
			var prop_name = "prop_" + num_props;

			var original_prop_name = prop_name;
			var prop_try = 0;
			while(_.indexOf(prop_names, prop_name) >= 0) {
				prop_name = original_prop_name + "_" + prop_try;
				prop_try++;
			}
			return prop_name;
		}
		, indent: 0
	}

	, _create: function() {
		this._child_props = $("<div />").appendTo(this.element);

		this._make_props_draggable();
		this._get_add_prop_button();


		_.defer(_.bind(this._add_change_listeners, this));
	}

	, _make_props_draggable: function() {
		var self = this;
		this._child_props	.sortable()
		/*
							.bind("sortstart", function(event, ui) {
								var prop_div = ui.item;
								var prop_name = prop_div.dict_entry("option", "prop_name");
							})
							.bind("sortchange", function(event, ui) {
								var prop_div = ui.item;
							})
		*/
							.bind("sortstop", function(event, ui) {
								var prop_div = ui.item;
								var new_prop_index = prop_div.index();
								var prop_name = prop_div.dict_entry("option", "prop_name");

								var event = $.Event("red_command");
								event.command = self._get_move_prop_command(prop_name, new_prop_index);
								self.element.trigger(event);
							});
	}

	
	, _create_add_prop_row: function(prop_type, factory) {
		var li = $("<li />");
		var link = $("<a tabindex='-1' href='javascript:void(0)' />")	.text(prop_type)
																		.appendTo(li);

		var self = this;
		link.on("click", _.bind(function() {
			var prop = factory.apply(self);
			var event = $.Event("red_command");
			event.command = self._get_add_prop_command(prop);
			self.element.trigger(event);
		}, this));
		return li;
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		this._super(key, value);
	}

	, _destroy: function() {
		this._add_prop_row.remove();
		this._child_props.remove();
	}

	, _add_change_listeners: function(dict) {
		dict = dict || this.option("dict");
		var cached_prop_names = [];
		var self = this;
		this._live_updater = cjs.liven(function() {
			var prop_names = dict.get_prop_names(self.option("context"));
			var diff = _.diff(cached_prop_names, prop_names);
			_.defer(function() {
				if(diff.removed.length === 1 && diff.added.length === 1 && diff.moved.length === 0) {
					console.log("probably rename");
				}
				_.forEach(diff.removed, function(info) {
					var index = info.index
						, prop_name = info.item;
					var item_view = self._child_props.children().eq(index);
					item_view.dict_entry("destroy");
					remove(item_view[0]);
				});
				_.forEach(diff.added, function(info) {
					var index = info.index
						, prop_name = info.item;
					var item_view = $("<div />").dict_entry({
						prop_name: prop_name
						, dict: self.option("dict")
						, context: self.option("context")
						, indent: self.option("indent")
					});
					insert_at(item_view[0], self._child_props[0], index);
				});
				_.forEach(diff.moved, function(info) {
					var from_index = info.from_index
						, to_index = info.to_index
						, prop_name = info.item;
					var prop_row = self._get_prop_row(prop_name);
					var prop_row_index = prop_row.index();
					//move(prop_row, prop_row_index, to_index);
				});
				self._child_props.sortable("refresh");
			});
			cached_prop_names = prop_names;
		});
	}

	, _remove_change_listeners: function(dict) {
		dict = dict || this.option("cell");
		this._live_updater.destroy;
		delete this._live_updater;
	}

	// === PROPERTY VIEWS ===

	, _get_add_prop_button: function() {
		var prop_types = this.option("property_types");
		var factories = this.option("property_factories");

		var self = this;

		var default_factory = factories[prop_types[0]];
		this._add_prop_row = $("<div />").appendTo(this.element);
		this._add_prop_button_group = $("<div />")	.addClass("btn-group")	
													.appendTo(this._add_prop_row);
		this._add_prop_button = $("<button />")	.addClass("btn")
												.html("Add property")
												.on("click.add_prop", function() {
													var value = default_factory();
													var event = $.Event("red_command");
													event.command = self._get_add_prop_command(value);
													self.element.trigger(event);
												})
												.appendTo(this._add_prop_button_group);

		this._add_prop_dropdown = $("<button />")	.addClass("btn dropdown-toggle")
													.attr("data-toggle", "dropdown")
													.html("<span class='caret'></span>")
													.appendTo(this._add_prop_button_group);

		this._dropdown_menu = $("<ul />")	.addClass("dropdown-menu")
											.appendTo(this._add_prop_button_group);

		_.forEach(prop_types, function(prop_type, index) {
			var factory = factories[prop_type];
			self._dropdown_menu.append(self._create_add_prop_row(prop_type, factory));
			if(index === 0) {
				self._dropdown_menu.append($("<li class='divider'></li>"));
			}
		});

		return this._add_prop_row;
	}

	, _get_prop_row: function(prop_name) {
		var prop_rows = this._child_props.children();
		for(var i = 0; i<prop_rows.length; i++) {
			var prop_row = prop_rows.eq(i);
			if(prop_name === prop_row.dict_entry("option", "prop_name")) {
				return prop_row;
			}
		}
		return undefined;
	}

	// === COMMANDS ===

	, _get_add_prop_command: function(prop_value) {
		var new_prop_name = this.option("get_new_prop_name")(this.option("dict"), this.option("context"));

		var command = red.command("set_prop", {
			parent: this.option("dict")
			, name: new_prop_name
			, value: prop_value
		});

		return command;
	}

	, _get_move_prop_command: function(prop_name, index) {
		var command = red.command("move_prop", {
			parent: this.option("dict")
			, name: prop_name
			, to: index
		});

		return command;
	}

});

}(red, jQuery));
