/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	
	var editing_text_template = cjs.createTemplate("<textarea cjs-on-blur=on_edit_blur cjs-on-keydown=on_edit_keydown />");

	cjs.registerCustomPartial("editing_text", {
		createNode: function(init_val) {
			var node = editing_text_template({
				on_edit_blur: function(event) {
					$(node).editing_text("on_edit_blur", event);
				},
				on_edit_keydown: function(event) {
					$(node).editing_text("on_edit_keydown", event);
				}
			});
			$(node).editing_text({
				init_val: init_val
			});

			return node;
		},
		onAdd: function(node, init_val) {
			_.defer(function() { $(node).val(init_val).select().focus(); });
			$(node).editing_text("onAdd");
		},
		onRemove: function(node) {
			$(node).editing_text("option", "helper", false);
			$(node).editing_text("onRemove");
		},
		destroyNode: function(node) {
			$(node).editing_text("destroy");
		}
	});
	$.widget("interstate.editing_text", {
		options: {
			init_val: "",
			helper: false
		},
		_create: function () {
			this._helper_focused = false;
			this.element.val(this.option("init_val"));
			this._confirm = _.bind(this._confirm_edit, this);
			this._cancel = _.bind(this._cancel_edit, this);
		},
		_destroy: function () {
			if(this.$textarea_binding) { this.$textarea_binding.destroy(); }
			this.option("helper", false);
			this._super();
		},

		onAdd: function() {
			$("#confirm_button").on("mousedown", this._confirm);
			$("#cancel_button").on("mousedown", this._cancel);
		},

		onRemove: function() {
			$("#confirm_button").off("mousedown", this._confirm);
			$("#cancel_button").off("mousedown", this._cancel);
		},

		_setOption: function(key, value) {
			if(key === "helper") {
				var editor = value,
					old_editor = this.option("helper");

				if(this.$textarea_binding) { this.$textarea_binding.destroy(); }

				if(old_editor) {
					old_editor.setValue("");
				}

				if(editor) {
					editor.setValue(this.element.val() || " ", 1);
					this.$textarea_binding = cjs(this.element[0]);
					this.$textarea_binding.onChange(function() {
						editor.setValue(this.$textarea_binding.get(), 1);
					}, this);
				}
			}
			this._super(key, value);
		},
		on_edit_blur: function(event) {
			var editor = this.option("helper"),
				do_confirm = _.bind(this._confirm_edit, this);
			event.preventDefault();
			event.stopPropagation();

			var on_editor_blur = _.bind(function(e) {
					this._helper_focused = false;
					_.delay(_.bind(function() {
						if(editor.isFocused()) {
							this._helper_focused = true;
						} else if(this.element.is(":focus")) {
							this._helper_focused = false;
						} else {
							do_confirm();
						}
					}, this), 50);

					editor.off("blur", on_editor_blur);
					editor.off("change", on_editor_change);
				}, this),
				on_editor_change = _.bind(function(event) {
					if(this._helper_focused) {
						this.element.val(editor.getValue());
					}
				}, this);

			if(editor) { // they might have clicked on the helper
				_.delay(_.bind(function() {
					if(editor.isFocused()) {
						this._helper_focused = true;
						editor.on("change", on_editor_change);
						editor.on("blur", on_editor_blur);
					} else {
						do_confirm();
					}
				}, this), 50);
			} else {
				do_confirm();
			}
		},
		on_edit_keydown: function(event) {
			var keyCode = event.keyCode;

			if(keyCode === 27) { //esc
				event.preventDefault();
				event.stopPropagation();
				this._cancel_edit();
			} else if(keyCode === 13) { //enter
				if(!event.shiftKey && !event.ctrlKey && !event.metaKey) {
					event.preventDefault();
					event.stopPropagation();

					this._confirm_edit();
				}
			}
		},
		cancel: function() {
			return this._cancel_edit();
		},

		_confirm_edit: function() {
			if(!this.__blocked) {
				this.__blocked = true;

				var e = new $.Event("confirm_value");
				e.value = this.element.val().trim();
				this.element.trigger(e);

				_.delay(_.bind(function() {
					delete this.__blocked;
				}, this), 50);
			}
		},
		_cancel_edit: function() {
			if(!this.__blocked) {
				this.__blocked = true;
				var e = new $.Event("cancel_value");
				this.element.trigger(e);
				_.delay(_.bind(function() {
					delete this.__blocked;
				}, this), 50);
			}
		}
	});
}(interstate, jQuery));
