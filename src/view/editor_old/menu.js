/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	$.widget("interstate.menu", {
		options: {
			title: "menu",
			items: {}
		},

		_create: function() {
			this.element.addClass("collapsed menu");
			this.label = $("<span />")	.addClass("title")
										.text(this.option("title"))
										.appendTo(this.element)
										.on("click", $.proxy(this.on_menu_click, this));

			this.expanded_contents = $("<div />")	.addClass("contents")
													.appendTo(this.element)
													.hide();
			this.update_menu();
		},

		_destroy: function() {
			this._super();
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "items") {
				this.update_menu();
			}
		},

		update_menu: function() {
			this.expanded_contents.empty();
			_.each(this.option("items"), function(item, title) {
				var menu_item = $("<div />").text(title)
											.addClass("item")
											.appendTo(this.expanded_contents);
				if(item.disabled) {
					menu_item.addClass("disabled");
				} else {
					menu_item.on("click", $.proxy(function() {
						this.collapse();
						item.on_select();
					}, this));
				}
			}, this);
		},

		on_menu_click: function(event) {
			event.preventDefault();
			event.stopPropagation();

			if(this.is_expanded()) {
				this.collapse();
			} else {
				this.expand();
			}
		},

		is_expanded: function() {
			return this.element.hasClass("expanded");
		},

		expand: function() {
			this.element.addClass("expanded")
						.removeClass("collapsed");
			this.label.hide();
			this.expanded_contents.show();

			var on_click = $.proxy(function(event) {
				if($(event.target).parents().is(this.element)) {
					return;
				}

				this.collapse();
			}, this);

			$(window).on("mousedown.ist_menu_click", on_click);
		},

		collapse: function() {
			$(window).off("mousedown.ist_menu_click");
			this.element.removeClass("expanded")
						.addClass("collapsed");
			this.label.show();
			this.expanded_contents.hide();
		}
	});
}(interstate, jQuery));
