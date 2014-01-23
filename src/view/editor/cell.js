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
						//"<textarea cjs-on-blur=on_edit_blur cjs-on-keydown=on_edit_keydown />" +
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
			prop: false
		},
		_create: function() {
			var client = this.option("client"),
				client_val = client.get(),
				old_client = client_val;

			var client_is_valid;

			//this.$is_set = client.iif(true, false);
			this.client_state = cjs.fsm('unset', 'initialedit', 'set');

			this.$$STR = false;
			this.$$SE = false;
			if(client_val) {
				client_is_valid = true;
				client_val.signal_interest();
				this.$$STR = client_val.get_$("get_str");
				this.$$SE = client_val.get_$("get_syntax_errors");
				this.$$STR.signal_interest();
				this.$$SE.signal_interest();
				this.client_state._setState('set');
			} else {
				this.client_state._setState('unset');
				client_is_valid = false;
			}
			this.$str = cjs(this.$$STR);
			this.$syntax_errors = cjs(this.$$SE);


			client.onChange(function() {
				var client_was_valid = client_is_valid,
					client_val = client.get();
				if(this.$$STR) {
					this.$$STR.signal_destroy();
					this.$$SE.signal_destroy();
				}
				if(client_val) {
					client_is_valid = true;
					this.$$STR = client_val.get_$("get_str");
					this.$$SE = client_val.get_$("get_syntax_errors");
					this.client_state._setState('set');
				} else {
					client_is_valid = false;
					this.$$STR = false;
					this.$$SE = false;
					this.client_state._setState('unset');
				}
				this.$str.set(this.$$STR);
				this.$syntax_errors.set(this.$$SE);

				if(client_is_valid && !client_was_valid) {
					client_val.signal_interest();
				} else if(client_was_valid && !client_is_valid) {
					old_client.signal_destroy();
				} else if(client_was_valid && client_is_valid) {
					old_client.signal_destroy();
					client_val.signal_interest();
				}
				old_client = client_val;
			}, this);

			this.edit_state = cjs	.fsm("idle", "editing")
									.startsAt("idle");
			this.$active = cjs(this.option("active"));
			this.$left = cjs(this.option("left"));

								
			this.$pure = cjs(!this.option("prop"));
			this.$visible = this.$pure.or(this.$left.neq(undefined));
			
			this.do_edit = this.edit_state.addTransition("idle", "editing"),

			this._add_content_bindings();
			this._add_tooltip();
			this._add_class_bindings();
			this._add_position_bindings();
		},
		_destroy: function() {
			var client = this.option("client"),
				client_val = client.get();
			client.destroy();

			this._remove_position_bindings();
			this._remove_class_bindings();
			this._remove_tooltip();
			this._remove_content_bindings();

			this.$str.destroy();
			this.$syntax_errors.destroy();

			if(this.$$STR) {
				this.$$STR.signal_destroy();
				this.$$SE.signal_destroy();
			}
			if(client_val) {
				client_val.signal_destroy();
			}

			this.$active.destroy();
			this.$left.destroy();
			this.client_state.destroy();
			this.$pure.destroy();
			this.$visible.destroy();
			this.edit_state.destroy();

			if(client_val) {
				client_val.signal_destroy();
			}

			this._super();

			delete this.options;
		},

		emit_new_value: function(value) {
			if(this.option("prop") && value === "") {
				var event = new $.Event("command");
				event.command_type = "unset_stateful_prop_for_state";
				event.prop = this.option("prop");
				event.state = this.option("state");

				this.element.trigger(event);
			} else {
				var event = new $.Event("command");
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
					on_edit_blur: _.bind(function(event) {
						if(this.edit_state.is("editing")) {
							this.emit_new_value($("textarea", cell).val());
							confirm_edit(event);
						}
					}, this),
					on_edit_keydown: eqProp("keyCode", {
						"27": function(event) { // esc
							cancel_edit(event);
							event.preventDefault();
							event.stopPropagation();
						},
						"13": function(event) { // enter
							if(!event.shiftKey && !event.ctrlKey && !event.metaKey) {
								this.emit_new_value($("textarea", cell).val());
								confirm_edit(event);

								event.preventDefault();
								event.stopPropagation();
							}
						}
					}, this),
					client_state: this.client_state
				}, this.element);
			this.element.on("click.start_edit", _.bind(function(event) {
				if(this.client_state.is("set")) {
					this.begin_editing(event);
				} else {
					this._edit_initial_value(event);
				}
				event.stopPropagation();
			}, this));
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
						set: '90px',
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
			var enable_tooltip = _.bind(function() { this.element.tooltip("enable"); }, this);
			var disable_tooltip = _.bind(function() { this.element.tooltip("disable"); }, this);
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
							.on("editing->idle", enable_tooltip);
		},
		_remove_tooltip: function() {
			this._tooltip_live_fn.destroy();
			delete this._tooltip_live_fn;
		},
		begin_editing: function(event) {
			if(this.edit_state.is("idle")) {
				this.do_edit(event);
				var textarea = $("textarea", this.element);
				textarea.val(this.$str.get())
						.select()
						.focus();
			}
		},
		_edit_initial_value: function(event) {
			this.client_state._setState('initialedit');
			var textarea = $("textarea", this.element);
			textarea.select()
					.focus()
					.on("keydown", _.bind(function(e) {
						var keyCode = e.keyCode;
						if(keyCode === 27) { // esc
							this.client_state._setState('unset');
							event.preventDefault();
							event.stopPropagation();
						} else if(keyCode == 13) { // enter
							if(!e.shiftKey && !e.ctrlKey && !e.metaKey) {
								var val = $("textarea", this.element).val();
								this.client_state._setState('unset');
								this._set_value_for_state(val);

								event.preventDefault();
								event.stopPropagation();
							}
						}
					}, this))
					.on("blur", _.bind(function() {
						var val = $("textarea", this.element).val();
						this.client_state._setState('unset');
						this._set_value_for_state(val);
					}, this));
		},
		_set_value_for_state: function(val) {
			var event = new $.Event("command");
			event.command_type = "set_stateful_prop_for_state";
			event.prop = this.option("prop");
			event.state = this.option("state");
			event.text = val || "";

			this.element.trigger(event);
		}
	});
}(interstate, jQuery));
