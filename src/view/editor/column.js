/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	cjs.registerCustomPartial("col", {
		createNode: function(options) {
			return $("<table />").column(options);
		},
		destroyNode: function(node) {
			$(node).column("destroy");
		}
	});

	var column_template = cjs.createTemplate(
		"<tbody>" +
			"<tr class='header'>" +
				"<th colspan='2' class='obj_name'>" +
					"<h2 data-cjs-on-click='headerClicked'>{{ci}}{{name}}</h2>" +
				"</th>" +
				"{{#if stateful}}" +
					"<th rowspan='2' class='statechart_cell'>" +
						"{{#if is_curr_col}}" +
							"{{statechart_view}}" +
						"{{/if}}" +
					"</th>" +
				"{{#else}}" +
					"<th rowspan='2'></th>" +
				"{{/if}}" +
			"</tr>" +

			"{{#if is_curr_col}}" +
				"<tr class='add_prop'>" +
					"<td colspan='2' class='add_prop'>" +
						"<div class='add_prop' data-cjs-on-click=addProperty>Add Field</div>" +
					"</td>" +
				"</tr>" +
			"{{/if}}" +

			"{{#each builtins}}" +
				"{{>prop getPropertyViewOptions(this, true)}}" +
			"{{/each}}" +

			"{{#if adding_field}}" +
				"<tr class='new_field'>" +
					"<td class='name'><input placeholder='Field name' class='name' /></td>" +
					"<td class='type'>" +
						"<select class='type'>" + 
							"<option value='stateful'>Object</option>" +
							"<option value='stateful_prop'>Property</option>" +
						"</select>" + 
					"</td>" +
					"<td class='confirm_field'>" +
						"<a href='javascript:void(0)'>OK</a>" +
					"</td>" +
				"</tr>" +
			"{{/if}}" +

			"{{#each children}}" +
				"{{>prop getPropertyViewOptions(this)}}" +
				"{{#else}}" +
					"{{#if !adding_field && buildings.length===0}}" +
						"<tr class='no_children'>" +
							"<td colspan='3'>No fields</td>" +
						"</tr>" +
					"{{/if}}" +
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
			close_button: false,
			columns: false,
			column_index: -1
		},

		_create: function() {
			var client = this.option("client");
			client.signal_interest();

			this.element.attr("draggable", true);
			
			this.$adding_field = cjs(false);
			this.$selected_prop = this.option("columns").itemConstraint(this.option("column_index")+1);

			this.$name = client.get_$("get_name");
			this.$is_curr_col = this.option("is_curr_col");
			this.$children = client.get_$("children", true);
			this.$builtins = client.get_$("builtin_children");
			if(client.type() === "stateful") {
				this.$statecharts = client.get_$("get_statecharts");


				var statecharts = [], wrappers = [], wrapper_infos = [];

				this.statechart_view = $("<div />")	.statechart({
														statecharts: statecharts,
														client: this.option("client")
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

						//var wrapper = wrappers[from_index];
						var statechart = statecharts[from_index];
						//wrapper.splice(from_index, 1);
						//wrappers.splice(to_index, 0, wrapper);
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
				this.statechart_view.statechart("destroy");
				this.sc_live_fn.destroy();
				this.$statecharts.destroy();
			}

			this.$name.destroy();
			this.$is_curr_col.destroy();
			this.$children.destroy();
			this.$builtins.destroy();

			client.signal_destroy();

			this._super();
		},

		_add_content_bindings: function() {
			var client = this.option("client");
			column_template({
				name: this.$name,
				children: this.$children,
				builtins: this.$builtins,
				stateful: client.type() === "stateful",
				getPropertyViewOptions: _.bind(function(child) {
					return {
						client: child.value,
						name: child.name,
						inherited: child.inherited,
						builtin: child.builtin,
						layout_manager: this.layout_manager,
						show_src: this.$is_curr_col,
						obj: this.option("client"),
						client_socket: this.option("client_socket"),
						statechart_view: this.statechart_view,
						selected: this.$selected_prop.eqStrict(child.value)
					}
				}, this),
				statechart_view: this.statechart_view,
				is_curr_col: this.$is_curr_col,
				headerClicked: _.bind(this.on_header_click, this),
				addProperty: _.bind(this._add_property, this),
				adding_field: this.$adding_field
			}, this.element);
			this._select_just_added_name = cjs.liven(function() {
				var children = this.$children.get();
				if(this._just_added_prop_name) {
					var child;
					for(var i = 0; i<children.length; i++) {
						child = children[i];
						if(child.name === this._just_added_prop_name) {
							this._trigger_child_select(child.value);
							delete this._just_added_prop_name;
							return;
						}
					}
				}
			}, {
				context: this
			});
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
					client = target.data("interstate-prop") ? target.prop("option", "client"): false;
				this._trigger_child_select(client);
			}
		},
		_trigger_child_select: function(client) {
			this.element.trigger("child_select", client);
		},
		_add_property: function() {
			var child_names = _.pluck(this.$children.get(), "name"),
				default_name = "field_"+(child_names.length+1),
				name = default_name,
				i = 1,
				client = this.option("client");
				
			while(child_names.indexOf(name) >= 0) {
				name = default_name + "_" + i;
				i++;
			}

			this.$adding_field.set(true);
			if(client.type() === "stateful") {
				$("select.type", this.element).val("stateful_prop");
			} else {
				$("select.type", this.element).val("stateful");
			}

			$('.new_field input.name', this.element).val(name)
												.select()
												.focus();
			var trigger_add_prop = _.bind(function() {
					$('select.type,input', this.element).off('.addfield');
					clearTimeout(onFormBlur);

					var event = new $.Event("command");
					event.command_type = "add_property";
					event.client = this.option("client");
					this._just_added_prop_name = event.prop_name = $('.new_field input.name', this.element).val();
					window.setTimeout(_.bind(function() {
						delete this._just_added_prop_name;
					}, this), 200);
					event.prop_type = $('select.type', this.element).val();

					this.element.trigger(event);

					this.$adding_field.set(false);
				}, this),
				cancel_add_prop = _.bind(function() {
					$('select.type,input', this.element).off('.addfield');
					this.$adding_field.set(false);
				}, this);
			var onFormBlur;
			$('select.type,input', this.element).on('blur.addfield', function(e) {
				e.preventDefault();
				e.stopPropagation();
				onFormBlur = setTimeout(function() {
					trigger_add_prop();
				}, 50);
			}).on('focus.addfield', function() {
				clearTimeout(onFormBlur);
			}).on('keydown.addfield', function(event) {
				if(event.keyCode === 13) { // enter
					trigger_add_prop();
				} else if(event.keyCode === 27) { //esc
					cancel_add_prop();
				}
			});
		},
	});
}(interstate, jQuery));
