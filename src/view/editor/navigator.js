/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	$.widget("interstate.navigator", {
		options: {
			root_client: false,
			single_col: false,
			client_socket: false
		},
		_create: function() {
			var client = this.option("root_client");
			client.signal_interest();

			this.element.attr("id", "obj_nav")
						.on("open_cobj.nav", _.bind(this.open_cobj, this));

			var root_col = $("<table />")	.appendTo(this.element);
			root_col						.column({
												name: "sketch",
												client: client,
												is_curr_col: true,
												show_prev: false,
												client_socket: this.option("client_socket")
											})
											.on("child_select.nav", _.bind(this.on_child_select, this, root_col))
											.on("header_click.nav", _.bind(this.on_header_click, this, root_col))
											.on("prev_click.nav", _.bind(this.on_prev_click, this, root_col))
											.on("child_removed.nav", _.bind(this.on_child_removed, this, root_col))
											.focus();
			this.curr_col = root_col;
			this.columns = [root_col];
		},
		_destroy: function() {
			this._super();
			_.each(this.columns, function(col) {
				col	.off("child_select.nav header_select.nav prev_click.nav child_removed.nav")
					.column("destroy")
					.remove();
			});
			var client = this.option("root_client");
			this.element.off("open_cobj.nav");
			client.signal_destroy();

			delete this.options.root_client;
			delete this.options.client_socket;
			delete this.options;
		},
		on_child_select: function(column, event, child_info, collapse) {
			var value = child_info.value;
			if(value instanceof ist.WrapperClient && (value.type() === "dict" || value.type() === "stateful")) {
				this.curr_col.column("option", "is_curr_col", false);

				var column_index = _.indexOf(this.columns, column);
				var subsequent_columns = this.columns.slice(column_index + 1);
				_.each(subsequent_columns, function(col) {
					col.column("destroy").remove();
				});
				this.columns.length = column_index + 1;
				var next_col = this.get_column(child_info.value, {
													is_curr_col: true,
													prev_col: column,
													show_prev: this.option("single_col")
												});
				if(this.option("single_col")) {
					this.curr_col.hide();
				} else {
					//next_col.hide()
							//.show("fade", "fast");

				}
				next_col.focus();
				this.curr_col = next_col;
			} else {
				this.on_header_click(column);
			}
		},
		on_header_click: function(column) {
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
		},

		get_column: function(wrapper_client, options) {
				var client_socket = this.option("client_socket");
				var column_options = _.extend({
					name: wrapper_client.object_summary.name,
					client: wrapper_client,
					client_socket: client_socket
				}, options);
				var obj_summary = wrapper_client.object_summary;
				/*
				if(obj_summary.is_template) {
					if(obj_summary.instances.length > 0) {
						var instance_client = client_socket.get_wrapper_client(obj_summary.instances[0].object_summary);

						column_options.curr_copy_client = instance_client;
						column_options.curr_copy_index = 0;
					}
				} else if(obj_summary.is_instance) {
					var template_client = client_socket.get_wrapper_client(obj_summary.template.object_summary);

					column_options.client = template_client;
					column_options.curr_copy_client = wrapper_client;
					column_options.curr_copy_index = obj_summary.index;
				}
				*/

				var col = $("<table />")	.appendTo(this.element);
				col	.column(column_options)
					.on("child_select.nav", _.bind(this.on_child_select, this, col))
					.on("header_click.nav", _.bind(this.on_header_click, this, col))
					.on("prev_click.nav", _.bind(this.on_prev_click, this, col))
					.on("child_removed.nav", _.bind(this.on_child_removed, this, col));
				this.columns.push(col);
				return col;
		},

		open_cobj: function(event) {
			var client_socket = this.option("client_socket");
			var cobj_id = event.cobj_id;
			client_socket.once("cobj_links", function(message) {
				if(message.cobj_id === cobj_id) {
					var vals = message.value;
					var wrapper_clients = _.map(vals, function(val) {
						return client_socket.get_wrapper_client(val.object_summary);
					}, this);

					this.curr_col.column("option", "is_curr_col", false);

					var subsequent_columns = this.columns.slice(1);
					_.each(subsequent_columns, function(col) {
						col.column("destroy").remove();
					});
					this.columns.length = 1;
					var len = wrapper_clients.length;
					var next_col = this.columns[0];
					var single_col = this.option("single_col");
					var last_col;
					for(var i = 0; i<len; i++) {
						var wc = wrapper_clients[i];
						var is_last = i===len-1;
						last_col = next_col;
						last_col.column("option", "selected_prop_name", wc.object_summary.name);
						next_col = this.get_column(wc, {
							is_curr_col: is_last,
							prev_col: last_col,
							show_prev: single_col
						});
						if(is_last) {
							next_col.focus();
						}
					}
					this.curr_col = next_col;
				}
			}, this);
			client_socket.post({type: "get_ptr", cobj_id: cobj_id});
		}
	});

}(interstate, jQuery));
