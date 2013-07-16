/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	$.widget("red.dropdown", {
		options: {
			text: "",
			items: [],
			expanded: false
		},

		_create: function () {
			this.element.addClass("dropdown");
			this.$on_btn_click = $.proxy(this.on_btn_click, this);
			this.btn = $("<span />").appendTo(this.element)
									.addClass("btn")
									.on("click", this.$on_btn_click);
			this.btn_text = $("<span />")	.addClass("txt")
											.text(this.option("text"))
											.appendTo(this.btn);
			this.caret = $("<span />")	.addClass("caret")
										.appendTo(this.btn);
			this.menu_items = $("<span />")	.addClass("menu")
											.appendTo(this.element);
			this.update_items();
		},

		_destroy: function () {
			this._super();
			this.element.removeClass("dropdown");
			this.btn.remove();
			this.menu_items.remove();
		},

		update_items: function() {
			this.menu_items.children().remove();
			_.each(this.option("items"), function(item) {
				this.menu_items.append(item);
			}, this);
		},

		on_btn_click: function() {
			if(this.option("expanded")) {
				this.collapse();
			} else {
				this.expand();
			}
		},

		expand: function() {
			this.element.addClass("expanded");
			this.option("expanded", true);
			this.$on_window_click_while_expanded = $.proxy(this.on_window_click_while_expanded, this);
			$(window).on("mousedown", this.$on_window_click_while_expanded);
		},

		on_window_click_while_expanded: function(event) {
			if(!$(event.target).parents().is(this.element)) {
				this.collapse();
			}
		},

		collapse: function() {
			this.element.removeClass("expanded");
			this.option("expanded", false);
			$(window).off("mousedown", this.$on_window_click_while_expanded);
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "text") {
				this.btn_text.text(this.option("text"));
			}
		}

	});

	$.widget("red.submenu", {
		options: {
			text: "",
			items: [],
			expanded: false,
			collapse_delay: 300
		},

		_create: function () {
			this.element.addClass("submenu");
			this.$on_mover = $.proxy(this.on_mouseover, this);
			this.$on_mout = $.proxy(this.on_mouseout, this);

			this.btn = $("<span />").appendTo(this.element)
									.text(this.option("text"))
									.addClass("btn");
			this.element.on("mouseover", this.$on_mover)
						.on("mouseout", this.$on_mout);

			this.caret = $("<span />")	.addClass("right_caret")
										.appendTo(this.btn);
			this.menu_items = $("<span />")	.addClass("menu")
											.appendTo(this.element);
			this.update_items();
		},

		_destroy: function () {
			this.element.removeClass("submenu");
			this.btn.remove();
			this.menu_items.remove();
		},

		update_items: function() {
			this.menu_items.children().remove();
			_.each(this.option("items"), function(item) {
				this.menu_items.append(item);
			}, this);
		},

		on_btn_click: function() {
			if(this.option("expanded")) {
				this.collapse();
			} else {
				this.expand();
			}
		},

		expand: function() {
			this.element.addClass("expanded");
			this.option("expanded", true);
			this.$on_window_click_while_expanded = $.proxy(this.on_window_click_while_expanded, this);
			$(window).on("mousedown", this.$on_window_click_while_expanded);
		},

		collapse: function() {
			this.element.removeClass("expanded");
			this.option("expanded", false);
			$(window).off("mousedown", this.$on_window_click_while_expanded);
		},

		on_mouseover: function() {
			this.expand();
			if(this.collapse_timeout) {
				window.clearTimeout(this.collapse_timeout);
				delete this.collapse_timeout;
			}
		},

		on_mouseout: function() {
			if(this.collapse_timeout) {
				window.clearTimeout(this.collapse_timeout);
			}
			this.collapse_timeout = window.setTimeout($.proxy(this.collapse, this), this.option("collapse_delay"));
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "text") {
				this.btn.text(this.option("text"));
			}
		}
	});
}(red, jQuery));
