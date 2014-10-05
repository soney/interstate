/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	
	cjs.registerCustomPartial("propCell", {
		createNode: function(options) {
			return $("<span />").prop_cell(options);
		},
		destroyNode: function(node) {
			$(node).prop_cell("destroy");
		}
	});

	var cell_template = cjs.createTemplate(
		"{{#fsm client_state}}" +
			"{{#state initialedit}}" +
				"{{>editing_text ''}}" +
			"{{#state set}}" +
				"{{#fsm edit_state}}" +
					"{{#state idle}}" +
						"{{#if str===''}}" +
							"<span class='empty'>(empty)</span>" +
						"{{#else}}" +
							"{{str}}" +
						"{{/if}}" +
					"{{#state editing}}" +
						"{{>editing_text str}}" +
				"{{/fsm}}" +
		"{{/fsm}}"
	);

	var eqProp = function(prop_name, values, thisArg) {
		return function(x) {
			var val = x[prop_name];
			if(values[val]) {
				return values[val].apply(thisArg || this, arguments);
			}
		};
	};

	$.widget("interstate.prop_cell", {
		options: {
			client: false,
			left: undefined,
			width: 0,
			edit_width: 150,
			unset_radius: 7,
			active: false,
			parent: false,
			state: false,
			prop: false,
			default_max_width: 90,
			char_limit: 200
		},
		_create: function() {
			var client = this.option("client");

			var elem = this.element;
			this.client_state = cjs.fsm('unset', 'initialedit', 'set')
									.addTransition('unset', 'initialedit', cjs.on('click', this.element))
									.addTransition('initialedit', 'set', function(dt) {
										elem.on('confirm_value.cell', dt);
									})
									.addTransition('initialedit', 'unset', function(dt) {
										elem.on('cancel_value.cell', dt);
									})
									.on('initialedit->set', function(event) {
										this._set_value_for_state(event.value);
									}, this)
									.on("unset->initialedit", this._emit_begin_editing, this)
									.on("initialedit->*", this._emit_done_editing, this);

			this.client_state._setState(client.get() ? 'set' : 'unset');
			client.onChange(function() {
				this.client_state._setState(client.get() ? 'set' : 'unset');
			}, this);

			this.$cell_info = ist.indirectClient(this.option("client"), "get_str", "get_syntax_errors");

			this.$str = this.$cell_info.itemConstraint("get_str");
			this.$syntax_errors = this.$cell_info.itemConstraint("get_syntax_errors");

			this.edit_state = cjs	.fsm("idle", "editing")
									.startsAt("idle")
									.addTransition('idle', 'editing', cjs.on('click', this.element).guard(_.bind(function() {
										return !!client.get();
									}, this)))
									.addTransition('editing', 'idle', function(dt) {
										elem.on('confirm_value.cell', dt);
									})
									.addTransition('editing', 'idle', function(dt) {
										elem.on('cancel_value.cell', dt);
									})
									.on('editing->idle', function(event) {
										if(event.type === 'confirm_value') {
											this._emit_new_value(event.value);
										}
									}, this);

			this.$active = cjs(function() {
				var active_value = this.option("active_value"),
					avval = cjs.get(active_value),
					av = avval ? avval.value : false;

				return av && av === cjs.get(this.option("client"));
			}, {context: this});
			this.$left = cjs(this.option("left"));

								
			this.$pure = cjs(!this.option("prop"));
			this.$visible = this.$pure.or(this.$left.neq(undefined));
			
			this.do_edit = this.edit_state.addTransition("idle", "editing");

			this._add_content_bindings();
			this._add_tooltip();
			this._add_class_bindings();
			this._add_position_bindings();
		},
		_destroy: function() {
			var client = this.option("client");

			this.element.off("confirm_value.cell cancel_value.cell")
				.children().remove();

			this._remove_position_bindings();
			this._remove_class_bindings();
			this._remove_tooltip();
			this._remove_content_bindings();


			this.$str.destroy();
			this.$syntax_errors.destroy();

			this.$cell_info.destroy();

			this.$active.destroy();
			this.$left.destroy();
			this.client_state.destroy();
			this.$pure.destroy();
			this.$visible.destroy();
			this.edit_state.destroy();

			client.destroy();

			this._super();
		},

		_emit_new_value: function(value) {
			var event;
			if(this.option("prop") && value === "") {
				event = new $.Event("command");
				event.command_type = "unset_stateful_prop_for_state";
				event.prop = this.option("prop");
				event.state = this.option("state");

				this.element.trigger(event);
			} else {
				event = new $.Event("command");
				event.command_type = "set_str";
				event.str = value;
				event.client = cjs.get(this.option("client"));

				this.element.trigger(event);
			}
		},
		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "left") {
				this.$left.set(value);
			} else if(key === "width") {
				this.$specified_width.set(value);
			} else if(key === "active") {
				this.$active.set(value);
			}
		},
		_add_content_bindings: function() {
			var cancel_edit = this.edit_state.addTransition("editing", "idle"),
				confirm_edit = this.edit_state.addTransition("editing", "idle"),
				cell = cell_template({
					edit_state: this.edit_state,
					str: this.$str,
					client_state: this.client_state
				}, this.element);
		},
		_remove_content_bindings: function() {
			this.element.off("click.start_edit");
			cjs.destroyTemplate(this.element);
		},
		_add_class_bindings: function() {
			this.element.addClass("cell");
			this._class_binding = cjs.bindClass(this.element,
									this.$active.iif("active", ""),
									this.$pure.iif("pure_cell", ""),
									cjs.inFSM(this.client_state, {
										unset: 'unset',
										set: '',
										initialedit: 'editing'
									}),
									this.edit_state.state);
		},
		_remove_class_bindings: function() {
			this._class_binding.destroy();
			this.element.removeClass("cell");
		},
		_add_position_bindings: function() {
			this.$specified_width = cjs(this.option("width"));
			this.$width = cjs.inFSM(this.edit_state, {
				idle: cjs.inFSM(this.client_state, {
					unset: this.option("unset_radius")*2,
					set: this.$specified_width,
					initialedit: this.option("edit_width")
				}),
				editing: this.option("edit_width")
			});
			this.$edit_width = cjs(this.option("edit_width"));

			this.$z_index = cjs.inFSM(this.edit_state, {
				idle: cjs.inFSM(this.client_state, {
					unset: 0,
					set: 0,
					initialedit: 99
				}),
				editing: 99
			});
			this.element.css("min-width", this.option("width"));

			this.position_binding = cjs.bindCSS(this.element, {
				left: this.$left.sub(this.$width.div(2)).add("px"),
				"z-index": this.$z_index,
				"visibility": this.$visible.iif("visible", "hidden"),
				'max-width': cjs.inFSM(this.edit_state, {
					idle: cjs.inFSM(this.client_state, {
						unset: this.option("unset_radius")*2,
						set: this.option("default_max_width") + 'px',
						initialedit: 'none'
					}),
					editing: 'none'
				})
			});
		},
		_remove_position_bindings: function() {
			_.each([this.$specified_width, this.$width, this.$left, this.$edit_width, this.$z_index, this.$active, this.position_binding],
					function(x) {
						x.destroy(true);
					});
		},
		_add_tooltip: function() {
			this.element.tooltip({
				position: {
					my: "center bottom-1",
					at: "center top"
				},
				show: false,
				hide: false,
				content: ""
			});
			var enable_tooltip = _.bind(function() {
				this.element.tooltip("enable");
			}, this);
			var disable_tooltip = _.bind(function() {
				this.element.tooltip("disable");
			}, this);
			this._tooltip_live_fn = cjs.liven(function() {
				var syntax_errors = this.$syntax_errors.get();
				if(syntax_errors && syntax_errors.length > 0) {
					var syntax_error_text = syntax_errors[0];

					this.element.addClass("error")
								.attr("title", syntax_error_text)
								.tooltip("option", {
									tooltipClass: "error",
									content: syntax_error_text
								});
				} else {
					var str = this.$str.get() || "";

					if(str.length > this.option("char_limit")) {
						str = str.slice(0, this.option("char_limit")-3)+"...";
					}

					this.element.removeClass("error")
								.attr("title", str)
								.tooltip("option", {
									tooltipClass: "cell_text",
									content: str
								});
				}
			}, {
				context: this,
				on_destroy: function() {
					this.element.tooltip("destroy");
					this.edit_state	.off("idle->editing", disable_tooltip)
									.off("editing->idle", enable_tooltip);
				}
			});

			this.edit_state	.on("idle->editing", disable_tooltip)
							.on("idle->editing", this._emit_begin_editing, this)
							.on("editing->idle", enable_tooltip)
							.on("editing->idle", this._emit_done_editing, this);
		},
		_remove_tooltip: function() {
			this._tooltip_live_fn.destroy();
			delete this._tooltip_live_fn;
		},
		_set_value_for_state: function(val) {
			var event = new $.Event("command");
			event.command_type = "set_stateful_prop_for_state";
			event.prop = this.option("prop");
			event.state = this.option("state");
			event.text = val || "";

			this.element.trigger(event);
		},
		_emit_begin_editing: function() {
			var event = new $.Event("begin_editing_cell");
			event.initial_val = this.$str.get();
			event.textarea = $("textarea", this.element)[0];
			this.element.trigger(event);
		},
		_emit_done_editing: function() {
			var event = new $.Event("done_editing_cell");
			this.element.trigger(event);
		}
	});
}(interstate, jQuery));
