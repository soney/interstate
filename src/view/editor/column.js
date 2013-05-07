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
			edit_text: "edit"
		},

		_create: function () {
			this.element.addClass("col");
			this.tbody = $("<tbody />")	.appendTo(this.element);
			this.header = $("<tr />")	.appendTo(this.tbody)
										.addClass("header");

			this.prev_cell = $("<th />")	.addClass("prev");

			this.prev_button = $("<a />")	.addClass("prev")
											.attr("href", "javascript:void(0)")
											.appendTo(this.prev_cell)
											.text("<");

			this.obj_name_cell = $("<th />")	.appendTo(this.header)
												.addClass("obj_name")
												.text(this.option("name"))
												.on("click touchstart", $.proxy(this.on_header_click, this));

			this.edit_cell = $("<th />")	.addClass("edit val_col");

			this.edit_button = $("<a />")	.addClass("edit button")
											.attr("href", "javascript:void(0)")
											.appendTo(this.edit_cell)
											.text(this.option("edit_text"));

			this.info_col = $("<tr />")	.appendTo(this.tbody)
										.addClass("info");
			this.info_cell = $("<td />")	.appendTo(this.info_col)
											.addClass("info");
			var filler_cell = $("<td />")	.appendTo(this.info_col)
											.addClass("filler");

			this.add_children_listener();

			if(this.option("is_curr_col")) {
				this.on_curr_col();
			} else {
				this.on_not_curr_col();
			}

			this.$on_prev_click = $.proxy(this.on_prev_click, this);
		},

		on_curr_col: function() {
			if(this.option("prev_col") && this.option("show_prev")) {
				this.obj_name_cell.attr("colspan", "1");
				this.info_cell.attr("colspan", "1");
				this.prev_cell.insertBefore(this.obj_name_cell);
				this.prev_cell.on("click touchstart", this.$on_prev_click);
			} else {
				this.obj_name_cell.attr("colspan", "2");
				this.info_cell.attr("colspan", "2");
			}

			this.edit_cell.insertAfter(this.obj_name_cell);
			this.element.addClass("curr_col");
			this.build_src_view();
			if(this.selected_child_disp) {
				this.selected_child_disp.prop("on_deselect");
			}
		},

		on_not_curr_col: function() {
			if(this.option("prev_col") && this.option("show_prev")) {
				this.prev_cell.off("click touchstart", this.$on_prev_click);
				this.prev_cell.remove();
			}
			this.obj_name_cell.attr("colspan", "3");
			this.info_cell.attr("colspan", "3");
			this.edit_cell.remove();
			this.element.removeClass("curr_col");
			this.destroy_src_view();
		},

		on_header_click: function(event) {
			this.element.trigger("header_click", this);
			event.stopPropagation();
			event.preventDefault();
		},

		on_prev_click: function(event) {
			console.log("prev click");
			this.element.trigger("prev_click", this);
			event.stopPropagation();
			event.preventDefault();
		},

		add_children_listener: function () {
			var INDEX_OFFSET = 2; // Account for the header column
			this.$on_child_select = $.proxy(this.on_child_select, this);
			var client = this.option("client");
			this.$children = client.get_$("children");

			var old_children = [];
			this.children_change_listener = cjs.liven(function() {
				var children = this.$children.get();
				if(_.isArray(children)) {
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
				}
			}, {
				context: this
			});
		},

		remove_children_listener: function () {
			this.children_change_listener.destroy();
		},

		_destroy: function () {
			this.remove_children_listener();
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
			var client = this.option("client");

			if(this.live_src_view) {
				this.live_src_view.destroy();
			}
			if(this.num_columns_view) {
				this.num_columns_view.destroy();
			}

			if(client.type() === "stateful") {
				this.statechart_view_container = $("<th />")	.appendTo(this.header)
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
						$("tr.child").prop("option", "layout_manager", this.layout_manager);
						this.paper = new Raphael(this.statechart_view_container[0], 0, 0);
						this.statechart_view = new red.RootStatechartView(statecharts, this.layout_manager, this.paper);
					}
				}, {
					context: this
				});

				this.num_columns_view = cjs.liven(function() {
					if(this.layout_manager) {
						var num_cols = this.layout_manager.get_num_cols();
						$("tr.child").prop("option", "show_src", true);
					}
				}, {
					context: this
				});
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
}(red, jQuery));
