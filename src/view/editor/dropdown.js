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
			expanded: false,
			direction: "up"
		},

		_create: function () {
			this.element.addClass("dropdown");
			this.$on_btn_click = $.proxy(this.on_btn_click, this);
			this.btn = $("<span />").appendTo(this.element)
									.text(this.option("text"))
									.addClass("btn")
									.on("click", this.$on_btn_click);
			this.menu_items = $("<span />")	.addClass("menu")
											.appendTo(this.element);
			this.update_items();
		},

		_destroy: function () {
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
				this.unexpand();
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
				this.unexpand();
			}
		},

		unexpand: function() {
			this.element.removeClass("expanded");
			this.option("expanded", false);
			$(window).off("mousedown", this.$on_window_click_while_expanded);
		}
	});
}(red, jQuery));
