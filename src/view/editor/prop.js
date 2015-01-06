/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael,RedMap */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	cjs.registerCustomPartial("prop", {
		createNode: function(options) {
			return $("<tr />").prop(options);
		},
		destroyNode: function(node) {
			$(node).prop("destroy");
		}
	});

	var prop_template = cjs.createTemplate(
		"<td data-cjs-on-mouseover='propMOver' data-cjs-on-mouseout='propMOut' class='name'>" +
			"{{#fsm name_edit_state}}" +
				"{{#state idle}}" +
					"<span>{{ prop_name }}</span>" +
				"{{#state editing}}" +
					"{{>editing_text prop_name 'input'}}" +
			"{{/fsm}}" +
			"{{#if show_menu}}" +
				"<div class='menu_container'>" +
					"<ul class='menu'>" +
						"<li class='menu-item' data-action='change_type'>Change to {{ (type === 'stateful_prop' || type==='cell') ? 'object' : 'property'}}</li>" +
						"<li class='menu-item' data-action='delete'>Delete</li>" +
						"<li class='menu-item' data-action='rename'>Rename</li>" +
					"</ul>" +
				"</div>" +
			"{{/if}}" +
		"</td>" +
		"{{#if show_prev_value}}" +
			"{{> valueSummary getPrevValueSummaryOptions() }}"  +
		"{{/if}}" +
		"{{> valueSummary getValueSummaryOptions() }}"  +
		"{{#if show_next_value}}" +
			"{{> valueSummary getNextValueSummaryOptions() }}"  +
		"{{/if}}" +
		"{{#if show_src}}" +
			"{{#if type==='stateful_prop'}}" +
				"<td class='stateful_prop src'>" +
					"{{#each propValues}}" +
						"{{> propCell getPropCellOptions(@key) }}" +
					"{{/each}}" +
				"</td>" +
			"{{#elif type==='cell'}}" +
				"<td class='src'>" +
					"{{> propCell getPurePropCellOptions() }}" +
				"</td>" +
			"{{#elif hasComponentView()}}" +
				"<td class='attachmentView'>" +
					"{{>attachmentViews getAttachmentViewOptions() }}" + 
				"</td>" +
			"{{#else}}" +
				"<td class='cannot_modify src' />" +
			"{{/if}}" +
		"{{/if}}"
	);
	$.widget("interstate.prop", {
		options: {
			name: "",
			client: false,
			inherited: false,
			builtin: false,
			layout_manager: false,
			show_src: false,
			obj: false,
			client_socket: false,
			selected: false,
			prev: false,
			next: false
		},

		_create: function() {
			var client = this.option("client");

			this.$dragging = this.option("editor").getDraggingClientConstraint();
			this.$prop_name = cjs(this.option("name"));
			this.$inherited = cjs(this.option("inherited"));
			this.$show_src  = this.option("show_src");
			this.$selected  = this.option("selected");

			this.$prev_dict_client = this.option("prev");
			this.$next_dict_client = this.option("next");

			this.$show_prev_value = cjs(this.$prev_dict_client);
			this.$show_next_value = cjs(this.$next_dict_client);

			this.prev_value = ist.indirectClient(this.$prev_dict_client, ["prop_val", this.option("name")]);
			this.next_value = ist.indirectClient(this.$next_dict_client, ["prop_val", this.option("name")]);


			this.$type = cjs(function() {
				if(client instanceof ist.WrapperClient) {
					return client.type();
				} else {
					return "";
				}
			});


			var elem = this.element;
			this.name_edit_state = cjs	.fsm("idle", "editing")
										.startsAt("idle")
										.addTransition('editing', 'idle', function(dt) {
											elem.on('confirm_value.prop', dt);
										})
										.addTransition('editing', 'idle', function(dt) {
											elem.on('cancel_value.prop', dt);
										})
										.on('editing->idle', function(event) {
											if(event.type === 'confirm_value') {
												this._emit_new_name(event.value);
											}
										}, this);

			this.element.on("click.expand", _.bind(this._trigger_expand, this));

			if(client instanceof ist.WrapperClient && (client.type() === "dict" || client.type() === "stateful")) {
				this.$attachmentTypes = client.get_$("get_attachment_types");
			} else {
				this.$attachmentTypes = [];
			}

			this._add_menu();
			this._create_state_map();
			this._add_content_bindings();
			this._add_class_bindings();
			this._add_tooltip();

			if(this.option("inherited")) {
				this.element.on("mousedown.inherit", _.bind(this.inherit, this));
			} else {
				this.element.attr("draggable", true)
							.on("dragstart.ondragstart", _.bind(this.on_drag_start, this));
			}

			if(client instanceof ist.WrapperClient) {
				client.signal_interest();
			}
		},
		_destroy: function() {
			var client = this.option("client");

			this.element.off(".prop").off(".inherit .ondragstart .menu_item");
			this._remove_tooltip();
			this._remove_content_bindings();
			this._remove_class_bindings();
			this._destroy_state_map();
			this._destroy_menu();

			if(this.$attachmentTypes.destroy) {
				this.$attachmentTypes.destroy();
			}
			if(client instanceof ist.WrapperClient) {
				client.signal_destroy();
			}

			this.$prop_name.destroy();
			this.$inherited.destroy();
			this.$show_menu.destroy();
			this.$type.destroy();
			this.name_edit_state.destroy();

			this._super();
		},

		_add_menu: function() {
			this.$show_menu  = cjs(false);
			this.menu_state = cjs.fsm("hidden", "holding", "on_release", "on_click");
			if(this.option("builtin")) {
				this.element.on("contextmenu", function(event) {
					event.preventDefault();
					event.stopPropagation();
				});
			} else {
				this.menu_state.addTransition("hidden", "holding", cjs.on("contextmenu", this.element[0]));
			}
			this.menu_state	.addTransition("holding", "on_click", cjs.on("mouseup"))
							.addTransition("holding", "on_release", cjs.on("timeout", 500))
							.addTransition("holding", "hidden", cjs.on("keydown").guard('keyCode', 27))
							.addTransition("on_click", "hidden", cjs.on("keydown").guard('keyCode', 27))
							.addTransition("on_release", "hidden", cjs.on("keydown").guard('keyCode', 27))
							.startsAt("hidden");

			var on_mup_holding = this.menu_state.addTransition("holding", "hidden"),
				on_mup_orelease = this.menu_state.addTransition("on_release", "hidden"),
				on_mup_oclick = this.menu_state.addTransition("on_click", "hidden");

			this.menu_state.on("hidden->holding", function(event) {
				this.$show_menu.set(true);
				event.stopPropagation();
				event.preventDefault();
				var my_position = this.element.position();
				
				return false;
			}, this);

			var on_click = function(event) {
				$(window).add("ul.menu > li", this.element).off('.menu_item');

				$("ul.menu > li", this.element).on('click.menu_item', _.bind(function(e) {
					this.on_menu_action(e.target.getAttribute('data-action'));
					on_mup_oclick(e);
					e.stopPropagation();
					e.preventDefault();
				}, this));
				$(window).on('mousedown.menu_item', function(e) {
					if(!$(e.target).parents().is($("ul.menu", this.element))) {
						on_mup_oclick(e);
						e.stopPropagation();
						e.preventDefault();
					}
				});
			},
			on_hold = function(event) {
				$("ul.menu > li", this.element).on('mouseup.menu_item', _.bind(function(e) {
					this.on_menu_action(e.target.getAttribute('data-action'));
					on_mup_holding(e);
					on_mup_orelease(e);
					e.stopPropagation();
					e.preventDefault();
				}, this));

				$(window).on('mouseup.menu_item', function(e) {
					if(!$(e.target).parents().is($("ul.menu", this.element))) {
						on_mup_holding(e);
						on_mup_orelease(e);
						e.stopPropagation();
						e.preventDefault();
					}
				});
			},
			on_hidden = function(event) {
				this.menu_state .off("on_click", on_click, this)
								.off("holding", on_hold, this)
								.off("hidden", on_hidden, this);
				this.$show_menu.set(false);
				$(window).add("ul.menu > li", this.element).off('.menu_item');
			};
			this.menu_state.on("on_click", on_click, this);
			this.menu_state.on("holding", on_hold, this);
			this.menu_state.on("hidden", on_hidden, this);
		},
		_destroy_menu: function() {
			$(window).add("ul.menu > li", this.element).off('.menu_item').remove();
			this.menu_state.destroy();
			this.$show_menu.destroy();
		},
		on_menu_action: function(action_name) {
			// Give the menu a bit of time to transition back to hidden
			_.defer(_.bind(function() {
				if(action_name === 'delete') {
					var event = new $.Event("command");
					event.command_type = "unset";
					event.name = this.$prop_name.get();
					event.client = this.option("obj");

					this.element.trigger(event);
				} else if(action_name === 'rename') {
					this.begin_rename();
				} else if(action_name === 'change_type') {
					var client = this.option("client"),
						client_type = client.type(),
						obj = this.option("obj"),
						obj_type = obj.type(),
						new_type = (client_type === 'cell' || client_type === 'stateful_prop') ? 'stateful' : (obj_type === 'stateful' ? 'stateful_prop' : 'cell');
					this._change_type(new_type);
				}
			}, this));
		},

		begin_rename: function() {
			this.name_edit_state._setState('editing');
		},

		_add_tooltip: function() {
			var client = this.option("client");
			if(client instanceof ist.WrapperClient && client.type() === "stateful_prop") {
				this.$runtime_errors = client.get_$("get_runtime_errors");
				this.element.tooltip({
					position: {
						my: "center bottom-1",
						at: "center top"
					},
					show: false,
					hide: false,
					content: ""
				});
				this._tooltip_live_fn = cjs.liven(function() {
					var runtime_errors = this.$runtime_errors.get();
					if(runtime_errors && runtime_errors.length > 0) {
						var runtime_error_text = runtime_errors[0];

						this.element.addClass("error")
									.attr("title", runtime_error_text)
									.tooltip("option", {
										tooltipClass: "error",
										content: runtime_error_text
									});
					} else {
						this.element.removeClass("error")
									.attr("title", "")
									.tooltip("option", {
										tooltipClass: "",
										content: ""
									});
					}
				}, {
					context: this,
					on_destroy: function() {
						this.element.tooltip("destroy");
					}
				});
			}
		},

		_remove_tooltip: function() {
			if(this._tooltip_live_fn) {
				this._tooltip_live_fn.destroy();
				delete this._tooltip_live_fn;
			}
		},

		_create_state_map: function() {
			var client = this.option("client");
			if(client instanceof ist.WrapperClient && client.type() === "stateful_prop") {
				this.$states = client.get_$("get_states");
				this.$values = client.get_$("get_values");
				this.$active_value = client.get_$("active_value");

				this.$full_values = cjs(function() {
					var values = this.$values.get() || [], 
						states = this.$states.get() || [],
						indexed_vals = [];

					_.each(states, function(state, i) {
						indexed_vals[i] = undefined;
					});

					_.each(values, function(value) {
						var key_index = states.indexOf(value.state);
						indexed_vals[key_index] = value.value;
					});

					return indexed_vals;
				}, {
					context: this
				});

				this.$prop_values = ist.create_key_val_map(this.$states, this.$full_values);
			}
		},
		_destroy_state_map: function() {
			if(this.$states) {
				this.$states.signal_destroy();
				this.$values.signal_destroy();
				this.$active_value.signal_destroy();

				this.$full_values.destroy();
				this.$prop_values.destroy();
			}
		},

		_add_content_bindings: function() {
			var layout_manager = this.option("layout_manager");
			prop_template({
				prop_name: this.$prop_name,
				name_edit_state: this.name_edit_state,
				getPrevValueSummaryOptions: _.bind(function() {
					return { is_primary: false, client: this.prev_value, itemClass:'prev'};
				}, this),
				getValueSummaryOptions: _.bind(function() {
					return { is_primary: true, client: this.option("client"), itemClass:'primary' };
				}, this),
				getNextValueSummaryOptions: _.bind(function() {
					return { is_primary: false, client: this.next_value, itemClass:'next'};
				}, this),
				getPurePropCellOptions: _.bind(function() {
					return { client: cjs.constraint(this.option("client")), prop: false };
				}, this),
				getPropCellOptions: _.bind(function(key) {
					var value = this.$prop_values.itemConstraint(key),
						$active = true,
						left = function() { return layout_manager.get_x(key); },
						width = function() { return value.get() ? layout_manager.get_width(key) : 7; };

					// One of the worst lines of code I've ever written was here: `value: value ? value.value : value`
					return {prop: this.option("client"),
							state: key,
							client: value,
							left: left,
							width: width,
							active_value: this.$active_value
							};
				}, this),
				show_prev_value: this.$show_prev_value,
				show_next_value: this.$show_next_value,
				show_src: this.$show_src,
				value: this.option("client"),
				type: this.$type,
				propValues: this.$prop_values,
				show_menu: this.$show_menu,
				propMOver: _.bind(function() {
					var client = this.option("client"),
						event = new $.Event("add_highlight");
					event.client = client;

					this.element.trigger(event);
				}, this),
				propMOut: _.bind(function() {
					var client = this.option("client"),
						event = new $.Event("remove_highlight");
					event.client = client;

					this.element.trigger(event);
				}, this),
				attachmentTypes: this.$attachmentTypes,
				hasComponentView: _.bind(function() {
					var attachmentTypes = cjs.get(this.$attachmentTypes);
					return _.intersection(attachmentTypes, _.keys(ist.attachmentViews)).length > 0;
				}, this),

				getAttachmentViewOptions: _.bind(function() {
					return {
						client: this.option("client"),
						attachmentTypes: this.$attachmentTypes 
					};
				}, this)

			}, this.element);
		},

		_remove_content_bindings: function() {
			cjs.destroyTemplate(this.element);
		},

		_add_class_bindings: function() {
			this._class_binding = cjs.bindClass(this.element, "child", this.option("builtin") ? "builtin":"",
									this.$selected.iif("selected", ""),
									this.$inherited.iif("inherited", ""),
									this.$show_menu.iif("menuized", ""));
		},

		_remove_class_bindings: function() {
			this._class_binding.destroy();
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "name") {
				this.$prop_name.set(value);
			} else if(key === "inherited") {
				this.$inherited.set(value);
			} else if(key === "show_src") {
				this.$show_src.set(value);
			}
		},

		_trigger_expand: function(event) {
			var target = $(event.target);
			
			if(target.parents(".attachmentView").size() === 0) {
				//event.stopPropagation();
				event.preventDefault();
				if(this.element.not(".selected")) {
					this.element.trigger("expand");
				}
			}
		},
		inherit: function(e) {
			if(e) {
				e.preventDefault();
				e.stopPropagation();
			}
			var event = new $.Event("command");
			event.command_type = "inherit";
			//event.client = this.option("client");
			event.name = this.option("name");
			event.client = this.option("client");

			this.element.trigger(event);
		},

		_emit_new_name: function(str) {
			if(ist.is_valid_prop_name(str)) {
				var to_return = false;
				var self = this;
				$("span.prop_name", this.element.parent()).each(function() {
					var child_parent = $(this).parents(".child");
					if(child_parent !== self && child_parent.data("interstate-prop") && child_parent.prop("option", "name") === str) {
						to_return = true;
						self.name_span.editable_text("option", "text", old_name);
						window.alert("Property with name '" + str + "' already exists");
					}
				});
				if(to_return) { return; }
				var event = new $.Event("command");
				event.command_type = "rename";
				event.from_name = this.$prop_name.get();
				event.to_name = str;
				event.client = this.option("obj");

				if(event.from_name !== event.to_name) {
					this.element.trigger(event);
				}
			}
		},

		_change_type: function(type) {
			var event = new $.Event("command");
			event.command_type = "set_type";
			event.client = this.option("obj");
			event.prop_name = this.$prop_name.get();
			event.type_name = type;

			this.element.trigger(event);
		},

		on_drag_start: function(event) {
			event.preventDefault();
			event.stopPropagation();
			if(this.element.is(".inherited") || this.element.is(".builtin")) {
				return;
			}

			this.$dragging.set(this.option("client"));

			this.element.addClass("dragging");
			var curr_target = false;
			var above_below = false;
			var on_mmove = function(e) {
				above_below = 2 * e.offsetY > curr_target.height() ? "below" : "above";
				curr_target.addClass(above_below === "above" ? "dragtop" : "dragbottom");
				curr_target.removeClass(above_below === "above" ? "dragbottom" : "dragtop");
			};
			var on_mover_child = function(e) {
				curr_target = $(this);
				curr_target.addClass("dragtop");
				curr_target.on("mousemove", on_mmove);
			};
			var on_mout_child = function(e) {
				if(curr_target) {
					curr_target.removeClass("dragtop dragbottom");
					curr_target.off("mousemove", on_mmove);
					curr_target = false;
				}
			};
			var on_mup = _.bind(function() {
				this.$dragging.set(false);
				targets.off("mouseover", on_mover_child);
				targets.off("mouseout", on_mout_child);
				$(window).off("mouseup", on_mup);
				this.element.removeClass("dragging");
				if(curr_target) {
					var my_obj = this.option("obj"),
						my_name = this.option("name");
					var target_name, target_obj;
					if(curr_target.is("tr.no_children")) {
						target_obj = curr_target.parents(".col").column("option", "client");
						target_name = false;
					} else {
						target_obj = curr_target.prop("option", "obj");
						target_name = curr_target.prop("option", "name");
					}

					curr_target.removeClass("dragtop dragbottom");
					curr_target.off("mousemove", on_mmove);
					curr_target = false;

					var event = new $.Event("command");
					event.command_type = "move_prop";
					event.from_obj = my_obj;
					event.from_name = my_name;
					event.target_obj = target_obj;
					event.target_name = target_name;
					event.above_below = above_below;

					this.element.trigger(event);
				}
			}, this);
			var targets = $("tr.child").not(".inherited").add("tr.no_children");

			targets.on("mouseover", on_mover_child);
			targets.on("mouseout", on_mout_child);
			$(window).on("mouseup", on_mup);
		},
	});

	var eqProp = function(prop_name, values, thisArg) {
		return function(x) {
			var val = x[prop_name];
			if(values[val]) {
				return values[val].apply(thisArg || this, arguments);
			}
		};
	};
}(interstate, jQuery));
