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

$.widget("red.statechart", {
	
	options: {
		statechart: undefined
		, filter: function(state) {
			return state.get_type() !== "pre_init";
		}
		, has_add_state_button: true
		, get_new_state_name: function(statechart) {
			var substate_names = statechart.get_substate_names();

			var num_substates = _.size(substate_names);
			var state_name = "state_" + num_substates;

			var original_state_name = state_name;
			var prop_try = 0;
			while(_.indexOf(substate_names, state_name) >= 0) {
				state_name = original_state_name + "_" + prop_try;
				prop_try++;
			}
			return state_name;
		}
	}

	, _create: function() {
		this._child_states = $("<span />").appendTo(this.element);
		this._add_change_listeners();
		this._create_add_state_button();
		this._make_states_draggable();
	}

	, _destroy: function() {
		this._remove_change_listeners();
		this._destroy_add_state_button();
		this._child_states.sortable("destroy");
		this._child_states.children().each(function() {
			$(this).state("destroy");
		});
		this._child_states.remove();
	}

	, _make_states_draggable: function() {
		var self = this;
		//console.log("make sortable", this.uuid);
		this._child_states	.sortable({
								axis: "x"
							})
							.on("sortover", function(event) { event.stopPropagation(); })
							.on("sortstop", function(event, ui) {
								var state_span = ui.item;
								var new_state_index = state_span.index();
								var state = state_span.state("option", "statechart");

								var command_event = $.Event("red_command");
								command_event.command = self._get_move_state_command(state, new_state_index + 1); // add one to index to account for _pre_init

								self._child_states.sortable("cancel");
								self.element.trigger(command_event);

								event.stopPropagation(); // don't want any parents to listen
							});
	}

	, _create_add_state_button: function() {
		this._add_state = $("<span />")	.addClass("add_state")
										.appendTo(this.element);
		var self = this;
		this._add_state_button = $("<a />")	.addClass("add_state_button")
											.attr("href", "javascript:void(0)")
											.on("click.add_state", function() {
												var state_name = self.option("get_new_state_name")(self.option("statechart"));
												var event = $.Event("red_command");
												event.command = self._get_add_state_command();
												self.element.trigger(event);
											})
											.appendTo(this._add_state)
											.text("+");
	}
	, _destroy_add_state_button: function() {
		this._add_state_button.off("click.add_state").remove();
		this._add_state.remove();
	}

	, _get_state_view: function(state) {
		var children = this._child_states.children();
		for(var i = 0; i<children.length; i++) {
			var child = children.eq(i);
			if(child.state("option", "statechart") === state) {
				return child;
			}
		}
		return state;
	}

	, _add_change_listeners: function() {
		var statechart = this.option("statechart");
		var cached_substates = [];
		var filter = this.option("filter");
		var self = this;
		this._states_live_fn = cjs.liven(function() {
			var substates = statechart.get_substates();
			substates = _.filter(substates, filter);

			var diff = _.diff(cached_substates, substates);

			_.forEach(diff.removed, function(info) {
				var index = info.index
					, state = info.item;
				var state_view = self._get_state_view(state);
				remove(state_view[0]);
			});
			_.forEach(diff.added, function(info) {
				var index = info.index
					, state= info.item;
				var state_view = $("<span />").state({
					statechart: state
				});
				insert_at(state_view[0], self._child_states[0], index);
			});
			_.forEach(diff.moved, function(info) {
				var from_index = info.from_index
					, to_index = info.to_index
					, state = info.item;
				var state_view = self._get_state_view(state);
				move(state_view[0], from_index, to_index);
			});

			cached_substates = substates;
		});
	}

	, _remove_change_listeners: function() {
		this._states_live_fn.destroy();
	}

	, _get_add_state_command: function() {
		var statechart = this.option("statechart");
		var get_new_state_name = this.option("get_new_state_name");

		return red.command("add_state", {
			statechart: statechart
			, name: get_new_state_name(statechart)
		});
	}

	, _get_move_state_command: function(state, to_index) {
		var parent = this.option("statechart");
		var state_name = state.get_name(parent);
		return red.command("move_state", {
			statechart: parent
			, name: state_name
			, index: to_index
		});
	}
});

$.widget("red.state", {
	options: {
		statechart: undefined
	}

	, _create: function() {
		var self = this;
		this.element.addClass("state");
		this._handle = $("<span />").appendTo(this.element)
									.addClass("handle")
									.css({
										width: "20px"
										, height: "20px"
										, display: "inline-block"
										, "background-color": "red"
									});
		this._state_label = $("<span />")	.addClass("state_name")
											.appendTo(this.element)
											.editable()
											.on("editablesetstr.rename_state", function(event, data) {
												event.stopPropagation();
												var str = data.value;
												var event = $.Event("red_command");
												if(str === "") {
													event.command = self._get_remove_state_command();
												} else {
													event.command = self._get_rename_state_command(str);
												}
												self.element.trigger(event);
											});
		this._add_change_listeners();
	}

	, _destroy: function() {
		this.element.removeClass("state");
		this._state_label	.off("editablesetstr.rename_state")
							.editable("destroy")
							.remove();
		this._handle.remove();
		this._remove_change_listeners();
	}

	, _add_change_listeners: function() {
		var statechart = this.option("statechart");
		var self = this;
		this._state_name_fn = cjs.liven(function() {
			var name = statechart.get_name(statechart.parent());
			self._state_label.editable("option", "str", name);
		});
	}

	, _remove_change_listeners: function() {
		this._state_name_fn.destroy();
	}

	, _get_rename_state_command: function(to_name) {
		var statechart = this.option("statechart");
		var parent = statechart.parent();
		return red.command("rename_state", {
			statechart: parent
			, from: statechart.get_name(parent)
			, to: to_name
		});
	}

	, _get_remove_state_command: function() {
		var statechart = this.option("statechart");
		var parent = statechart.parent();
		return red.command("remove_state", {
			statechart: parent
			, name: statechart.get_name(parent)
		});
	}
});

}(red, jQuery));
