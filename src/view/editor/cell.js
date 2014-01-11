/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var UNSET_RADIUS = 7;

	var on_cell_key_down = function(event) {
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
	};

	var cell_template = cjs.createTemplate(
		"{{#fsm edit_state}}" +
			"{{#state unset}}" +
				"<span class='unset'></span>" +
			"{{#state idle}}" +
				"<span cjs-on-click=do_edit>{{str}}</span>" +
			"{{#state editing}}" +
				"<textarea cjs-on-blur=on_edit_blur cjs-on-keydown=on_edit_keydown />" +
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
			value: false,
			left: 0,
			width: 0,
			edit_width: 150,
			active: false,
			parent: false
		},
		_create: function() {
			var client = this.option("value");

			this.$str = client.get_$("get_str");
			this.$syntax_errors = client.get_$("get_syntax_errors");
			this.edit_state = cjs	.fsm("unset", "idle", "editing")
									.startsAt("idle");
			this.$active = cjs(this.option("active"));


			this.add_content_bindings();
			this.add_tooltip();
			this.add_class_bindings();
			this.add_position_bindings();
			client.signal_interest();
		},
		_destroy: function() {
			var client = this.option("value");
			this.remvoe_content_bindings();
			this.remove_tooltip();
			this.remove_position_bindings();
			this.remove_class_bindings();

			cjs.destroyTemplate(this.element);
			client.signal_destroy();

			this._super();

			delete this.options;
		},

		emit_new_value: function(value) {
			var event = new $.Event("command");
			event.command_type = "set_str";
			event.str = value;
			event.client = this.option("value");

			this.element.trigger(event);
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
		add_content_bindings: function() {
			var do_edit = this.edit_state.addTransition("idle", "editing"),
				cancel_edit = this.edit_state.addTransition("editing", "idle"),
				confirm_edit = this.edit_state.addTransition("editing", "idle"),
				cell = cell_template({
					edit_state: this.edit_state,
					client: this.option("value"),
					str: this.$str,
					do_edit: _.bind(function(event) {
						do_edit(event);
						var textarea = $("textarea", cell);
						textarea.val(this.$str.get())
								.select()
								.focus();
						event.stopPropagation();
					}, this),
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
					}, this)
				}, this.element);
		},
		remove_content_bindings: function() {
		},
		add_class_bindings: function() {
			this.element.addClass("cell");
			this._class_binding = cjs.class(this.element, this.$active.iif("active", ""));
		},
		remove_class_bindings: function() {
			this.element.removeClass("cell");
			this._class_binding.destroy();
		},
		add_position_bindings: function() {
			this.$specified_width = cjs(this.option("width"));
			this.$width = cjs.inFSM(this.edit_state, {
				idle: this.$specified_width,
				editing: this.option("edit_width")
			});
			this.$left = cjs(this.option("left"));
			this.$edit_width = cjs(this.option("edit_width"));

			this.position_binding = cjs.css(this.element, {
				left: this.$left.sub(this.$width.div(2)).add("px"),
				width: this.$width.add("px")
			});
		},
		remove_position_bindings: function() {
			each([this.$specified_width, this.$width, this.$left, this.$edit_width, this.$active, this.position_binding],
					function(x) {
						x.destroy(true);
					});
		},
		add_tooltip: function() {
			this.element.tooltip({
				position: {
					my: "center bottom-1",
					at: "center top"
				},
				show: false,
				hide: false
			});
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
					var str = this.$str.get();

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
				}
			});
		},
		remove_tooltip: function() {
			this._tooltip_live_fn.destroy();
			delete this._tooltip_live_fn;
		},
		begin_editing: function() {
		}
	});

	$.widget("interstate.unset_prop", {
		options: {
			left: 0,
			radius: 7,
			state: null
		},
		_create: function() {
			this.element.addClass("unset")
						.attr("tabindex", 1)
						.on("keydown.unset", _.bind(on_cell_key_down, this));
			this.update_left();
		},
		_destroy: function() {
			this.element.removeClass("unset")
						.off("keydown.unset");
			delete this.options.state;
		},
		update_left: function() {
			this.element.css("left", (this.option("left") - this.option("radius")) + "px");
		},
		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "left" || key === "radius") {
				this.update_left();
			}
		}
	});
}(interstate, jQuery));
