/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var UNSET_RADIUS = 7;

	$.widget("red.prop_cell", {
		options: {
			value: false,
			left: 0,
			width: 0,
			active: false,
			parent: false
		},
		_create: function() {
			this.element.addClass("cell")
						.attr("tabindex", 1);
			this.update_position();
			this.update_active();
			this.create_live_text_fn();
			this.$on_click = $.proxy(this.on_click, this);
			this.element.on("click", this.$on_click);

			this.text = $("<span />")	.addClass("txt")
										.appendTo(this.element);
			this.element.on("keydown", $.proxy(this.on_key_down, this));
		},
		_destroy: function() {
			this.text.remove();
			this.element.removeClass("cell");
			this.destroy_live_text_fn();
			this.element.off("click", this.$on_click);
		},
		on_click: function() {
			this.begin_editing();
		},
		on_key_down: function() {
		},
		create_live_text_fn: function() {
			var value = this.option("value");
			if(value.type() === "raw_cell") {
				var $str = value.get_$("get_str");
				this.live_text_fn = cjs.liven(function() {
					var str = $str.get();
					this.str = str;
					if(str === "") {
						this.text.html("&nbsp;");
					} else {
						this.text.text(str);
					}
				}, {
					context: this
				});
			}
		},
		destroy_live_text_fn: function() {
			if(this.live_text_fn) {
				this.live_text_fn.destroy();
			}
		},
		update_position: function() {
			var left = this.option("left"),
				width = this.option("width");
			this.element.css({
				left: (left - width/2) + "px",
				width: width + "px"
			});
		},
		update_active: function() {
			if(this.option("active")) {
				this.element.addClass("active");
			} else {
				this.element.removeClass("active");
			}
		},
		begin_editing: function() {
			this.element.off("click", this.$on_click);
			this.text.hide();
			this.$end_edit = $.proxy(this.end_edit, this);
			this.textbox = $("<input />")	.attr("type", "text")
											.appendTo(this.element)
											.on("keydown", $.proxy(function(event) {
												if(event.keyCode === 27) {
													this.end_edit(true);
												} else if(event.keyCode === 13) {
													this.end_edit();
												}
											}, this))
											.on("blur", this.$end_edit);

			this.textbox.val(this.str);
			this.focus();
			this.select();
		},
		end_edit: function(cancel) {
			this.element.on("click", this.$on_click);
			if(cancel !== true) {
				var val = this.textbox.val();
				var event;
				if(val.trim() === "" && this.option("prop") && this.option("state")) {
					event = new $.Event("command");
					event.command_type = "unset_stateful_prop_for_state";
					event.prop = this.option("prop");
					event.state = this.option("state");

					this.element.trigger(event);
				} else {
					event = new $.Event("command");
					event.command_type = "set_str";
					event.str = val;
					event.client = this.option("value");

					this.element.trigger(event);
				}
			}
			this.text.show();
			this.textbox.remove();
		},
		focus: function() {
			if(this.textbox) {
				this.textbox.focus();
			}
		},
		select: function() {
			if(this.textbox) {
				this.textbox.select();
			}
		},
		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "left" || key === "width") {
				this.update_position();
			} else if(key === "active") {
				this.update_active();
			}
		}
	});

	$.widget("red.unset_prop", {
		options: {
			left: 0,
			radius: 7
		},
		_create: function() {
			this.element.addClass("unset")
						.attr("tabindex", 1);
			this.update_left();
		},
		_destroy: function() {
			this.element.removeClass("unset");
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
}(red, jQuery));
