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
			name: "root",
			prev_col: false,
			show_prev: false,
			is_curr_col: false,
			show_source: true,
			edit_text: "(edit)",
			editing_text: "(done)",
			curr_copy_client: false
		},

		_create: function () {
			this.element.addClass("col");
			this.tbody = $("<tbody />")	.appendTo(this.element);
			this.header = $("<tr />")	.appendTo(this.tbody)
										.addClass("header");

			this.$on_copy_select = $.proxy(this.on_copy_select, this);

			this.obj_name_cell = $("<th />")	.appendTo(this.header)
												.attr("colspan", "2")
												.addClass("obj_name")
												.text(this.option("name"))
												.pressable()
												.on("pressed", $.proxy(this.on_header_click, this));
			this.copy_disp = $("<span />")	.copy({ client: this.option("client") })
											.on("curr_copy_change", this.$on_copy_select)
											.appendTo(this.obj_name_cell);

			this.prev_button = $("<a />")	.addClass("prev")
											.attr("href", "javascript:void(0)")
											.prependTo(this.obj_name_cell)
											.pressable()
											.text("<");

			this.info_row = $("<tr />")	.appendTo(this.tbody)
										.addClass("info");
			this.info_cell = $("<td />")	.appendTo(this.info_row)
											.attr("colspan", "2")
											.addClass("info");

			this.edit_button = $("<div />")	.addClass("edit button")
											.pressable()
											.appendTo(this.info_cell)
											.text(this.option("edit_text"));

			this.add_children_listener();
			this.add_curr_copy_listener();

			this.$on_prev_click = $.proxy(this.on_prev_click, this);
			this.$on_edit_click = $.proxy(this.on_edit_click, this);

			if(this.option("is_curr_col")) {
				this.on_curr_col();
			} else {
				this.on_not_curr_col();
			}
			var client = this.option("client");
			client.async_get("instances", $.proxy(function(instances) {
				if(instances) {
					var instance = instances[0];
					this.option("curr_copy_client", instance);
					this.destroy_src_view();
					this.build_src_view();
					this.remove_children_listener();
					this.add_children_listener();
				}
			}, this));
		},

		on_curr_col: function() {
			if(this.option("prev_col") && this.option("show_prev")) {
				this.prev_button	.show()
									.on("pressed", this.$on_prev_click);
			} else {
				this.prev_button	.off("pressed", this.$on_prev_click)
									.hide();
			}

			this.edit_button.show();
			this.element.addClass("curr_col");
			this.build_src_view();
			if(this.selected_child_disp) {
				this.selected_child_disp.prop("on_deselect");
			}
		},

		on_not_curr_col: function() {
			if(this.option("prev_col") && this.option("show_prev")) {
				this.prev_button.off("pressed", this.$on_prev_click)
								.hide();
			}
			this.edit_button.hide();
			this.element.removeClass("curr_col");
			this.destroy_src_view();
		},

		on_header_click: function(event) {
			this.element.trigger("header_click", this);
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
		},

		add_children_listener: function () {
			var INDEX_OFFSET = 2; // Account for the header column
			this.$on_child_select = $.proxy(this.on_child_select, this);
			var client = this.option("curr_copy_client");

			if(!client) {
				client = this.option("client");
			}
			this.$children = client.get_$("children");

			var none_display = $("<tr />")	.addClass("no_children")
											.html("<td colspan='3'>(no properties)</td>");
			var old_children = [];
			this.children_change_listener = cjs.liven(function() {
				var children = this.$children.get();
				if(_.isArray(children)) {
					if(children.length > 0) {
						none_display.remove();
					}
					var diff = _.diff(old_children, children);

					_.forEach(diff.removed, function (info) {
						var index = info.from, child = info.from_item;
						var child_disp = this.tbody.children().eq(index + INDEX_OFFSET);
						child_disp.prop("destroy");
						remove(child_disp[0]);
					}, this);
					_.forEach(diff.added, function (info) {
						var index = info.to, child = info.item;
						var child_disp = $("<tr />");
						insert_at(child_disp[0], this.tbody[0], index + INDEX_OFFSET);
						child_disp.prop({
							value: child.value,
							name: child.name,
							inherited: child.inherited,
							layout_manager: this.layout_manager,
							show_src: this.option("show_source")
						}).on("select", $.proxy(this.on_child_select, this, child, child_disp));
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
				context: this
			});
		},

		remove_children_listener: function () {
			this.children_change_listener.destroy();
			/*
			this.$children.destroy();
			delete this.$children;
			*/
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

		add_curr_copy_listener: function () { },

		remove_curr_copy_listener: function() { },

		_destroy: function () {
			if(this.prev_button.data("pressable")) {
				this.prev_button.pressable("destroy");
			}
			this.remove_children_listener();
			this.remove_curr_copy_listener();
		},
		on_child_select: function(child_info, child_disp, event) {
			var client = child_info.value;
			if(client instanceof red.WrapperClient && (client.type() === "dict" || client.type() === "stateful")) {
				if(this.selected_child_disp) {
					this.selected_child_disp.prop("on_deselect");
				}
				this.selected_child_disp = child_disp;
				this.selected_child_disp.prop("on_select");
			}
			this.element.trigger("child_select", child_info);
		},
		build_src_view: function() {
			this.destroy_src_view();
			var client = this.option("curr_copy_client");

			if(!client) {
				client = this.option("client");
			}

			if(this.live_src_view) {
				this.live_src_view.destroy();
			}
			if(this.num_columns_view) {
				this.num_columns_view.destroy();
			}

			if(client.type() === "stateful") {
				this.statechart_view_container = $("<th />")	.appendTo(this.header)
																.attr("rowspan", "2")
																.addClass("statechart");
				var $statecharts = client.get_$("get_statecharts");

				this.live_src_view = cjs.liven(function() {
					if(this.paper) {
						this.paper.remove();
					}
					var wrappers = $statecharts.get();
					var statecharts = _.map(wrappers, function (wrapper) {
						return red.create_remote_statechart(wrapper);
					});

					if(this.layout_manager) {
						delete this.layout_manager;
					}

					if(statecharts) {
						this.layout_manager = new red.RootStatechartLayoutEngine(statecharts);
						$("tr.child", this.element).prop("option", "layout_manager", this.layout_manager);
						this.paper = new Raphael(this.statechart_view_container[0], 0, 0);
						this.statechart_view = new red.RootStatechartView(statecharts, this.layout_manager, this.paper);
					}
				}, {
					context: this
				});

				this.num_columns_view = cjs.liven(function() {
					if(this.layout_manager) {
						var num_cols = this.layout_manager.get_num_cols();
						$("tr.child", this.element).prop("option", "show_src", true);
					}
				}, {
					context: this
				});
			} else {
				this.filler_view_container = $("<th />").appendTo(this.header)
														.attr("rowspan", "2");
				$("tr.child", this.element).prop("option", "show_src", true);
			}
		},
		destroy_src_view: function() {
			if(this.layout_engine) {
				delete this.layout_engine;
			}
			if(this.live_src_view) {
				this.live_src_view.destroy();
			}
			if(this.num_columns_view) {
				this.num_columns_view.destroy();
			}
			if(this.statechart_view) {
				this.statechart_view.destroy();
			}
			if(this.statechart_view_container) {
				this.statechart_view_container.remove();
			}
			if(this.filler_view_container) {
				this.filler_view_container.remove();
			}
			if(this.paper) {
				this.paper.remove();
			}
			$("tr.child").prop("option", "show_src", false);
		},
		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "is_curr_col") {
				if(value) {
					this.on_curr_col();
				} else {
					this.on_not_curr_col();
				}
			}
		}
	});

	$.widget("red.copy", {
		options: {
			curr_copy: false,
			out_of: 0,
			client: false,
			displayed: false
		},

		_create: function () {
			this.left_brace = $("<span />").text(" [").addClass("brace");
			this.content = $("<span />");
			this.right_brace = $("<span />").text("]").addClass("brace");

			this.curr_copy_text = $("<span />")	.addClass("copy_num");
			this.of_text = $("<span />")	.addClass("of_text");

			this.content.append(this.curr_copy_text, this.of_text);

			this.element.addClass("copy");

			if(this.option("displayed")) {
				this.on_displayed();
			}

			this.$on_click = $.proxy(this.on_click, this);
			this.$on_blur = $.proxy(this.on_blur, this);
			this.$on_change = $.proxy(this.on_change, this);
			this.$on_key_down = $.proxy(this.on_key_down, this);
			this.content.on("click", this.$on_click);
			this.add_listener();
		},

		_destroy: function () {
			this.remove_listener();
		},

		on_click: function() {
			this.copy_num_input = $("<input />").attr({
													type: "number",
													min: 1,
													max: this.option("out_of")
												})
												.val(this.option("curr_copy") + 1)
												.addClass("copy_input")
												.insertBefore(this.content)
												.focus()
												.select()
												.on("blur", this.$on_blur)
												.on("change", this.$on_change)
												.on("keydown", this.$on_key_down);

			this.original_copy_num = this.option("curr_copy");
			this.content.hide();
		},

		on_blur: function() {
			this.copy_num_input	.off("blur", this.$on_blur)
								.off("change", this.$on_change)
								.remove();
			this.content.show();
		},

		on_change: function(event) {
			var value = parseInt(this.copy_num_input.val(), 10);
			this.option("curr_copy", value - 1);
		},

		on_key_down: function(jqEvent) {
			var event = jqEvent.originalEvent;
			if(event.keyCode === 13) { // Enter
				this.on_change();
				this.on_blur();
			} else if(event.keyCode === 27) { // Esc
				this.on_blur();
				this.option("curr_copy", this.original_copy_num);
			}
		},

		add_listener: function() {
			var client = this.option("client");
			var $is_template = client.get_$("is_template");
			var $copies = client.get_$("instances");
			this.copy_listener = cjs.liven(function() {
				var is_template = $is_template.get();
				if(is_template) {
					var copies = $copies.get();
					if(_.isArray(copies)) {
						var len = copies.length;
						this.option({
							displayed: true,
							out_of: len,
							curr_copy: Math.min(this.option("curr_copy"), len)
						});
					} else {
						this.option({
							displayed: false
						});
					}
				} else {
					this.option({
						displayed: false
					});
				}
			}, {
				context: this
			});
		},
		remove_listener: function() {
			this.copy_listener.destroy();
		},

		update_display: function() {
			if(this.option("curr_copy") === false) {
				this.curr_copy_text.text("");
				this.of_text.text(this.option("out_of"));
			} else  {
				this.curr_copy_text.text(this.option("curr_copy") + 1);
				this.of_text.text(" of " + this.option("out_of"));
			}
		},

		on_displayed: function() {
			this.update_display();
			this.element.append(this.left_brace, this.content, this.right_brace);
		},

		on_not_displayed: function() {
			this.element.children().remove();
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "displayed") {
				if(value) {
					this.on_displayed();
				} else {
					this.on_not_displayed();
				}
			} else if(key === "curr_copy" || key === "out_of") {
				if(key === "curr_copy") {
					this.element.trigger("curr_copy_change", value);
				}
				this.update_display();
			}

		}
	});
}(red, jQuery));
