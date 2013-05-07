/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var round_num = function(num, decimals) {
		var n = Math.pow(10, decimals);
		return Math.round(num*n)/n;
	};
	var summarized_val = function(val) {
		if(_.isString(val)) {
			return "'" + val + "'";
		} else if(_.isNumber(val)) {
			return round_num(val, 2);
		} else {
			return val;
		}
	};
	
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

	var to_func = function (value) {
		return function () { return value; };
	};

	$.widget("red.editor", {
		options: {
			debug_ready: false,
			full_window: true,
			server_window: window.opener,
			client_id: "",
			single_col_navigation: false
		},

		_create: function () {
			if(this.option("full_window")) {
				$("html").addClass("full_window_editor");
			}
			var communication_mechanism;
			if(this.option("server_window") === window) {
				communication_mechanism = new red.SameWindowCommWrapper(this.option("client_id")); 
			} else {
				communication_mechanism = new red.InterWindowCommWrapper(this.option("server_window"), this.option("client_id")); 
			}

			this.client_socket = new red.ProgramStateClient({
				ready_func: this.option("debug_ready"),
				comm_mechanism: communication_mechanism
			}).on("message", function (data) {
				if (data.type === "color") {
					var color = data.value;
				}
			}, this).on("loaded", function (root_client) {
				this.load_viewer(root_client);
			}, this);

			this.element.text("Loading...");
		},

		load_viewer: function (root_client) {
			this.element.html("");
			this.navigator = $("<div />")	.appendTo(this.element)
											.navigator({
												root_client: root_client,
												single_col: this.option("single_col_navigation")
											});


			$(window).on("keydown", _.bind(function (event) {
				if (event.keyCode === 90 && (event.metaKey || event.ctrlKey)) {
					if (event.shiftKey) { this.undo(); }
					else { this.redo(); }
					event.stopPropagation();
					event.preventDefault();
				}
			}, this));
		},

		undo: function() {
			this.client_socket.post_command("undo");
		},
		redo: function() {
			this.client_socket.post_command("redo");
		},

		_destroy: function () {
			this.navigator.navigator("destroy");
			this.client_socket.destroy();
		}
	});

	$.widget("red.navigator", {
		options: {
			root_client: false,
			single_col: false
		},
		_create: function() {
			this.element.attr("id", "obj_nav");
			var root_col = $("<table />")	.appendTo(this.element);
			root_col						.column({
												name: "root",
												client: this.option("root_client"),
												is_curr_col: true,
												show_prev: false
											})
											.on("child_select", $.proxy(this.on_child_select, this, root_col))
											.on("header_click", $.proxy(this.on_header_click, this, root_col))
											.on("prev_click", $.proxy(this.on_prev_click, this, root_col));
			this.curr_col = root_col;
			this.columns = [root_col];
		},
		_destroy: function() {
			_.each(this.columns, function(col) {
				col.column("destroy");
			});
		},
		on_child_select: function(column, event, child_info) {
			var value = child_info.value;
			if(value instanceof red.WrapperClient && (value.type() === "dict" || value.type() === "stateful")) {
				this.curr_col.column("option", "is_curr_col", false);

				var column_index = _.indexOf(this.columns, column);
				var subsequent_columns = this.columns.slice(column_index + 1);
				_.each(subsequent_columns, function(col) {
					col.column("destroy").remove();
				});
				this.columns.length = column_index + 1;
				var next_col = $("<table />")	.appendTo(this.element);
				next_col						.column({
													name: child_info.name,
													client: child_info.value,
													is_curr_col: true,
													prev_col: column,
													show_prev: this.option("single_col")
												})
												.on("child_select", $.proxy(this.on_child_select, this, next_col))
												.on("header_click", $.proxy(this.on_header_click, this, next_col))
												.on("prev_click", $.proxy(this.on_prev_click, this, next_col));
				this.columns.push(next_col);
				if(this.option("single_col")) {
					this.curr_col.hide();
				}
				this.curr_col = next_col;
			}
		},
		on_header_click: function(column, event, child_info) {
			var column_index = _.indexOf(this.columns, column);
			var subsequent_columns = this.columns.slice(column_index + 1);
			_.each(subsequent_columns, function(col) {
				col.column("destroy").remove();
			});
			this.columns.length = column_index + 1;
			this.curr_col = column;
			this.curr_col.column("option", "is_curr_col", true);
		},
		on_prev_click: function(column, event) {
			var column_index = _.indexOf(this.columns, column);
			var subsequent_columns = this.columns.slice(column_index);
			_.each(subsequent_columns, function(col) {
				col.column("destroy").remove();
			});
			this.columns.length = column_index;
			this.curr_col = this.columns[column_index-1];
			this.curr_col.show();
			this.curr_col.column("option", "is_curr_col", true);
		}
	});

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
												.on("click", $.proxy(this.on_header_click, this));

			this.edit_cell = $("<th />")	.addClass("edit val_col");

			this.edit_button = $("<a />")	.addClass("edit button")
											.attr("href", "javascript:void(0)")
											.appendTo(this.edit_cell)
											.text(this.option("edit_text"));

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
				this.prev_cell.insertBefore(this.obj_name_cell);
				this.prev_cell.on("click", this.$on_prev_click);
			} else {
				this.obj_name_cell.attr("colspan", "2");
			}

			this.edit_cell.insertAfter(this.obj_name_cell);
			this.element.addClass("curr_col");
			this.build_src_view();
			if(this.selected_child_disp) {
				this.selected_child_disp.column_child("on_deselect");
			}
		},

		on_not_curr_col: function() {
			if(this.option("prev_col") && this.option("show_prev")) {
				this.prev_cell.off("click", this.$on_prev_click);
				this.prev_cell.remove();
			}
			this.obj_name_cell.attr("colspan", "3");
			this.edit_cell.remove();
			this.element.removeClass("curr_col");
			this.destroy_src_view();
		},

		on_header_click: function(event) {
			this.element.trigger("header_click", this);
			event.stopPropagation();
		},

		on_prev_click: function(event) {
			console.log("prev click");
			this.element.trigger("prev_click", this);
			event.stopPropagation();
		},

		add_children_listener: function () {
			var INDEX_OFFSET = 1; // Account for the header column
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
						child_disp.column_child("destroy");
						remove(child_disp[0]);
					}, this);
					_.forEach(diff.added, function (info) {
						var index = info.to, child = info.item;
						var child_disp = $("<tr />");
						insert_at(child_disp[0], this.tbody[0], index + INDEX_OFFSET);
						child_disp.column_child({
							value: child.value,
							name: child.name,
							inherited: child.inherited
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
					this.selected_child_disp.column_child("on_deselect");
				}
				this.selected_child_disp = child_disp;
				this.selected_child_disp.column_child("on_select");
			}
			this.element.trigger("child_select", child_info);
		},
		build_src_view: function() {
			this.destroy_src_view();
			var client = this.option("client");
			/*
			this.statechart_view_container = $("<div />")	.appendTo(this.header)
															.addClass("statechart");

			if(client.type() === "stateful") {
				var $statecharts = client.get_$("get_statecharts");
				this.live_src_view = cjs.liven(function() {
					var wrappers = $statecharts.get();
					var statecharts = _.map(wrappers, function (wrapper) {
						return red.create_remote_statechart(wrapper);
					});

					if(this.layout_engine) {
					//	this.layout_engine.destroy();
					}
					if(statecharts) {
						this.layout_engine = new red.RootStatechartLayoutEngine(statecharts);
						var paper = new Raphael(this.statechart_view_container[0], 0, 0);
						this.statechart_view = new red.RootStatechartView(statecharts, this.layout_engine, paper);
					}
				}, {
					context: this
				});
			}
			*/
		},
		destroy_src_view: function() {
			if(this.layout_engine) {
			}
			if(this.live_src_view) {
				this.live_src_view.destroy();
			}
			if(this.statechart_view) {
				this.statechart_view.destroy();
			}
			if(this.statechart_view_container) {
				this.statechart_view_container.remove();
			}
		},
		_setOption: function(key, value) {
			if(key === "is_curr_col") {
				if(value) {
					this.on_curr_col();
				} else {
					this.on_not_curr_col();
				}
			}
		}
	});

	$.widget("red.column_child", {
		options: {
			name: "",
			value: false,
			inherited: false
		},

		_create: function() {
			this.element.addClass("child");

			this.name_disp = $("<td />")	.addClass("name")
											.appendTo(this.element)
											.attr("colspan", "2")
											.text(this.option("name"));

			this.value_summary = $("<td />")	.appendTo(this.element)
												.value_summary({ value: this.option("value") })
												.addClass("value_summary val_col");

			if(this.option("inherited")) {
				this.element.addClass("inherited");
			}
			this.element.on("click", $.proxy(this.on_click, this));
		},

		_destroy: function() {
		},

		on_click: function(event) {
			event.stopPropagation();
			event.preventDefault();
			if(this.element.not(".selected")) {
				this.element.trigger("select");
			}
		},
		on_select: function() {
			this.element.addClass("selected");
		},
		on_deselect: function() {
			this.element.removeClass("selected");
		}
	});

	$.widget("red.value_summary", {
		options: {
			value: false
		},
		_create: function() {
			this.element.addClass("value_summary");
			var value = this.option("value");
			if(value instanceof red.WrapperClient) {
				var client = value;
				var $prop_val;
				var type = client.type();

				if(type === "dict") {
					this.element	.addClass("dict")
									.text(">");
				} else if(type === "stateful") {
					this.element	.addClass("stateful dict")
									.text(">");
				} else if(type === "cell") {
					$prop_val = client.get_$("val");

					this.live_value_fn = cjs.liven(function() {
						this.element.text(summarized_val($prop_val.get()));
					}, {
						context: this
					});
					this.element	.addClass("cell")
									.text("(cell)");
				} else if(type ==="stateful_prop") {
					$prop_val = client.get_$("val");

					this.live_value_fn = cjs.liven(function() {
						this.element.text(summarized_val($prop_val.get()));
					}, {
						context: this
					});
					this.element	.addClass("stateful_prop")
									.text("(prop)");
				} else {
					console.log(type);
				}
			} else {
				this.element	.addClass("constant")
								.text(value);
			}
		},
		_destroy: function() {
		}
	});
}(red, jQuery));
