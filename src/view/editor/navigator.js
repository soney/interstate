/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var navigator_template = cjs.createTemplate(
		"{{#each columns}}" +
			"{{> col getColumnOptions(this, @index) }}" +
		"{{/each}}"
	);

	$.widget("interstate.navigator", {
		options: {
			root_client: false,
			single_col: false,
			client_socket: false
		},
		_create: function() {
			var client = this.option("root_client");
			client.signal_interest();

			this.$columns = cjs([client]);
			this.$selected_column = this.$columns.itemConstraint(cjs(_.bind(this.$columns.length, this.$columns)).sub(1));

			this.element.on("child_select.nav", _.bind(this.on_child_select, this))
						.on("header_click.nav", _.bind(this.on_header_click, this))

			this._add_content_bindings();
			this._add_class_bindings();
		},
		_destroy: function() {
			var client = this.option("root_client");

			this._remove_class_bindings();
			this._remove_content_bindings();

			client.signal_destroy();

			this._super();
		},
		_setOption: function(key, value) {
			this._super(key, value);
		},
		_add_content_bindings: function() {
			var client_socket = this.option("client_socket");
			navigator_template({
				columns: this.$columns,
				getColumnOptions: _.bind(function(client, index) {
					return {
						client: client,
						client_socket: client_socket,
						is_curr_col: this.$selected_column.eqStrict(client),
						columns: this.$columns,
						column_index: index
					};
				}, this)
			}, this.element);
		},

		_remove_content_bindings: function() {
			cjs.destroyTemplate(this.element);
		},

		_add_class_bindings: function() {
			this.element.attr("id", "obj_nav");
		},

		_remove_class_bindings: function() {
		},

		on_child_select: function(event, child) {
			if(child instanceof ist.WrapperClient && (child.type() === "dict" || child.type() === "stateful")) {
				var column_index = this.$columns.indexOf(child);
				if(column_index >= 0) {
					this.$columns.splice(column_index, this.$columns.length()-column_index);
				} else {
					var parent_col = $(event.target).column("option", "client");
					column_index = this.$columns.indexOf(parent_col);
					this.$columns.splice(column_index+1, this.$columns.length()-column_index - 1, child);
				}
			} else {
				this.on_header_click(event, child);
			}
		},
		on_header_click: function(event, client) {
			var column_index = this.$columns.indexOf(client);
			if(column_index >= 0) {
				this.$columns.splice(column_index + 1, this.$columns.length()-column_index-1);
			}
		},
	});
}(interstate, jQuery));
