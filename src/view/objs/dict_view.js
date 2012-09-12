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
				var dict = cjs.create("red_dict");
				var direct_protos = cjs.create("red_cell", {str: "[]", ignore_inherited_in_contexts: [dict]});
				dict._set_direct_protos(direct_protos);
				return dict;
			}
			, "Stateful Object": function() {
				var dict = cjs.create("red_stateful_obj");
				var direct_protos = cjs.create("red_stateful_prop", {can_inherit: false, ignore_inherited_in_contexts: [dict]});
				dict._set_direct_protos(direct_protos);
				return dict;
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
		, show_protos: true
	}

	, _create: function() {
		this.element.addClass("dict");
		this._builtin_child_props = $("<div />").addClass("builtin dict_entries")
												.appendTo(this.element);
		this._direct_child_props = $("<div />")	.addClass("direct dict_entries")
												.appendTo(this.element);
		this._inherited_child_props = $("<div />")	.addClass("inherited dict_entries")
													.appendTo(this.element);
		if(this.option("show_protos")) {
			var my_dict = this.option("dict");
			var context = this.option("context");
			var direct_protos = my_dict.direct_protos();
			this._protos_view = $("<div />").appendTo(this._builtin_child_props)
											.dict_entry({
												prop_name: "(protos)"
												, dict: my_dict
												, context: context.push(direct_protos)
												, indent: this.option("indent")
												, static: true
												, value: direct_protos
											});
		}

		this._make_props_draggable();
		this._get_add_prop_button();

		this._add_change_listeners();

		if(this.option("context").last() !== this.option("dict")) debugger;
	}

	, _make_props_draggable: function() {
		var self = this;
		//console.log("make sortable", this.uuid);
		this._direct_child_props	.sortable({
										connectWith: ".direct.dict_entries"
										, axis: "y"
										, items: "> :not(.inherited)"
									})
									.on("sortover", function(event, ui) {
										//console.log("sort over");
										var my_indent = self.option("indent");
										var prop_div = ui.item;

										prop_div.dict_entry("option", "indent", my_indent);
										event.stopPropagation();
									})
									.on("sortstop", function(event, ui) {
										var prop_div = ui.item;
										var new_prop_parent = prop_div.parents(".dict").first();
										var new_prop_index = prop_div.index();
										var prop_name = prop_div.dict_entry("option", "prop_name");
										var command_event = $.Event("red_command");

										var my_dict = self.option("dict");
										var other_dict = new_prop_parent.dict("option", "dict");

										if(my_dict === other_dict) {
											command_event.command = self._get_move_prop_command(prop_name, new_prop_index);
										} else {
											command_event.command = self._get_set_parent_command(my_dict, other_dict, prop_name, new_prop_index);
										}

										self._direct_child_props.sortable("cancel");
										self.element.trigger(command_event);

										event.stopPropagation(); // don't want any parent dicts to listen
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

		if(key === "indent") {
			this._direct_child_props.children().each(function() {
				$(this).dict_entry("option", "indent", value);
			});
		}

		this._super(key, value);
	}

	, _destroy: function() {
		this.element.removeClass("dict");
		this._remove_change_listeners();
		this._add_prop_button.off("click.add_prop");
		this._add_prop_row.remove();
		//console.log("destroy sortable", this.uuid);
		this._direct_child_props.sortable("destroy")
		this._direct_child_props.add(this._inherited_child_props, this._builtin_child_props)
								.children().each(function() {
									$(this).dict_entry("destroy");
								})
								.end()
								.remove();
		this._inherited_child_props.remove();
		this._protos_view.dict_entry("destroy");
		this._builtin_child_props.remove();
	}

	, _add_change_listeners: function() {
		this._direct_prop_live_updater = this._get_prop_name_listener("direct", this._direct_child_props);
		this._inherited_prop_live_updater = this._get_prop_name_listener("inherited", this._inherited_child_props);
	}

	, _remove_change_listeners: function(dict) {
		dict = dict || this.option("cell");
		this._direct_prop_live_updater.destroy();
		delete this._direct_prop_live_updater;
		this._inherited_prop_live_updater.destroy();
		delete this._inherited_prop_live_updater;
	}

	, _get_prop_name_listener: function(direct_or_inherited, container) {
		var dict = this.option("dict");
		var context = this.option("context");
		var cached_prop_names = [];
		var self = this;
		return cjs.liven(function() {
			var prop_names;
			if(direct_or_inherited === "direct") {
				prop_names = dict._get_direct_prop_names();
			} else {
				prop_names = dict._get_inherited_prop_names(context);
			}
			var diff = _.diff(cached_prop_names, prop_names);
			//_.defer(function() {
				if(diff.removed.length === 1 && diff.added.length === 1 && diff.moved.length === 0) {
					//console.log("probably rename");
				}
				_.forEach(diff.removed, function(info) {
					var index = info.index
						, prop_name = info.item;
					var item_view = container.children().eq(index);
					item_view.dict_entry("destroy");
					remove(item_view[0]);
				});
				_.forEach(diff.added, function(info) {
					var index = info.index
						, prop_name = info.item;
					var item_view = $("<div />").dict_entry({
						prop_name: prop_name
						, dict: self.option("dict")
						, context: context
						, indent: self.option("indent")
					});
					insert_at(item_view[0], container[0], index);
				});
				_.forEach(diff.moved, function(info) {
					var from_index = info.from_index
						, to_index = info.to_index
						, prop_name = info.item;
					var prop_row = self._get_prop_row(prop_name, container);
					var prop_row_index = prop_row.index();
					move(prop_row[0], prop_row_index, to_index);
				});

				//console.log("refresh sortable", self.uuid);
				if(direct_or_inherited === "direct") {
					container.sortable("refresh");
				}
			//});
			cached_prop_names = prop_names;
		});
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

	, _get_prop_row: function(prop_name, container) {
		var prop_rows = container.children();
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

	, _get_set_parent_command: function(from_parent, to_parent, prop_name, index) {
		var prop = from_parent._get_direct_prop(prop_name);
		var command = red.command("set_prop_parent", {
			from_parent: from_parent
			, to_parent: to_parent
			, prop_name: prop_name
			, to_index: index
			, value: prop
		});
		return command;
	}

});

}(red, jQuery));
