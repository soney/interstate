/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var STATE = {
		IDLE: {},
		EDITING: {}
	};

	$.widget("interstate.editable_text", {
		options: {
			text: "",
			placeholder_text: "",
			edit_event: "click",
			tag: "input"
		},

		_create: function() {
			this.$edit = $.proxy(this.edit, this);
			this.set_state(STATE.IDLE);
			this.update_static_text();
		},

		update_static_text: function() {
			var text = this.option("text");
			if(text) {
				this.element.removeClass("placeholder");
			} else {
				text = this.option("placeholder_text");
				this.element.addClass("placeholder");
			}

			this.element.text(text);
			if(this.option("edit_event")) {
				this.element.on(this.option("edit_event"), this.$edit);
			}
		},

		edit: function(event) {
			if(event) {
				event.preventDefault();
				event.stopPropagation();
			}
			if(this.get_state() === STATE.IDLE) {
				this.element.removeClass("placeholder");
				this.element.off(this.option("edit_event"), this.$edit);
				this.element.html(""); // Clear the children
				this.textbox = $("<" + this.option("tag") + " />")	.attr({
														type: "text"
													})
													.val(this.option("text"))
													.appendTo(this.element)
													.focus()
													.select()
													.on("keydown", $.proxy(function(event) {
														var keyCode = event.keyCode;
														if(keyCode === 27 && !event.shiftKey) { // ESC
															this.cancel();
														} else if(keyCode === 13 && !event.shiftKey) { // Enter
															this.confirm();
														}
													}, this))
													.on("blur", $.proxy(function(event) {
														if(this.get_state() === STATE.EDITING) {
															this.confirm();
														}
													}, this));
				this.set_state(STATE.EDITING);

				this.element.trigger("begin_edit");
			}
		},

		confirm: function() {
			var old_value = this.option("text");

			var value = this.textbox.val();
			if(value !== this.option("text")) {
				var event = new $.Event("text_change");
				event.str = this.textbox.val();
				this.option("text", value);

				this.element.trigger(event);
			}

			this.textbox.remove();
			this.set_state(STATE.IDLE);
			this.update_static_text();

			var de_event = new $.Event("done_editing");
			de_event.from_str = old_value;
			de_event.to_str = de_event.str = value;

			this.element.trigger(de_event);
		},

		cancel: function() {
			this.textbox.remove();
			this.set_state(STATE.IDLE);
			this.update_static_text();

			var str = this.option("text");

			var de_event = new $.Event("done_editing");
			de_event.from_str = str;
			de_event.to_str = de_event.str = str;

			this.element.trigger(de_event);
		},

		get_state: function() {
			return this.state;
		},

		set_state: function(state) {
			this.state = state;
		},

		_destroy: function() {
			this._super();
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "text") {
				this.update_static_text();
			}
		}
	});

}(interstate, jQuery));
