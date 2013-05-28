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

	$.widget("red.column", {
		options: {
			client: false,
			name: "sketch",
			prev_col: false,
			show_prev: false,
			is_curr_col: false,
			show_source: true,
			curr_copy_client: false
		},

		_create: function () {
			var client = this.option("client");
			client.signal_interest();
			this.element.addClass("col")
						.attr("tabindex", 1);

			this.tbody = $("<tbody />")	.appendTo(this.element);
			this.header = $("<tr />")	.appendTo(this.tbody)
										.addClass("header");

			this.$on_copy_select = $.proxy(this.on_copy_select, this);

			this.obj_name_cell = $("<th />")	.appendTo(this.header)
												.attr("colspan", "2")
												.addClass("obj_name");

			this.obj_name = $("<h2 />")	.text(this.option("name"))
										.appendTo(this.obj_name_cell)
										.pressable()
										.on("pressed", $.proxy(this.on_header_click, this));

			this.copy_disp = $("<span />")	.copy({ client: this.option("client") })
											.on("curr_copy_change", this.$on_copy_select)
											.appendTo(this.obj_name_cell);

			this.show_hide_options = $("<div />")	.text("options")
													.addClass("show_options button")
													.appendTo(this.obj_name_cell)
													.on("click", $.proxy(this.on_show_hide_options_click, this))
													.hide();
													

			this.prev_button = $("<a />")	.addClass("prev")
											.attr("href", "javascript:void(0)")
											.prependTo(this.obj_name_cell)
											.pressable()
											.text("<");

			this.$on_prev_click = $.proxy(this.on_prev_click, this);
			this.$on_edit_click = $.proxy(this.on_edit_click, this);

			this.options_row = $("<tr />")	.appendTo(this.tbody)
											.addClass("options");
			this.options_cell = $("<td />")	.appendTo(this.options_row)
											.attr("colspan", "2")
											.addClass("options");

			this.add_prop_row = $("<tr />")	.appendTo(this.tbody)
											.addClass("add_prop");
			this.add_prop_cell = $("<td />")	.appendTo(this.add_prop_row)
												.attr("colspan", "2")
												.addClass("add_prop");

			this.add_property_button = $("<div />")	.addClass("add_prop")
													.appendTo(this.add_prop_cell)
													.text("Add Property")
													.pressable()
													.on("pressed", $.proxy(function() {
														this.add_property();
													}, this));

			this.add_children_listener();

			if(this.option("is_curr_col")) {
				this.on_curr_col();
			} else {
				this.on_not_curr_col();
			}
			client.async_get("is_template", $.proxy(function(is_template) {
				if(is_template) {
					client.async_get("instances", $.proxy(function(instances) {
						if(instances.length > 0) {
							var instance = instances[0];
							this.option("curr_copy_client", instance);
							this.destroy_src_view();
							this.build_src_view();
							this.remove_children_listener();
							this.add_children_listener();
						}
					}, this));
				}
			}, this));
			if(client.type() !== "stateful") {
				this.show_hide_options.hide();
			}
			this.element.on("keydown", $.proxy(this.on_key_down, this));
		},

		add_property: function() {
			this.awaiting_add_prop = true;
			var event = new $.Event("command");
			event.command_type = "add_property";
			event.client = this.option("client");
			this.element.trigger(event);
		},

		on_show_hide_options_click: function() {
			if(this.element.hasClass("showing_options")) {
				this.hide_options();
			} else {
				this.show_options();
			}
		},

		show_options: function() {
			this.show_hide_options.text("hide options");
			this.element.addClass("showing_options");

			this.options_form = $("<form />")	.addClass("options")
												.attr("action", "javascript:void(0)")
												.on("submit", $.proxy(this.done_editing, this))
												.prependTo(this.options_cell);

			var options_fieldset = $("<fieldset />").appendTo(this.options_form);
			var legend = $("<legend />").text("Options")
										.appendTo(options_fieldset);

			var copies_div = $("<div />")	.addClass("copies_option_container")
											.appendTo(options_fieldset);

			var copies_label = $("<label />")	.attr({
													"for": "copies"
												})
												.html("Copies:&nbsp;")
												.appendTo(copies_div);

			var copies_edit = $("<span />")	.editable_text({
												text: "",
												placeholder_text: "(undefined)"
											})
											.attr({
												id: "copies"
											})
											.appendTo(copies_div)
											.on("text_change", $.proxy(function(e) {
												var str = e.str;
												var event = new $.Event("command");
												event.command_type = "set_copies";
												event.client = this.option("client");
												event.str = str;
												this.element.trigger(event);
											}, this));
			options_fieldset.append("<hr />");

			var state_label = $("<label />").html("State:&nbsp;")
											.appendTo(options_fieldset);
			var reset_button = $("<span />").addClass("reset button")
											.text("Reset")
											.appendTo(options_fieldset)
											.pressable()
											.on("pressed", $.proxy(function() {
												var event = new $.Event("command");
												event.command_type = "reset";
												event.client = this.option("client");
												this.element.trigger(event);
											}, this));

			var client = this.option("client");
			var $copies_obj = client.get_$("copies_obj");
			var $copies_str;
			var $$copies_str = cjs.$(false);
			this.live_copies = cjs.liven(function() {
				var copies_obj = $copies_obj.get();
				if(copies_obj instanceof red.WrapperClient) {
					if(copies_obj.type() === "raw_cell") {
						$$copies_str.set(copies_obj.get_$("get_str"));
					}
				} else {
					copies_edit.editable_text("option", "text", "");
				}
			}, {
				context: this,
				on_destroy: function() {
					$copies_obj.signal_destroy();
				}
			});
			this.live_copies_str = cjs.liven(function() {
				if($copies_str) {
					$copies_str.signal_destroy();
				}
				$copies_str = $$copies_str.get();
				if($copies_str) {
					$copies_str.signal_interest();
					var copies_str = $copies_str.get();
					if(_.isString(copies_str)) {
						copies_edit.editable_text("option", "text", copies_str);
					}
				}
			}, {
				context: this,
				on_destroy: function() {
					if($copies_str) {
						$copies_str.signal_destroy();
					}
				}
			});
		},

		hide_options: function() {
			if(this.live_copies) {
				this.live_copies.destroy();
			}
			if(this.live_copies_str) {
				this.live_copies_str.destroy();
			}
			this.show_hide_options.text("options");
			this.element.removeClass("showing_options");
			if(this.options_form) {
				this.options_form.remove();
				delete this.options_form;
			}
		},

		on_key_down: function(event) {
			if(this.element.is(event.target)) {
				var keyCode = event.keyCode;
				var prev;

				if(keyCode === 40 || keyCode === 74) { //down or j
					var next = $("tr.child:focusable", this.element).first();
					if(next.length>0) {
						next.focus();
					}
				} else if(keyCode === 38 || keyCode === 75) { // up or k
					prev = $("tr.child:focusable", this.element).last();
					if(prev.length>0) {
						prev.focus();
					}
				} else if(keyCode === 37 || keyCode === 72) { // Left
					var prev_col = this.element.prev();
					if(prev_col.length>0) {
						var selected_child = $(".child.selected", prev_col);
						if(selected_child.length > 0) {
							selected_child.focus();
						} else {
							prev_col.focus();
						}
					}
				} else if(keyCode === 39 || keyCode === 76) { // Right or k
					var next_col = this.element.next();
					if(next_col.length>0) {
						next_col.focus();
					}
				} else if(keyCode === 79) { // o
					this.element.trigger("header_click", this);
				} else if(keyCode === 187 && event.shiftKey) { // +
					event.stopPropagation();
					event.preventDefault();
					this.add_property();
				} else if(keyCode === 8) { //Backspace
					event.stopPropagation();
					event.preventDefault();
				}
			}
		},

		on_curr_col: function() {
			var client = this.option("client");
			if(client.type() === "stateful") {
				this.show_hide_options.show();
			}
			if(this.option("prev_col") && this.option("show_prev")) {
				this.prev_button	.show()
									.on("pressed", this.$on_prev_click);
			} else {
				this.prev_button	.off("pressed", this.$on_prev_click)
									.hide();
			}

			this.element.addClass("curr_col");
			this.build_src_view();
			if(this.selected_child_disp) {
				if(this.selected_child_disp.data("prop")) { // need to check in case this.selected_child_disp was removed
					this.selected_child_disp.prop("on_deselect");
				}
			}
		},

		on_not_curr_col: function() {
			this.hide_options();
			this.show_hide_options.hide();
			if(this.option("prev_col") && this.option("show_prev")) {
				this.prev_button.off("pressed", this.$on_prev_click)
								.hide();
			}
			this.element.removeClass("curr_col");
			this.destroy_src_view();

			if(this.element.hasClass("editing")) {
				this.done_editing();
			}
		},

		on_header_click: function(event) {
			if(this.element.hasClass("editing")) {
				this.done_editing();
			} else {
				this.element.trigger("header_click", this);
			}
			event.stopPropagation();
			event.preventDefault();
		},

		on_prev_click: function(event) {
			this.element.trigger("prev_click", this);
			event.stopPropagation();
			event.preventDefault();
		},

		on_edit_click: function(event) {
			event.stopPropagation();
			event.preventDefault();
			if(this.element.hasClass("editing")) {
				this.done_editing();
			} else {
				this.begin_editing();
			}
		},

		add_children_listener: function () {
			var INDEX_OFFSET = 3; // Account for the header column
			this.$on_child_select = $.proxy(this.on_child_select, this);
			var client = this.option("curr_copy_client") || this.option("client");
			var $children = client.get_$("children");

			var none_display = $("<tr />")	.addClass("no_children")
											.html("<td colspan='3'>(no properties)</td>");
			var old_children = [];
			this.children_change_listener = cjs.liven(function() {
				var children = $children.get();
				if(_.isArray(children)) {
					if(children.length > 0) {
						none_display.remove();
					}
					var diff = _.diff(old_children, children, function(a, b) {
						return a.name === b.name && a.value === b.value;
					});

					_.forEach(diff.removed, function (info) {
						var index = info.from, child = info.from_item;
						var child_disp = this.tbody.children().eq(index + INDEX_OFFSET);
						child_disp.prop("destroy");
						remove(child_disp[0]);
						this.element.trigger("child_removed", child.value);
					}, this);
					_.forEach(diff.added, function (info) {
						var index = info.to, child = info.item;
						var child_disp = $("<tr />");
						insert_at(child_disp[0], this.tbody[0], index + INDEX_OFFSET);
						child_disp	.attr({
										tabindex: (index + 2) * 10
									})
									.prop({
										value: child.value,
										name: child.name,
										inherited: child.inherited,
										builtin: child.builtin,
										layout_manager: this.layout_manager,
										show_src: this.option("show_source"),
										obj: this.option("client")
									})
									.on("expand", $.proxy(this.on_child_select, this, child, child_disp));

						if(this.awaiting_add_prop) {
							child_disp	.prop("begin_rename");
							delete this.awaiting_add_prop;
							this.awaiting_rename_prop = true;
						} else if(this.awaiting_rename_prop) {
							this.on_child_select(child, child_disp);
							delete this.awaiting_rename_prop;
						}
					}, this);
					_.forEach(diff.moved, function (info) {
						var from_index = info.from, to_index = info.to, child = info.item;
						var child_disp = this.tbody.children().eq(from_index + INDEX_OFFSET);
						move(child_disp[0], from_index + INDEX_OFFSET, to_index + INDEX_OFFSET);
					}, this);
					old_children = children;

					if(children.length === 0) {
						this.tbody.append(none_display);
					}
				}
			}, {
				context: this,
				on_destroy: function() {
					$children.signal_destroy();
				}
			});
		},

		remove_children_listener: function () {
			if(this.children_change_listener) {
				this.children_change_listener.destroy();
				delete this.children_change_listener;
			}
			$("tr.child", this.tbody).prop("destroy").remove();
			$("tr.no_children", this.tbody).remove();
		},

		on_copy_select: function(event, copy_index) {
			var client = this.option("client");
			client.async_get("instances", $.proxy(function(instances) {
				if(instances) {
					var instance = instances[copy_index];
					this.option("curr_copy_client", instance);
					this.destroy_src_view();
					this.build_src_view();
					this.remove_children_listener();
					this.add_children_listener();
				}
			}, this));
		}, 

		_destroy: function () {
			this.remove_children_listener();
			this.destroy_src_view();
			var client = this.option("client");
			client.signal_destroy();
			this.option("curr_copy_client", false); // will destroy any curr copy client
			if(this.prev_button.data("pressable")) {
				this.prev_button.pressable("destroy");
			}
		},
		on_child_select: function(child_info, child_disp, event) {
			var client = child_info.value;
			if(client instanceof red.WrapperClient && (client.type() === "dict" || client.type() === "stateful")) {
				if(this.selected_child_disp) {
					if(this.selected_child_disp.data("prop")) { // need to check in case this.selected_child_disp was removed
						this.selected_child_disp.prop("on_deselect");
					}
				}
				this.selected_child_disp = child_disp;
				this.selected_child_disp.prop("on_select");
			}
			this.element.trigger("child_select", child_info);
		},
		build_src_view: function() {
			this.destroy_src_view();
			var client = this.option("curr_copy_client") || this.option("client");

			if(client.type() === "stateful") {
				this.statechart_view_container = $("<th />")	.appendTo(this.header)
																.attr("rowspan", "3")
																.addClass("statechart_cell");
				var $statecharts = client.get_$("get_statecharts");

				var statecharts = [], wrappers = [];
				var wrapper_infos = [];

				this.statechart_view = $("<div />")	.appendTo(this.statechart_view_container)
													.statechart({
														statecharts: statecharts
													});
				this.layout_manager = this.statechart_view.statechart("get_layout_manager");
				$("tr.child", this.element).prop("option", "layout_manager", this.layout_manager);

				this.live_src_view = cjs.liven(function() {
					var old_wrapper_infos = wrapper_infos;
					wrapper_infos = $statecharts.get() || [];
					var diff = _.diff(old_wrapper_infos, wrapper_infos, function(a, b) {
						return a.object_summary.id === b.object_summary.id;
					});
					_.forEach(diff.removed, function (info) {
						var index = info.from, child = info.from_item;

						var wrapper = wrappers[index];
						var statechart = statecharts[index];

						wrappers.splice(index, 1);
						statecharts.splice(index, 1);
						statechart.destroy();
					}, this);
					_.forEach(diff.added, function (info) {
						var index = info.to, child = info.item;
						var wrapper = child;
						var statechart = red.create_remote_statechart(wrapper);
						wrappers.splice(index, 0, wrapper);
						statecharts.splice(index, 0, statechart);
					}, this);
					_.forEach(diff.moved, function (info) {
						var from_index = info.from, to_index = info.to, child = info.item;

						var wrapper = wrappers[from_index];
						var statechart = statecharts[from_index];
						wrapper.splice(from_index, 1);
						wrappers.splice(to_index, 0, wrapper);
						statecharts.splice(from_index, 1);
						statecharts.splice(to_index, 0, statechart);
					}, this);
					if(diff.added.length > 0 || diff.removed.length > 0 || diff.moved.length > 0) {
						this.statechart_view.statechart("option", "statecharts", statecharts);
					}
				}, {
					context: this,
					on_destroy: function() {
						if(this.statechart_view) {
							$("tr.child", this.element).prop("option", "layout_manager", false);
							if(this.statechart_view.data("statechart")) {
								this.statechart_view.statechart("destroy");
							}
							this.statechart_view.remove();
						}
						_.each(statecharts, function(statechart) {
							statechart.destroy();
						});
						$statecharts.signal_destroy();
					}
				});

			} else {
				this.filler_view_container = $("<th />").appendTo(this.header)
														.attr("rowspan", "3");
			}
			$("tr.child", this.element).prop("option", "show_src", true);
		},
		destroy_src_view: function() {
			if(this.layout_engine) {
				this.layout_engine.destroy();
				delete this.layout_engine;
			}
			if(this.live_src_view) {
				this.live_src_view.destroy();
				delete this.live_src_view;
			}
			if(this.statechart_view) {
				if(this.statechart_view.data("statechart")) {
					this.statechart_view.statechart("destroy");
				}
				this.statechart_view.remove();
				delete this.statechart_view;
			}
			if(this.statechart_view_container) {
				this.statechart_view_container.remove();
				delete this.statechart_view_container;
			}
			if(this.filler_view_container) {
				this.filler_view_container.remove();
				delete this.filler_view_container;
			}
			if(this.paper) {
				this.paper.remove();
			}
			$("tr.child", this.element).prop("option", "show_src", false);
		},
		_setOption: function(key, value) {
			if(key === "curr_copy_client") {
				var old_value = this.option(key);
				if(old_value instanceof red.WrapperClient) {
					old_value.signal_destroy();
				}
			}
			this._super(key, value);
			if(key === "is_curr_col") {
				if(value) {
					this.on_curr_col();
				} else {
					this.on_not_curr_col();
				}
			} else if(key === "curr_copy_client") {
				if(value instanceof red.WrapperClient) {
					value.signal_interest();
				}
			}
		}
	});
}(red, jQuery));
