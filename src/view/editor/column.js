/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	cjs.registerPartial("col", function(options, parent_elem) {
		if(!parent_elem) {
			parent_elem = $("<table />")[0];
		}
		$(parent_elem).column(options);
		return parent_elem;
	});

	var column_template = cjs.createTemplate(
		"<tbody>" +
			"<tr class='header'>" +
				"<th colspan='2' class='obj_name'>" +
					"<h2 data-cjs-on-click='headerClicked'>{{name}}</h2>" +
				"</th>" +
				"{{#if stateful}}" +
					"<th rowspan='2' class='statechart_cell'>" +
						"{{getStatechartView()}}" +
					"</th>" +
				"{{#else}}" +
					"<th rowspan='2'></th>" +
				"{{/if}}" +
			"</tr>" +
			"<tr class='add_prop'>" +
				"<td colspan='2' class='add_prop'>" +
					"<div class='add_prop' data-cjs-on-click=addProperty>Add Property</div>" +
				"</td>" +
			"</tr>" +
			"{{#each children}}" +
				"{{>prop getPropertyViewOptions(this)}}" +
				"{{#else}}" +
					"<tr class='no_children'>" +
						"<td colspan='2'>No properties</td>" +
					"</tr>" +
			"{{/each}}" +
		"</tbody>"
	);

	$.widget("interstate.column", {
		options: {
			client: false,
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

			this.element.attr("draggable", true);
			

			this.$name = client.get_$("get_name");
			this.$is_curr_col = this.option("is_curr_col");
			this.$is_curr_col.onChange(function() {
				var is_curr_col = this.$is_curr_col.get();
				if(is_curr_col) {
					if(this.selected_child_disp) {
						this.selected_child_disp.prop("on_deselect");
					}
				}
			}, this);
			this.$children = client.get_$("children");
			if(client.type() === "stateful") {
				this.$statecharts = client.get_$("get_statecharts");


				var statecharts = [], wrappers = [], wrapper_infos = [];

				this.statechart_view = $("<div />")	.statechart({
														statecharts: statecharts
													});
				this.layout_manager = this.statechart_view.statechart("get_layout_manager");

				this.sc_live_fn = cjs.liven(function() {
					var old_wrapper_infos = wrapper_infos;
					wrapper_infos = this.$statecharts.get() || [];
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
						var statechart = ist.create_remote_statechart(wrapper);
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
					context: this
				});
			}

			this._add_content_bindings();
			this._add_class_bindings();

			this.element.on("expand.on_child_select", _.bind(this.on_child_select, this));
		},
		_destroy: function() {
			var client = this.option("client");

			this._remove_class_bindings();
			this._remove_content_bindings();

			if(this.$statecharts) {
				this.$statecharts.destroy();
				this.statechart_view.destroy();
				this.layout_manager.destroy();
				this.sc_live_fn.destroy();
			}

			this.$name.destroy();
			this.$is_curr_col.destroy();
			this.$children.destroy();

			client.signal_destroy();

			this._super();
		},

		_add_content_bindings: function() {
			var client = this.option("client");
			column_template({
				name: this.$name,
				children: this.$children,
				stateful: client.type() === "stateful",
				getPropertyViewOptions: _.bind(function(child) {
					return {
						value: child.value,
						name: child.name,
						inherited: child.inherited,
						builtin: child.builtin,
						layout_manager: this.layout_manager,
						show_src: this.$is_curr_col,
						obj: this.option("client"),
						client_socket: this.option("client_socket"),
						statechart_view: this.statechart_view
					}
				}, this),
				getStatechartView: _.bind(function() {
					return this.statechart_view;
				}, this),
				headerClicked: _.bind(this.on_header_click, this),
				addProperty: _.bind(this._add_property, this)
			}, this.element);
		},

		_remove_content_bindings: function() {
			cjs.destroyTemplate(this.element);
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
			if(key === "is_curr_col") {
				this.$is_curr_col.set(value);
			}
		},

		on_header_click: function(event) {
			this.element.trigger("header_click", this.option("client"));
			event.stopPropagation();
			event.preventDefault();
		},
		on_child_select: function(event) {
			if(event && $(event.target).hasClass("selected")) {
				this.on_header_click(event);
			} else {
				var target = $(event.target),
					client = target.data("interstate-prop") ? target.prop("option", "value"): false;

				if(client instanceof ist.WrapperClient && (client.type() === "dict" || client.type() === "stateful")) {
					if(this.selected_child_disp) {
						if(this.selected_child_disp.data("interstate-prop")) { // need to check in case this.selected_child_disp was removed
							this.selected_child_disp.prop("on_deselect");
						}
					}
					this.selected_child_disp = target;
					this.selected_child_disp.prop("on_select");
				}
				this.element.trigger("child_select", client);
			}
		},
		_add_property: function() {
			var event = new $.Event("command");
			event.command_type = "add_property";
			event.client = this.option("client");
			this.element.trigger(event);
		},
	});
}(interstate, jQuery));
