/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael,RedMap */

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

			this.name_span = $("<span />")	.addClass("prop_name")
											.editable_text({
												text: this.option("name"),
												edit_event: "dblclick"
											})
											.on("text_change.name_span", _.bind(function(e) {
												this.rename(e.str);
											}, this))
											.on("done_editing.name_span".name_span, _.bind(function(e) {
												this.element.focus();
											}, this))
											.appendTo(this.name_cell);

			this.value_summary = $("<td />")	.appendTo(this.element)
												.value_summary({
													value: this.option("value"),
													inherited: this.option("inherited"),
													builtin: this.option("builtin")
												});

			this.edit_menu = $("<div />")	.addClass("edit")
											.appendTo(this.name_cell)
											.hide();
			if(this.option("inherited")) {
				this.element.addClass("inherited")
							.on("click.inherit", _.bind(this.inherit, this));
				this.inherit_button = $("<div />")	.appendTo(this.edit_menu)
													.addClass("item")
													.on("mousedown.inherit", _.bind(this.inherit, this))
													.attr("tabindex", 2)
													.text("Inherit");
			} else if(this.option("builtin")) {
				this.element.addClass("builtin");
			} else {
				this.rename_button = $("<div />")	.appendTo(this.edit_menu)
													.addClass("item")
													.on("mousedown.prop", _.bind(this.begin_rename, this))
													.attr("tabindex", 2)
													.text("Rename");
				this.remove_button = $("<div />")	.appendTo(this.edit_menu)
													.addClass("item")
													.on("mousedown.prop", _.bind(this.unset, this))
													.attr("tabindex", 2)
													.text("Delete");

				if(value && value.type && (value.type() === "stateful_prop" || value.type() === "stateful")) {
					var change_to_type = "";
					if(value.type() === "stateful_prop") {
						change_to_type = "Object";
					} else {
						change_to_type = "Property";
					}
					this.set_type_expand = $("<div />")	.appendTo(this.edit_menu)
														.addClass("item")
														.on("mousedown.prop", _.bind(this.change_type, this, change_to_type))
														.attr("tabindex", 2)
														.text("Change to " + change_to_type);
				}
			}


			//this.element.pressable();
			this.element.on("contextmenu.on_context_menu", _.bind(this.on_context_menu, this))
						.on("click.onclick", _.bind(this.on_click, this))
						.on("keydown.onkeydown", _.bind(this.on_key_down, this))
						.attr("draggable", true)
						.on("dragstart.ondragstart", _.bind(this.on_drag_start, this));

			if(this.option("show_src")) {
				this.on_show_src();
			} else {
				this.on_hide_src();
			}
		},

		_destroy: function() {
			this._super();
			this.name_span	.off("text_change.name_span done_editing.name_span")
							.editable_text("destroy")
							.remove();
			this.element.off("contextmenu.on_context_menu")
						.off("click.onclick")
						.off("keydown.onkeydown")
						.off("dragstart.ondragstart")
						.off("click.inherit");
			if(this.inherit_button) {
				this.inherit_button	.off("mousedown.inherit")
									.remove();
			}
			if(this.rename_button) {
				this.rename_button	.off("mousedown.prop")
									.remove();
			}
			if(this.remove_button) {
				this.remove_button	.off("mousedown.prop")
									.remove();
			}
			if(this.set_type_expand) {
				this.set_type_expand	.off("mousedown.prop")
										.remove();
			}
			this.on_hide_src();
			//this.element.pressable("destroy");
			var value = this.option("value");
			if(value instanceof red.WrapperClient) {
				value.signal_destroy();
			}
			delete this.options.client;
			delete this.options;
		},

		change_type: function(type) {
			var event = new $.Event("command");
			event.command_type = "set_type";
			event.client = this.option("obj");
			event.prop_name = this.option("name");
			event.type_name = type === "Object" ? "Object" : "Property";

			this.element.trigger(event);
		},

		on_drag_start: function(event) {
			event.preventDefault();
			event.stopPropagation();
			if(this.element.is(".inherited") || this.element.is(".builtin")) {
				return;
			}
			this.element.addClass("dragging");
			var curr_target = false;
			var above_below = false;
			var on_mmove = function(e) {
				above_below = 2 * e.offsetY > curr_target.height() ? "below" : "above";
				curr_target.addClass(above_below === "above" ? "dragtop" : "dragbottom");
				curr_target.removeClass(above_below === "above" ? "dragbottom" : "dragtop");
			};
			var on_mover_child = function(e) {
				curr_target = $(this);
				curr_target.addClass("dragtop");
				curr_target.on("mousemove", on_mmove);
			};
			var on_mout_child = function(e) {
				if(curr_target) {
					curr_target.removeClass("dragtop dragbottom");
					curr_target.off("mousemove", on_mmove);
					curr_target = false;
				}
			};
			var on_mup = _.bind(function() {
				targets.off("mouseover", on_mover_child);
				targets.off("mouseout", on_mout_child);
				$(window).off("mouseup", on_mup);
				this.element.removeClass("dragging");
				if(curr_target) {
					var my_obj = this.option("obj"),
						my_name = this.option("name");
					var target_name, target_obj;
					if(curr_target.is("tr.no_children")) {
						target_obj = curr_target.parents(".col").column("option", "client");
						target_name = false;
					} else {
						target_obj = curr_target.prop("option", "obj");
						target_name = curr_target.prop("option", "name");
					}

					curr_target.removeClass("dragtop dragbottom");
					curr_target.off("mousemove", on_mmove);
					curr_target = false;

					var event = new $.Event("command");
					event.command_type = "move_prop";
					event.from_obj = my_obj;
					event.from_name = my_name;
					event.target_obj = target_obj;
					event.target_name = target_name;
					event.above_below = above_below;

					this.element.trigger(event);
				}
			}, this);
			var targets = $("tr.child").not(".inherited").add("tr.no_children");

			targets.on("mouseover", on_mover_child);
			targets.on("mouseout", on_mout_child);
			$(window).on("mouseup", on_mup);
		},

		rename: function(str) {
			var old_name = this.option("name");
			if(this.element.is(".builtin")) {
				this.name_span.editable_text("option", "text", old_name);
				window.alert("Can't rename builtin property");
				return;
			} else if(this.element.is(".inherited")) {
				this.name_span.editable_text("option", "text", old_name);
				window.alert("Can't rename inherited property");
				return;
			}
			if(red.is_valid_prop_name(str)) {
				var to_return = false;
				var self = this;
				$("span.prop_name", this.element.parent()).each(function() {
					var child_parent = $(this).parents(".child");
					if(child_parent !== self && child_parent.data("red-prop") && child_parent.prop("option", "name") === str) {
						to_return = true;
						self.name_span.editable_text("option", "text", old_name);
						window.alert("Property with name '" + str + "' already exists");
					}
				});
				if(to_return) { return; }
				var event = new $.Event("command");
				event.command_type = "rename";
				event.from_name = old_name;
				event.to_name = str;
				event.client = this.option("obj");

				this.element.trigger(event);
			} else {
				this.name_span.editable_text("option", "text", old_name);
				var problem_str = red.get_prop_name_error(str);
				window.alert(problem_str);
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
						this.child_views = new RedMap({ });

						var client = value;
						var $states = client.get_$("get_states");
						var $values = client.get_$("get_values");
						var $active_value = client.get_$("active_value");
						this.live_prop_vals_fn = cjs.liven(function() {
							var values = $values.get();
							var states = $states.get();
							var active_value = $active_value.get();
							var view;

							var views = [];
							var to_edit_view = false;

							var found = false;
							var to_remove_elements = _.map(this.src_cell.children(), function(x) { return $(x); });
							_.each(states, function(state) {
								if(state) {
									var value_info = _.find(values, function(value_info) { return value_info.state === state; });
									var left = layout_manager.get_x(state);
									if(!left || left < 0) {
										return;
									}
									var key = value_info ? value_info.value : state;
									var i, v;

									if(value_info) {
										var val = value_info.value;
										var active = active_value && active_value.value === val && value !== undefined;
										view = false;
										for(i = 0; i<to_remove_elements.length; i++) {
											v = to_remove_elements[i];
											if(v.data("red-prop_cell") && v.prop_cell("option", "value") === val) {
												view = v;
												to_remove_elements.splice(i, 1);
												break;
											}
										}
										if(view) {
											view.prop_cell("option", {
												active: active,
												left: left
											});
										} else {
											view = $("<span />").prop_cell({
												left: left,
												width: layout_manager.get_width(state),
												value: val,
												active: active,
												state: state,
												prop: this.option("value")
											});
										}
									} else {
										view = false;
										for(i = 0; i<to_remove_elements.length; i++) {
											v = to_remove_elements[i];
											if(v.data("red-unset_prop") && v.unset_prop("option", "state") === state) {
												view = v;
												to_remove_elements.splice(i, 1);
												break;
											}
										}
										if(view) {
											view.unset_prop("option", {
												left: left
											});
										} else {
											view = $("<span />").unset_prop({
												left: left,
												state: state
											}).on("click", _.bind(function() {
												this.__awaiting_value_for_state = state;
												this.__awaiting_value_for_state_set_at = (new Date()).getTime();
												var event = new $.Event("command");
												event.command_type = "set_stateful_prop_for_state";
												event.prop = this.option("value");
												event.state = state;

												this.element.trigger(event);
											}, this));
										}
									}

									if(this.__awaiting_value_for_state === state) {
										if((new Date()).getTime() - this.__awaiting_value_for_state_set_at < 500) { // HUGE hack
											to_edit_view = view;
										} else {
											delete this.__awaiting_value_for_state;
											delete this.__awaiting_value_for_state_set_at;
										}
									}
									views.push(view);
								}
							}, this);
							_.each(to_remove_elements, function(view) {
								if(view.data("red-unset_prop")) {
									view.unset_prop("destroy");
								} else if(view.data("red-prop_cell")) {
									view.prop_cell("destroy");
								}
								view.remove();
							}, this);

							var sorted_views = _.sortBy(views, function(v) {
								if(v.data("red-prop_cell")) {
									return parseInt(v.prop_cell("option", "left"), 10);
								} else {
									return parseInt(v.unset_prop("option", "left"), 10);
								}
							});

							_.each(sorted_views, function(v, index) {
								insert_at(v[0], this.src_cell[0], index);
							}, this);
							if(to_edit_view) {
								if(to_edit_view.data("red-prop_cell")) {
									to_edit_view.prop_cell("begin_editing")
												.prop_cell("select")
												.prop_cell("focus");
								}
							}
						}, {
							context: this,
							on_destroy: function() {
								$(this.src_cell).children().each(function() {
									var $this = $(this);
									if($this.data("red-unset_prop")) {
										$this.unset_prop("destroy");
									} else if($this.data("red-prop_cell")) {
										$this.prop_cell("destroy");
									}
								});
								this.src_cell.empty();
								$states.signal_destroy();
								$values.signal_destroy();
							}
						});
					}
				} else if(value.type() === "cell") {
					var $str = value.get_$("get_str");
					this.live_cell_str_fn = cjs.liven(function() {
						var str = $str.get();
						this.src_cell.children().each(function() {
							var $this = $(this);
							if($this.data("red-unset_prop")) {
								$this.unset_prop("destroy");
							} else if($this.data("red-prop_cell")) {
								$this.prop_cell("destroy");
							}
						}).remove();
						this.src_cell.empty();
						var cell_disp = $("<span />")	.addClass("pure_cell")
														.appendTo(this.src_cell);
						if(this.option("inherited")) {
							cell_disp.text(str);
						} else {
							cell_disp	.editable_text({
											text: str
										})
										.on("text_change", _.bind(function(e) {
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
							this.src_cell.children().each(function() {
								var $this = $(this);
								if($this.data("red-unset_prop")) {
									$this.unset_prop("destroy");
								} else if($this.data("red-prop_cell")) {
									$this.prop_cell("destroy");
								}
							}).remove();
							this.src_cell.empty();
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
			if(!this.element.is(".inherited") && !this.element.is(".builtin")) {
				this.name_span.editable_text("edit");
			}
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
			} else if(key === "inherited") {
				if(value) {
					this.element.addClass("inherited");
				} else {
					this.element.removeClass("inherited");
				}
			}
		}
	});
}(red, jQuery));
