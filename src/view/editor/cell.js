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
		"{{#if is_set}}" +
			"{{#fsm edit_state}}" +
				"{{#state idle}}" +
					"{{#if str===''}}" +
						"<span class='empty'>(empty)</span>" +
					"{{#else}}" +
						"{{str}}" +
					"{{/if}}" +
				"{{#state editing}}" +
					"<textarea cjs-on-blur=on_edit_blur cjs-on-keydown=on_edit_keydown />" +
			"{{/fsm}}" +
		"{{/if}}"
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
			value: false,
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
			var client = this.option("value"),
				client_val = client.get();

			if(client_val) {
				client_val.signal_interest();
				this.$str = client_val.get_$("get_str");
				this.$syntax_errors = client_val.get_$("get_syntax_errors");
			} else {
				this.$str = cjs();
				this.$syntax_errors = cjs();
			}

			client.onChange(function() {
				var client_val = client.get();
				if(client_val) {
					client_val.signal_interest();
					this.$str.set(client_val.get_$("get_str"));
					this.$syntax_errors.set(client_val.get_$("get_syntax_errors"));
				} else {
					this.$str.set();
					this.$syntax_errors.set();
				}
			}, this);

			this.edit_state = cjs	.fsm("idle", "editing")
									.startsAt("idle");
			this.$active = cjs(this.option("active"));
			this.$left = cjs(this.option("left"));
			this.$is_set = client.iif(true, false);
			this.$pure = cjs(!this.option("prop"));
			this.$visible = this.$pure.or(this.$left.neq(undefined));

			this.do_edit = this.edit_state.addTransition("idle", "editing"),

			this._add_content_bindings();
			this._add_tooltip();
			this._add_class_bindings();
			this._add_position_bindings();
		},
		_destroy: function() {
			var client = this.option("value"),
				client_val = client.get();

			this._remove_position_bindings();
			this._remove_class_bindings();
			this._remove_tooltip();
			this._remove_content_bindings();

			this.$str.destroy();
			this.$syntax_errors.destroy();
			this.$active.destroy();
			this.$left.destroy();
			this.$is_set.destroy();
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
				event.client = cjs.get(this.option("value"));

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
					is_set: this.$is_set
				}, this.element);
			this.element.on("click.start_edit", _.bind(function(event) {
				if(this.$is_set.get()) {
					this.begin_editing(event);
				} else {
					this._set_value_for_state(event);
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
									this.$is_set.iif("", "unset"),
									this.edit_state.state);
		},
		_remove_class_bindings: function() {
			this.element.removeClass("cell");
			this._class_binding.destroy();
		},
		_add_position_bindings: function() {
			this.$specified_width = cjs(this.option("width"));
			this.$width = cjs.inFSM(this.edit_state, {
				idle: this.$is_set.iif(this.$specified_width, this.option("unset_radius")*2),
				editing: this.option("edit_width")
			});
			this.$edit_width = cjs(this.option("edit_width"));

			this.$z_index = cjs.inFSM(this.edit_state, {
				idle: 0,
				editing: 99
			});
			this.element.css("min-width", this.option("width"));

			this.position_binding = cjs.bindCSS(this.element, {
				left: this.$left.sub(this.$width.div(2)).add("px"),
				"z-index": this.$z_index,
				"visibility": this.$visible.iif("visible", "hidden")
			});
		},
		_remove_position_bindings: function() {
			_.each([this.$specified_width, this.$width, this.$left, this.$edit_width, this.$active, this.position_binding],
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
		_set_value_for_state: function(event) {
			var event = new $.Event("command");
			event.command_type = "set_stateful_prop_for_state";
			event.prop = this.option("prop");
			event.state = this.option("state");

			this.element.trigger(event);
		}
	});

	function on_cell_key_down(event) {
		var keyCode = event.keyCode;
		var prev, next, next_focusable, prev_focusable;
		if(this.element.is(event.target)) {
			if(keyCode === 79 || keyCode === 13) { // o or ENTER
				event.preventDefault();
				event.stopPropagation();
				if(this.element.hasClass("unset")) {
					this.element.trigger("click");
				} else {
					this.begin_editing();
				}
			} else if(keyCode === 39 || keyCode === 76) { // Right or o or k
				next_focusable = this.element.next(":focusable");
				if(next_focusable.length>0) {
					next_focusable.focus();
				} else {
					var prop = this.element.parents(":focusable").first();
					next = prop.next();
					if(next.length>0) {
						next.focus();
					} else {
						prop.focus();
					}
				}
			} else if(keyCode === 37 || keyCode === 72) { // Left
				prev_focusable = this.element.prev(":focusable");
				if(prev_focusable.length>0) {
					prev_focusable.focus();
				} else {
					this.element.parents(":focusable").first().focus();
				}
			} else if(keyCode === 40 || keyCode === 74) { //down or j
				var next_prop = this.element.parents(":focusable").first().next();
				next_focusable = $(":focusable", next_prop).eq(this.element.index());
				if(next_focusable.length>0) {
					next_focusable.focus();
				} else {
					next_prop.focus();
				}
			} else if(keyCode === 38 || keyCode === 75) { // up or k
				var prev_prop = this.element.parents(":focusable").first().prev();
				prev_focusable = $(":focusable", prev_prop).eq(this.element.index());
				if(prev_focusable.length>0) {
					prev_focusable.focus();
				} else {
					prev_prop.focus();
				}
			} else if(keyCode === 8) { //backspace
				if(this.element.hasClass("cell")) {
					this.unset();
				}
			}
		}
	}
}(interstate, jQuery));
