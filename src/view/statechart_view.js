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
		, inherited: false
	}

	, _create: function() {
		this.element.addClass("statechart");	
		this._child_states = $("<span />").addClass("states").appendTo(this.element);
		this._transitions = $("<span />").addClass("transitions").appendTo(this.element);
		this._add_change_listeners();
		if(!this.option("inherited")) {
			this._create_add_state_button();
			this._make_states_draggable();
		}
	}

	, _destroy: function() {
		this.element.removeClass("statechart");	
		this._remove_change_listeners();
		if(!this.option("inherited")) {
			this._destroy_add_state_button();
			this._child_states	.off("sortover")
								.off("sortstop")
								.sortable("destroy");
		}
		this._child_states.children().each(function() {
			$(this).state("destroy");
		});
		this._transitions.children().each(function() {
			$(this).transition("destroy");
		});
		this._transitions.remove();
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
		return undefined;
	}
	, _get_transition_view: function(transition) {
		var children = this._transitions.children();
		for(var i = 0; i<children.length; i++) {
			var child = children.eq(i);
			if(child.transition("option", "transition") === transition) {
				return child;
			}
		}
		return undefined;
	}

	, _add_change_listeners: function() {
		var statechart = this.option("statechart");
		var cached_substates = [];
		var cached_transitions = [];
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
				state_view.state("destroy");
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

		this._transitions_live_fn = cjs.liven(function() {
			var transitions = statechart.get_transitions();
			var diff = _.diff(cached_transitions, transitions);

			_.forEach(diff.removed, function(info) {
				var index = info.index
					, transition = info.item;
				var transition_view = self._get_transition_view(transition);
				transition_view.transition("destroy");
				remove(transition_view[0]);
			});
			_.forEach(diff.added, function(info) {
				var index = info.index
					, transition = info.item;
				var transition_view = $("<span />");
				insert_at(transition_view[0], self._transitions[0], index);
				transition_view.transition({
					transition: transition
					, index: index
					, inherited: self.option("inherited")
				});
			});
			_.forEach(diff.moved, function(info) {
				var from_index = info.from_index
					, to_index = info.to_index
					, transition = info.item;
				var transition_view = self._get_transition_view(transition);
				move(transition_view[0], from_index, to_index);
				transition_view.transition("option", "index", to_index);
			});

			cached_transitions = transitions;
		});

	}

	, _remove_change_listeners: function() {
		this._states_live_fn.destroy();
		this._transitions_live_fn.destroy();
	}

	, _get_add_state_command: function() {
		var statechart = this.option("statechart");
		var get_new_state_name = this.option("get_new_state_name");

		statechart = statechart.get_basis() || statechart;

		return red.command("add_state", {
			statechart: statechart
			, name: get_new_state_name(statechart)
		});
	}

	, _get_move_state_command: function(state, to_index) {
		var parent = this.option("statechart");
		var state_name = state.get_name(parent);

		parent = parent.get_basis() || parent;

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
		this._transition_adder = $("<span />")	.appendTo(this.element)
												.addClass("transition_adder")
												.on("mousedown.send_transition", function(event) {
													var statechart = $(this).parents(".statechart");
													$(".transition_adder", statechart)	.not(this)
																						.on("mouseup.receive_transition", function() {
																							var from_state = self.option("statechart");
																							var to_state = $(this).parent(".state").state("option", "statechart");
																							$(".transition_adder", statechart).off("mouseup.receive_transition");
																							var event = $.Event("red_command");
																							event.command = self._get_add_transition_command(from_state, to_state);
																							self.element.trigger(event);
																						});
													$(window).one("mouseup", function() {
														$(".transition_adder", statechart).off("mouseup.receive_transition");
													});
													event.stopPropagation();
													event.preventDefault();
												})
												.css({
													width: "20px"
													, height: "100px"
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
		this._transition_adder	.off("mousedown.send_transition")
								.remove();
		this._remove_change_listeners();
	}

	, _add_change_listeners: function() {
		var self = this;
		var statechart = this.option("statechart");
		var root = statechart.get_root();
		this._state_name_fn = cjs.liven(function() {
			var name = statechart.get_name(statechart.parent());
			self._state_label.editable("option", "str", name);
		});
		this._state_active_fn = cjs.liven(function() {
			if(root.is(statechart)) {
				self.element.addClass("active");
			} else {
				self.element.removeClass("active");
			}
		});
	}

	, _remove_change_listeners: function() {
		this._state_name_fn.destroy();
	}

	, _get_rename_state_command: function(to_name) {
		var statechart = this.option("statechart");
		var parent = statechart.parent();
		var from_name = statechart.get_name(parent);

		parent = parent.get_basis() || parent;

		return red.command("rename_state", {
			statechart: parent
			, from: from_name
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

	, _get_add_transition_command: function(from_state, to_state) {
		var from_name = from_state.get_name(parent);
		var to_name = to_state.get_name(parent);
		var dict_parent = this.element.parents(".dict").dict("option", "dict");

		var parent = from_state.parent();
		parent = parent.get_basis() || parent;

		return red.command("add_transition", {
			event: cjs.create_event("red_event", dict_parent, "")
			, statechart: parent
			, from: from_name
			, to: to_name
		});
	}
});

var state = {
	idle: 0
	, editing: 1
};
$.widget("red.transition", {
	options: {
		transition: undefined
		, index: 0
		, inherited: false
	}

	, _create: function() {
		var transition = this.option("transition");
		var from = transition.from();
		this.element.addClass("transition");
		this._arrow = $("<span />").addClass("arrow").appendTo(this.element);

		this.$edit = _.bind(this.edit, this);
		this.element.on("click", this.$edit);
		this._state = state.idle;

		if(from.get_type() === "pre_init") {
			this.element.hide();
		} else {
			if(!this.option("inherited")) {
				this.edit();
			}
		}
		this._add_change_listeners();
	}

	, _destroy: function() {
		this._remove_change_listeners();
		this._arrow.remove();
		this.element.removeClass("transition");
		this.element.off("click", this.$edit);
	}

	, edit: function() {
		if(this._state === state.idle) {
			this._state = state.editing;

			var self = this;
			this._text_box = $("<input />")	.appendTo(self.element)
											.on("keydown.transition_edit", function() {
												if($(this).is(":focus")) {
													if(event.which === 27) { //Esc
														self.cancel();
													} else if(event.which === 13) { //Enter
														self.confirm();
													}
												}
											})
											.val(this._get_transition_event_str())
											.select()
											.focus();
		}
	}
	, confirm: function() {
		if(this._state === state.editing) {
			this._state = state.idle;
			var value = this._text_box.val();

			var command_event = $.Event("red_command");

			if(value === "") {
				command_event.command = this._get_remove_transition_command();
			} else {
				command_event.command = this._get_set_event_command(value);
			}

			this.element.trigger(command_event);

			this._text_box	.off("keydown.transition_edit")
							.remove();
		}
	}
	, cancel: function() {
		if(this._state === state.editing) {
			this._state = state.idle;
			this._text_box.off("keydown.transition_edit")
							.remove();
		}
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		if(key === "index") {
			this.element.css({
				top: (value * 4) + "px"
			});
		}

		this._super(key, value);
	}

	, _add_change_listeners: function() {
		var transition = this.option("transition");
		var self = this;
		this._transition_pos_fn = cjs.liven(function() {
			var from = transition.from();
			var to = transition.to();
			var parent = from.parent();
			var parent_states = parent.get_substates();
			var from_index = _.indexOf(parent_states, from);
			var to_index = _.indexOf(parent_states, to);
			var from_x = (from_index - 1) * 100;
			var to_x = (to_index -1 ) * 100;

			var minx = Math.min(from_x, to_x);
			var maxx = Math.max(from_x, to_x);
			var width = maxx - minx;
			var left = minx;
			self.element.css({
				width: width+"px"
				, left: left+"px"
				, top: (self.option("index") * 4) + "px"
			});
			if(from_x < to_x) {
				self._arrow.css({
					left: width + "px"
				});
			}
			else {
				self._arrow.css({
					left: "0px"
				});
			}
		});
	}

	, _remove_change_listeners: function() {
		this._transition_pos_fn.destroy();
	}

	, _get_transition_event_str: function() {
		var transition = this.option("transition");
		var event = transition.get_event();
		return event.get_str();
	}


	, _get_remove_transition_command: function() {
		var transition = this.option("transition");
		transition = transition.get_basis() || transition;
		return red.command("remove_transition", {
			transition: transition
			, statechart: transition.get_statechart()
		})
	}
	
	, _get_set_event_command: function(str) {
		var transition = this.option("transition");
		transition = transition.get_basis() || transition;
		return red.command("set_transition_event", {
			transition: transition
			, event: str
			, statechart: transition.get_statechart()
		})
	}
});

}(red, jQuery));
