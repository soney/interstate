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
		"<td class='name'>" +
			"{{#fsm name_edit_state}}" +
				"{{#state idle}}" +
					"<span>{{ prop_name }}</span>" +
				"{{#state editing}}" +
					"<textarea cjs-on-blur=on_edit_blur cjs-on-keydown=on_edit_keydown />" +
			"{{/fsm}}" +
			"{{#if show_menu}}" +
				"<ul class='menu'>" +
					"<li class='menu-item' data-action='delete'>Delete</li>" +
					"<li class='menu-item' data-action='rename'>Rename</li>" +
				"</ul>" +
			"{{/if}}" +
		"</td>" +
		"{{> valueSummary getValueSummaryOptions() }}"  +
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
			selected: false
		},

		_create: function() {
			var client = this.option("client");

			this.$prop_name = cjs(this.option("name"));
			this.$inherited = cjs(this.option("inherited"));
			this.$show_src  = this.option("show_src");
			this.$selected  = this.option("selected");

			this.$type = cjs(function() {
				if(client instanceof ist.WrapperClient) {
					return client.type();
				} else {
					return "";
				}
			});

			this.name_edit_state = cjs	.fsm("idle", "editing")
										.startsAt("idle");

			this.element.on("click.expand", _.bind(this._trigger_expand, this));

			this._add_menu();
			this._create_state_map();
			this._add_content_bindings();
			this._add_class_bindings();
			this._add_tooltip();

			if(this.option("inherited")) {
				this.element.on("click.inherit", _.bind(this.inherit, this));
			}

			if(client instanceof ist.WrapperClient) {
				client.signal_interest();
			}
		},
		_destroy: function() {
			var client = this.option("client");
			this._remove_tooltip();
			this._remove_content_bindings();
			this._remove_class_bindings();
			this._destroy_state_map();
			this._destroy_menu();

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
			this.menu_state = cjs.fsm("hidden", "holding", "on_release", "on_click")
									.addTransition("hidden", "holding", cjs.on("contextmenu", this.element[0]))
									.addTransition("holding", "on_click", cjs.on("mouseup"))
									.addTransition("holding", "on_release", cjs.on("timeout", 500))
									.startsAt("hidden");
			var on_mup_holding = this.menu_state.addTransition("holding", "hidden"),
				on_mup_orelease = this.menu_state.addTransition("on_release", "hidden"),
				on_mup_oclick = this.menu_state.addTransition("on_click", "hidden");

			this.menu_state.on("hidden->holding", function(event) {
				this.$show_menu.set(true);
				event.stopPropagation();
				event.preventDefault();
				var my_position = this.element.position();
				
				//$("ul.menu", this.element).css({
					//left: (event.pageX-my_position.left)+"px"
				//});

				return false;
			}, this);

			var on_click = function(event) {
				$("ul.menu > li", this.element).off('.menu_item');
				$(window).off('.menu_item');

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
				$("ul.menu > li", this.element).off('.menu_item');
				$(window).off('mousedown.menu_item');
			};
			this.menu_state.on("on_click", on_click, this);
			this.menu_state.on("holding", on_hold, this);
			this.menu_state.on("hidden", on_hidden, this);
		},
		_destroy_menu: function() {
			$("ul.menu > li", this.element).off('.menu_item');
			$(window).off('.menu_item');
			this.menu_state.destroy();
			this.$show_menu.destroy();
		},
		on_menu_action: function(action_name) {
			if(action_name === 'delete') {
				var event = new $.Event("command");
				event.command_type = "unset";
				event.name = this.$prop_name.get();
				event.client = this.option("obj");

				this.element.trigger(event);
			} else if(action_name === 'rename') {
			}
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
				getValueSummaryOptions: _.bind(function() {
					return {
						client: this.option("client")
					};
				}, this),
				getPurePropCellOptions: _.bind(function() {
					return { client: cjs.constraint(this.option("client")), prop: false };
				}, this),
				getPropCellOptions: _.bind(function(key) {
					var value = this.$prop_values.itemConstraint(key),
						left = function() {
							return layout_manager.get_x(key);
						},
						width = function() {
							return value.get() ? layout_manager.get_width(key) : 7;
						};

					// top fifty bad lines of code I've ever written: `value: value ? value.value : value`
					return {prop: this.option("client"),
							state: key,
							client: value,
							left: left,
							width: width };
				}, this),
				show_src: this.$show_src,
				value: this.option("client"),
				type: this.$type,
				propValues: this.$prop_values,
				show_menu: this.$show_menu
			}, this.element);
		},

		_remove_content_bindings: function() {
			cjs.destroyTemplate(this.element);
		},

		_add_class_bindings: function() {
			this._class_binding = cjs.bindClass(this.element, "child",
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
			event.stopPropagation();
			event.preventDefault();
			if(this.element.not(".selected")) {
				this.element.trigger("expand");
			}
		},
		inherit: function() {
			var event = new $.Event("command");
			event.command_type = "inherit";
			event.name = this.option("name");
			event.client = this.option("obj");

			this.element.trigger(event);
		},

		//on_select: function() { this.$selected.set(true); },
		//on_deselect: function() { this.$selected.set(false); },
		//begin_rename: function() { }
	});
}(interstate, jQuery));
