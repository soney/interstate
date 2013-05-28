/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	
	var insert_at = function (child_node, parent_node, index) {
		var children = parent_node.childNodes;
		if (children.length <= index) {
			parent_node.appendChild(child_node);
		} else {
			var before_child = children[index];
			parent_node.insertBefore(child_node, before_child);
		}
	};
	var remove = function (child_node) {
		var parent_node = child_node.parentNode;
		if (parent_node) {
			parent_node.removeChild(child_node);
		}
	};
	var move = function (child_node, from_index, to_index) {
		var parent_node = child_node.parentNode;
		if (parent_node) {
			if (from_index < to_index) { //If it's less than the index we're inserting at...
				to_index += 1; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
			}
			insert_at(child_node, parent_node, to_index);
		}
	};

	var type_options = {
		"obj": "Object",
		"prop": "Property"
	};

	$.widget("red.prop", {
		options: {
			name: "",
			value: false,
			inherited: false,
			builtin: false,
			layout_manager: false,
			show_src: false,
			obj: false
		},

		_create: function() {
			var value = this.option("value");
			if(value instanceof red.WrapperClient) {
				value.signal_interest();
			}
			this.element.addClass("child");

			this.name_cell = $("<td />")	.addClass("name")
											.appendTo(this.element);

/*
			this.drag_handle = $("<span />").addClass("drag_handle")
											.appendTo(this.name_cell)
											.html("&#9776;");
											*/
			this.name_span = $("<span />")	.addClass("prop_name")
											.editable_text({
												text: this.option("name"),
												edit_event: "dblclick"
											})
											.on("text_change", $.proxy(function(e) {
												this.rename(e.str);
											}, this))
											.on("done_editing", $.proxy(function(e) {
												this.element.focus();
											}, this))
											.appendTo(this.name_cell);

			this.value_summary = $("<td />")	.appendTo(this.element)
												.value_summary({
													value: this.option("value"),
													inherited: this.option("inherited"),
													builtin: this.option("builtin")
												});

			if(this.option("inherited")) {
				this.element.addClass("inherited")
							.on("click", $.proxy(this.inherit, this));
			} else if(this.option("builtin")) {
				this.element.addClass("builtin");
			}

			this.edit_menu = $("<div />")	.addClass("edit")
											.appendTo(this.name_cell)
											.hide();
			this.rename_button = $("<div />")	.appendTo(this.edit_menu)
												.addClass("item")
												.on("mousedown", $.proxy(this.begin_rename, this))
												.attr("tabindex", 2)
												.text("Rename");
			this.remove_button = $("<div />")	.appendTo(this.edit_menu)
												.addClass("item")
												.on("mousedown", $.proxy(this.unset, this))
												.attr("tabindex", 2)
												.text("Remove");


			//this.element.pressable();
			this.element.on("click", $.proxy(this.on_click, this));
			this.element.on("contextmenu", $.proxy(this.on_context_menu, this));
			this.element.on("keydown", $.proxy(this.on_key_down, this));
			if(this.option("show_src")) {
				this.on_show_src();
			} else {
				this.on_hide_src();
			}
		},

		_destroy: function() {
			this._super();
			this.on_hide_src();
			//this.element.pressable("destroy");
			var value = this.option("value");
			if(value instanceof red.WrapperClient) {
				value.signal_destroy();
			}
		},

		rename: function(str) {
			var old_name = this.option("name");
			if(red.is_valid_prop_name(str)) {
				var event = new $.Event("command");
				event.command_type = "rename";
				event.from_name = old_name;
				event.to_name = str;
				event.client = this.option("obj");

				this.element.trigger(event);
			} else {
				this.name_span.editable_text("option", "text", old_name);
				var problem_str = red.get_prop_name_error(str);
				console.log(problem_str);
			}
		},

		on_key_down: function(event) {
			var table, prev, next;
			var keyCode = event.keyCode;
			if(this.element.is(event.target)) {
				if(keyCode === 40 || keyCode === 74) { //down or j
					if(this.edit_menu.is(":visible")) {
						this.edit_menu.children().first().focus();
					} else {
						next = this.element.next(":focusable");
						if(next.length>0) {
							next.focus();
						} else {
							table = this.element.parent().parent();
							table.focus();
						}
					}
				} else if(keyCode === 38 || keyCode === 75) { // up or k
					prev = this.element.prev(":focusable");
					if(prev.length>0) {
						prev.focus();
					} else {
						table = this.element.parent().parent();
						table.focus();
					}
				} else if(keyCode === 13) { // Enter
					if(this.option("inherited")) {
						this.inherit();
					} else {
						this.begin_rename();
					}
				} else if(keyCode === 39 || keyCode === 79 || keyCode === 76) { // Right or o or k
					if(this.option("inherited")) {
						this.inherit();
					} else {
						var focusable_children = $(":focusable", this.element).first();
						if(focusable_children.length > 0) {
							focusable_children.first().focus();
						} else {
							this.element.trigger("expand");
						}
					}
				} else if(keyCode === 37 || keyCode === 72) { // Left
					table = this.element.parent().parent();
					prev = table.prev();
					if(prev.length>0) {
						var selected_child = $(".child.selected", prev);
						if(selected_child.length > 0) {
							selected_child.focus();
						} else {
							prev.focus();
						}
					}
				} else if(keyCode === 8) { //Backspace
					prev = this.element.prev(":focusable");
					if(prev.length>0) {
						prev.focus();
					} else {
						next = this.element.next(":focusable");
						if(next.length>0) {
							next.focus();
						} else {
							table = this.element.parent().parent();
							table.focus();
						}
					}
					this.unset();
					event.preventDefault();
				} else if(keyCode === 27) { // Esc
					if(this.edit_menu.is(":visible")) {
						this.hide_edit_menu();
					} else {
						table = this.element.parent().parent();
						table.focus();
					}
				} else if(keyCode === 187 && event.shiftKey) { // +
					event.stopPropagation();
					event.preventDefault();
					table = this.element.parent().parent();
					table.column("add_property");
				} else if(keyCode === 69) { // e
					if(this.edit_menu.is(":visible")) {
						this.hide_edit_menu();
					} else {
						this.show_edit_menu();
					}
				} else {
					//console.log(keyCode);
				}
			} else if(this.edit_menu.is($(event.target).parents())) {
				if(keyCode === 40 || keyCode === 74) { //down or j
					next = $(event.target).next(":focusable");
					if(next.length > 0) {
						next.focus();
					}
				} else if(keyCode === 38 || keyCode === 75) { // up or k
					prev = $(event.target).prev(":focusable");
					if(prev.length > 0) {
						prev.focus();
					}
				} else if(keyCode === 13) { // Enter
					$(event.target).trigger("mousedown");
				} else if(keyCode === 27) { // Esc
					this.hide_edit_menu();
					this.element.focus();
				}
			}
		},

		on_click: function(event) {
			event.stopPropagation();
			event.preventDefault();
			if(this.element.not(".selected")) {
				this.element.trigger("expand");
			}
		},
		on_context_menu: function(event) {
			event.preventDefault();
			this.show_edit_menu();
		},
		show_edit_menu: function() {
			this.edit_menu.show();
			this.close_edit_menu_listener = $.proxy(function(e) {
				this.hide_edit_menu();
				e.preventDefault();
				e.stopPropagation();
			}, this);
			$(window).on("mousedown", this.close_edit_menu_listener);
		},
		hide_edit_menu: function() {
			this.edit_menu.hide();
			$(window).off("mousedown", this.close_edit_menu_listener);
		},
		on_select: function() {
			this.element.addClass("selected");
		},
		on_deselect: function() {
			this.element.removeClass("selected");
		},
		on_show_src: function() {
			this.src_cell = $("<td />")	.addClass("src")
										.appendTo(this.element);

			var value = this.option("value");
			if(value instanceof red.WrapperClient) {
				if(value.type() === "stateful_prop") {
					var layout_manager = this.option("layout_manager");
					if(layout_manager) {
						var client = value;
						var $states = client.get_$("get_states");
						var $values = client.get_$("get_values");
						//var $active_value = client.get_$("active_value");
						this.live_prop_vals_fn = cjs.liven(function() {
							this.src_cell.children().remove();

							var values_infos = $values.get();
							var states_infos = $states.get();

							var values = _.map(values_infos, function(vi) {
								//return client.process_value(vi);
								return vi;
							});
							var states = _.map(states_infos, function(vi) {
								//return client.process_value(vi);
								return vi;
							});
							//var active_value = $active_value.get();

							var view;

							_.each(states, function(state) {
								if(state) {
									var value_info = _.find(values, function(value_info) { return value_info.state === state; });
									if(value_info) {
										//var active = active_value && active_value.value === value && value !== undefined;
										var val = value_info.value;
										view = $("<span />").prop_cell({
											left: layout_manager.get_x(state),
											width: layout_manager.get_width(state),
											value: val,
											//active: active,
											state: state,
											prop: this.option("value")
										});
										view.appendTo(this.src_cell);
										if(this.__awaiting_value_for_state === state) {
											if((new Date()).getTime() - this.__awaiting_value_for_state_set_at < 500) { // HUGE hack
												view.prop_cell("begin_editing")
													.prop_cell("select")
													.prop_cell("focus");
											} else {
												delete this.__awaiting_value_for_state;
												delete this.__awaiting_value_for_state_set_at;
											}
										}
									} else {
										view = $("<span />").unset_prop({
											left: layout_manager.get_x(state)
										}).on("click", $.proxy(function() {
											this.__awaiting_value_for_state = state;
											this.__awaiting_value_for_state_set_at = (new Date()).getTime();
											var event = new $.Event("command");
											event.command_type = "set_stateful_prop_for_state";
											event.prop = this.option("value");
											event.state = state;

											this.element.trigger(event);
										}, this));
										view.appendTo(this.src_cell);
									}
								}
							}, this);
						}, {
							context: this,
							on_destroy: function() {
								$(this.src_cell).children().each(function() {
									var $this = $(this);
									if($this.data("unset_prop")) {
										$this.unset_prop("destroy");
									} else if($this.data("prop_cell")) {
										$this.prop_cell("destroy");
									}
								}).remove();
								$states.signal_destroy();
								$values.signal_destroy();
							}
						});
					}
				} else if(value.type() === "cell") {
					var $str = value.get_$("get_str");
					this.live_cell_str_fn = cjs.liven(function() {
						var str = $str.get();
						this.src_cell.children().remove();
						var cell_disp = $("<span />")	.addClass("pure_cell")
														.appendTo(this.src_cell)
														.editable_text({
															text: str
														});
						if(!this.option("inherited")) {
							cell_disp	.on("click", $.proxy(function() {
											cell_disp.editable_text("edit");
										}, this))
										.on("text_change", $.proxy(function(e) {
											var event = new $.Event("command");
											event.command_type = "set_str";
											event.str = e.str;
											event.client = value;

											this.element.trigger(event);
										}, this));
						}
					}, {
						context: this,
						on_destroy: function() {
							$str.signal_destroy();
						}
					});
				} else {
					this.src_cell.addClass("cannot_modify");
				}
			} else {
				this.src_cell.addClass("cannot_modify");
			}
		},
		inherit: function() {
			var event = new $.Event("command");
			event.command_type = "inherit";
			event.name = this.option("name");
			event.client = this.option("obj");
			event.value = this.option("value");

			this.element.trigger(event);
		},
		on_hide_src: function() {
			if(this.live_prop_vals_fn) {
				this.live_prop_vals_fn.destroy();
				delete this.live_prop_vals_fn;
			}

			if(this.live_cell_str_fn) {
				this.live_cell_str_fn.destroy();
				delete this.live_cell_str_fn;
			}
			if(this.src_cell) {
				this.src_cell.remove();
				delete this.src_cell;
			}
		},
		unset: function() {
			var event = new $.Event("command");
			event.command_type = "unset";
			event.name = this.option("name");
			event.client = this.option("obj");

			this.element.trigger(event);
		},
		begin_rename: function() {
			this.name_span.editable_text("edit");
		},
		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "show_src") {
				if(value) {
					this.on_show_src();
				} else {
					this.on_hide_src();
				}
			} else if(key === "layout_manager") {
				if(this.option("show_src")) {
					this.on_hide_src();
					this.on_show_src();
				}
			}
		}
	});
}(red, jQuery));
