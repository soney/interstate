/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	
	var editing_text_template = cjs.createTemplate("<textarea />");

	cjs.registerCustomPartial("editing_text", {
		createNode: function(init_val) {
			var node = editing_text_template({ });

			$(node).editing_text({
				init_val: init_val
			});

			return node;
		},
		onAdd: function(node, init_val) {
			$(node)	.editing_text("option", "init_val", init_val)
					.editing_text("onAdd");
		},
		onRemove: function(node) {
			$(node)	.editing_text("option", "helper", false)
					.editing_text("onRemove");
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
			this._confirm = _.bind(this._confirm_edit, this);
			this._cancel = _.bind(this._cancel_edit, this);
			this._on_edit_blur = _.bind(this.on_edit_blur, this);
			this._on_edit_focus = _.bind(this.on_edit_focus, this);
			this._on_edit_keydown = _.bind(this.on_edit_keydown, this);
			this._on_helper_focus = _.bind(this.on_helper_focus, this);
			this._on_helper_blur = _.bind(this.on_helper_blur, this);
			this._on_helper_change = _.bind(this.on_helper_change, this);

			this._helper_focused = false;
			this.element.on("blur", this._on_edit_blur)
						.on("focus", this._on_edit_focus)
						.on("keydown", this._on_edit_keydown);
		},
		_destroy: function () {
			if(this.$textarea_binding) { this.$textarea_binding.destroy(); }
			this.option("helper", false);
			this.element.off("blur", this._on_edit_blur)
						.off("focus", this._on_edit_focus)
						.off("keydown", this._on_edit_keydown);
			var helper = this.option("helper");
			if(helper) {
				helper.off("blur", this._on_helper_blur);
				helper.off("focus", this._on_helper_focus);
				helper.off("change", this._on_helper_change);
			}

			this._super();
		},

		onAdd: function() {
			$("#confirm_button").on("mousedown", this._confirm);
			$("#cancel_button").on("mousedown", this._cancel);
			this.element.val(this.option("init_val"));
			_.defer(_.bind(function() { $(this.element).select().focus(); }, this));
		},

		onRemove: function() {
			$("#confirm_button").off("mousedown", this._confirm);
			$("#cancel_button").off("mousedown", this._cancel);
		},

		_setOption: function(key, value) {
			if(key === "helper") {
				var helper = value,
					old_helper = this.option("helper");

				if(this.$textarea_binding) { this.$textarea_binding.destroy(); }

				if(old_helper) {
					old_helper.off("change", this._on_helper_change);
					old_helper.off("focus", this._on_helper_focus);
					old_helper.off("blur", this._on_helper_blur);
					old_helper.setValue("");
				}

				if(helper) {
					helper.on("change", this._on_helper_change);
					helper.on("focus", this._on_helper_focus);
					helper.on("blur", this._on_helper_blur);

					helper.setValue(this.element.val() || " ", 1);
					this.$textarea_binding = cjs(this.element[0]);
					this.$textarea_binding.onChange(function() {
						helper.setValue(this.$textarea_binding.get(), 1);
					}, this);
				}
			}
			this._super(key, value);
		},
		on_edit_blur: function(event) {
			var helper = this.option("helper");
			event.preventDefault();
			event.stopPropagation();

			if(helper) {
				this._editor_blur_timeout = setTimeout(this._confirm, 50);
			} else {
				this._confirm();
			}
		},
		on_edit_focus: function(event) {
			event.preventDefault();
			event.stopPropagation();

			if(this._helper_blur_timeout) {
				window.clearTimeout(this._helper_blur_timeout);
				delete this._helper_blur_timeout;
			}

			this._helper_focused = false;
		},
		on_helper_blur: function(event) {
			this._helper_focused = false;
			this._helper_blur_timeout = setTimeout(this._confirm, 50);
		},
		on_helper_focus: function(event) {
			if(this._editor_blur_timeout) {
				window.clearTimeout(this._editor_blur_timeout);
				delete this._editor_blur_timeout;
			}
			this._helper_focused = true;
			var helper = this.option("helper");
			helper.on("change", this._on_helper_change);
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
				var helper = this.option("helper");

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
		},
		on_helper_change: function() {
			if(this._helper_focused) {
				var helper = this.option("helper");
				if(helper) {
					this.element.val(helper.getValue());
				}
			}
		}
	});
}(interstate, jQuery));
