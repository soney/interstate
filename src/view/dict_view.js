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
		, get_new_prop: function() {
			return cjs.create("red_cell", {str: ""});
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
		, execute_generated_commands: true
	}

	, _create: function() {
		this._child_props = $("<div />").appendTo(this.element);
		this._add_prop_row = $("<div />").appendTo(this.element);
		var self = this;
		this._add_prop_button = $("<a />")	.attr("href", "javascript:void(0)")
											.appendTo(this._add_prop_row)
											.text("+")
											.on("click.add_prop", function() {
												var command = self._get_add_prop_command();
												self._trigger("command", null, {
													command: command
												});
											});
		if(this.option("execute_generated_commands")) {
			this.element.on("dictcommand", function(event, data) {
				var command = data.command;
				command._do();
			});
		}
		_.defer(_.bind(this._add_change_listeners, this));
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		if(key === "execute_generated_commands") {
			if(old_value) {
				this.element.off("dictcommand.red_cell");
			}
			if(new_value) {
				this.element.on("dictcommand.red_cell", function(event, command) {
					command._do();
				});
			}
		}

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
						, indent: self.option("indent")+1
					});
					insert_at(item_view[0], self._child_props[0], index);
				});
				_.forEach(diff.moved, function() {
					var from_index = info.from_index
						, to_index = info.to_index
						, prop_name = info.item;

					var item_view = self._child_props.children().eq(from_index);
					move(item_view[0], from_index, to_index);
				});
			});
			cached_prop_names = prop_names;
		});
	}

	, _remove_change_listeners: function(dict) {
		dict = dict || this.option("cell");
		this._live_updater.destroy;
		delete this._live_updater;
	}

	, _get_add_prop_command: function() {
		var new_prop_name = this.option("get_new_prop_name")(this.option("dict"), this.option("context"));
		var new_prop = this.option("get_new_prop")(this.option("dict"), this.option("context"));

		var command = red.command("set_prop", {
			parent: this.option("dict")
			, name: new_prop_name
			, value: new_prop
		});

		return command;
	}
});

}(red, jQuery));
