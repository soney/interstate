/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	$.widget("red.navigator", {
		options: {
			root_client: false,
			single_col: false,
			annotations: {}
		},
		_create: function() {
			var client = this.option("root_client");
			client.signal_interest();
			this.$on_child_select = $.proxy(this.on_child_select, this);
			this.$on_header_click = $.proxy(this.on_header_click, this);
			this.$on_prev_click = $.proxy(this.on_prev_click, this);
			this.$on_child_removed = $.proxy(this.on_child_removed, this);
			this.$forward_event = $.proxy(this.forward_event, this);

			this.element.attr("id", "obj_nav");
			var root_col = $("<table />")	.appendTo(this.element);
			root_col						.column({
												name: "sketch",
												client: client,
												is_curr_col: true,
												show_prev: false
											})
											.on("child_select", $.proxy(this.on_child_select, this, root_col))
											.on("header_click", $.proxy(this.on_header_click, this, root_col))
											.on("prev_click", $.proxy(this.on_prev_click, this, root_col))
											.on("child_removed", $.proxy(this.on_child_removed, this, root_col))
											.on("command", this.$forward_event)
											.focus();
			this.curr_col = root_col;
			this.columns = [root_col];
		},
		_destroy: function() {
			this._super();
			_.each(this.columns, function(col) {
				col.column("destroy");
			});
			var client = this.option("root_client");
			client.signal_destroy();

			delete this.options.root_client;
			delete this.options;
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
												.on("prev_click", $.proxy(this.on_prev_click, this, next_col))
												.on("child_removed", $.proxy(this.on_child_removed, this, next_col))
												.focus();

				this.columns.push(next_col);
				if(this.option("single_col")) {
					this.curr_col.hide();
				} else {
					//next_col.hide()
							//.show("fade", "fast");

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
		},

		on_child_removed: function(target, event, client) {
			var removed_index = -1;
			var column;
			for(var i = this.columns.length-1; i>=0; i--) {
				column = this.columns[i];
				if(column.column("option", "client") === client) {
					removed_index = i;
					break;
				}
			}
			if(removed_index >= 0) {
				var subsequent_columns = this.columns.slice(removed_index);
				_.each(subsequent_columns, function(col) {
					col.column("destroy").remove();
				});
				this.columns.length = removed_index;
				this.curr_col = this.columns[removed_index-1];
				this.curr_col.show();
				this.curr_col.column("option", "is_curr_col", true);
			}
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "anotations") {
				console.log(value);
			}
		}
	});

}(red, jQuery));
