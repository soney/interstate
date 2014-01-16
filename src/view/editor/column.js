/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var column_template = cjs.createTemplate(
		"<tbody>" +
			"<tr class='header'>" +
				"<th colspan='2' class='obj_name'>" +
					"<h2>{{name}}</h2>" +
				"</th>" +
				"{{#if stateful}}" +
					"<th rowspan='2' class='statechart_cell'>" +
						"{{>statechartView getStatechartViewOptions() }}" +
					"</th>" +
				"{{/if}}" +
			"</tr>" +
			"<tr class='add_prop'>" +
				"<td colspan='2' class='add_prop'>" +
					"<div class='add_prop'>Add Property</div>" +
				"</td>" +
			"</tr>" +
			"{{#each children}}" +
				"{{>prop getPropertyViewOptions(this)}}" +
				"{{#else}}" +
					"<tr>" +
						"<td>No properties</td>" +
					"</tr>" +
			"{{/each}}" +
		"</tbody>"
	);

	$.widget("interstate.column", {
		options: {
			client: false,
			name: "sketch",
			prev_col: false,
			show_prev: false,
			is_curr_col: false,
			show_source: true,
			curr_copy_client: false,
			client_socket: false,
			selected_prop_name: false,
			curr_copy_index: false,
			close_button: false
		},

		_create: function() {
			var client = this.option("client");
			client.signal_interest();

			this.$name = cjs(this.option("name"));
			this.$is_curr_col = cjs(this.option("is_curr_col"));
			this.$children = client.get_$("children");

			this._add_content_bindings();
			this._add_class_bindings();
		},
		_destroy: function() {
			var client = this.option("client");

			this._remove_class_bindings();
			this._remove_content_bindings();

			client.signal_destroy();

			this._super();
		},

		_add_content_bindings: function() {
			column_template({
				name: this.$name,
				children: this.$children,
				getPropertyViewOptions: _.bind(function(child) {
					return {
						value: child.value,
						name: child.name,
						inherited: child.inherited,
						builtin: child.builtin,
						layout_manager: this.layout_manager,
						show_src: this.option("show_source"),
						obj: this.option("client"),
						client_socket: this.option("client_socket")
					}
				}, this)
			}, this.element);
		},

		_remove_content_bindings: function() {
		},

		_add_class_bindings: function() {
			this._class_binding = cjs.bindClass(this.element, "col",
									this.$is_curr_col.iif("curr_col"));
		},

		_remove_class_bindings: function() {
			this._class_binding.destroy();
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "name") {
				this.$name.set(value);
			} else if(key === "is_curr_col") {
				this.$is_curr_col.set(value);
			}
		}
	});
}(interstate, jQuery));
