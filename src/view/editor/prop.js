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
			this.element.addClass("child");

			this.name_cell = $("<td />")	.addClass("name")
											.appendTo(this.element);

			this.name_span = $("<span />")	.addClass("prop_name")
											.editable_text({
												text: this.option("name"),
												edit_event: "dblclick"
											})
											.on("text_change", $.proxy(function(e) {
												var event = new $.Event("command");
												event.command_type = "rename";
												event.from_name = this.option("name");
												event.to_name = e.str;
												event.client = this.option("obj");

												this.element.trigger(event);
											}, this))
											.appendTo(this.name_cell);

			this.value_summary = $("<td />")	.appendTo(this.element)
												.value_summary({
													value: this.option("value"),
													inherited: this.option("inherited"),
													builtin: this.option("builtin")
												});

			if(this.option("inherited")) {
				this.element.addClass("inherited");
			} else if(this.option("builtin")) {
				this.element.addClass("builtin");
			}

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
			//this.element.pressable("destroy");
		},

		on_key_down: function(event) {
			var keyCode = event.keyCode;
			var prev;
			if(keyCode === 40 || keyCode === 74) { //down or j
				var next = this.element.next();
				if(next) {
					next.focus();
				}
			} else if(keyCode === 38 || keyCode === 75) { // up or k
				prev = this.element.prev();
				if(prev) {
					prev.focus();
				}
			} else if(keyCode === 13) { // Enter
				this.begin_rename();
			} else if(keyCode === 39 || keyCode === 79) { // Right or o
				this.element.trigger("expand");
			} else if(keyCode === 37) { // Left
				this.element.trigger("prev");
			} else if(keyCode === 8) { //Backspace
				prev = this.element.prev();
				if(prev) {
					prev.focus();
				}
				this.unset();
				event.preventDefault();
			} else {
				console.log(keyCode);
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
			console.log("open a context menu");
			event.preventDefault();
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
						var $active_value = client.get_$("active_value");
						this.live_prop_vals_fn = cjs.liven(function() {
							var values = $values.get();
							var states = $states.get();
							var active_value = $active_value.get();

							this.src_cell.children().remove();

							_.each(states, function(state) {
								if(state) {
									var view = $("<span />").unset_prop({
										left: layout_manager.get_x(state)
									}).on("click", $.proxy(function() {
										var event = new $.Event("command");
										event.command_type = "set_stateful_prop_for_state";
										event.prop = this.option("value");
										event.state = state;

										this.element.trigger(event);
									}, this));
									view.appendTo(this.src_cell);
								}
							}, this);

							_.each(values, function(value_info) {
								var value = value_info.value,
									state = value_info.state;

								var active = active_value && active_value.value === value && value !== undefined;
								if(state) {
									var view = $("<span />").prop_cell({
										left: layout_manager.get_x(state),
										width: layout_manager.get_width(state),
										value: value,
										active: active,
										state: state,
										prop: this.option("value")
									});
									view.appendTo(this.src_cell);
								}
							}, this);
						}, {
							context: this
						});
					}
				} else if(value.type() === "cell") {
					var $str = value.get_$("get_str");
					this.live_cell_str_fn = cjs.liven(function() {
						this.src_cell.children().remove();

						var str = $str.get();
						var cell_disp = $("<span />")	.addClass("pure_cell")
														.appendTo(this.src_cell)
														.text(str);
					}, {
						context: this
					});
				} else {
					this.src_cell.addClass("cannot_modify");
				}
			} else {
				this.src_cell.addClass("cannot_modify");
			}
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
		begin_editing: function() {
			this.element.addClass("editing");

			this.value_summary.value_summary("begin_editing");
			if(!this.option("inherited") && !this.option("builtin")) {
				this.drag_handle = $("<span />").addClass("drag_handle")
												.prependTo(this.name_cell)
												.html("&#9776;");

				this.remove_button = $("<div />")	.addClass("menu_item")	
													.text("Remove")
													.pressable()
													.on("pressed", $.proxy(function(event) {
														edit_dropdown.dropdown("collapse");
														this.unset();
														event.preventDefault();
														event.stopPropagation();
													}, this));
				this.rename_button = $("<div />")	.addClass("menu_item")	
													.text("Rename")
													.pressable()
													.on("pressed", $.proxy(function(event) {
														this.edit_dropdown.dropdown("collapse");
														this.begin_rename();
														event.preventDefault();
														event.stopPropagation();
													}, this));
				this.types = _.map(type_options, function(type_name) {
					return $("<div />")	.addClass("menu_item")
										.text(type_name)
										.pressable()
										.on("pressed", $.proxy(function(e) {
											edit_dropdown.dropdown("collapse");
											var event = new $.Event("command");
											event.command_type = "set_type";
											event.type_name = type_name;
											event.client = this.option("obj");
											event.prop_name = this.option("name");
											this.element.trigger(event);
											event.preventDefault();
											event.stopPropagation();
										}, this));
				}, this);
				this.change_type_button = $("<div />")	.addClass("menu_item")
														.submenu({
															text: "Set Type",
															items: this.types
														});

			
				this.edit_dropdown = $("<span />")	.appendTo(this.name_cell)
													.addClass("edit_prop")
													.dropdown({
														text: this.option("name"),
														items: [this.change_type_button, this.rename_button, this.remove_button]
													});

				var edit_dropdown = this.edit_dropdown;
				this.name_span.hide();
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
		done_editing: function() {
			this.value_summary.value_summary("done_editing");								
			this.element.removeClass("editing");
			if(this.change_type_button) {
				this.change_type_button.submenu("destroy");
			}
			if(this.edit_dropdown) {
				this.edit_dropdown	.dropdown("destroy")
									.remove();
			}
			if(this.drag_handle) {
				this.drag_handle.remove();
			}
			/*
			if(this.remove_button) {
				this.remove_button.remove();
			}
			if(this.rename_input) {
				this.rename_input.remove();
			}
			*/
			this.name_span.show();
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
