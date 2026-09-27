/*jslint nomen: true, vars: true, white: true */
/*global interstate,window,document,jQuery,MouseEvent */

// Helpers for using the editor from the keyboard: controls that Enter, Space, and the context menu
// key (or Shift+F10) can operate, and menus that the arrow keys can navigate.
(function (ist, $) {
	"use strict";
	var _ = ist._;

	// Dispatches a real mouse event (so that both jQuery handlers and ConstraintJS's cjs.on(...)
	// events see it), aimed at the middle of the element
	var dispatch = function (element, type) {
		var box = element.getBoundingClientRect();
		element.dispatchEvent(new MouseEvent(type, {
			bubbles: true,
			cancelable: true,
			view: window,
			button: type === "contextmenu" ? 2 : 0,
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2
		}));
	};

	var keyboard = ist.keyboard = {
		click: function (element) { dispatch(element, "click"); },
		contextmenu: function (element) { dispatch(element, "contextmenu"); },
		is_activation: function (event) {
			return event.key === "Enter" || event.key === " " || event.key === "Spacebar";
		},
		is_menu_key: function (event) {
			return event.key === "ContextMenu" || (event.shiftKey && event.key === "F10");
		},

		// Makes `element` (an HTML or SVG element) focusable and operable from the keyboard.
		// options.label: its accessible name (a string, or a function called whenever it gets focus)
		// options.role: its role (default "button"; false to leave it alone)
		// options.activate: what Enter and Space do (default: click it)
		// options.menu: what the context menu key does (true: dispatch a contextmenu event at it)
		// Returns an object whose update_label() refreshes its accessible name.
		control: function (element, options) {
			element = $(element)[0];
			if (!element) { return; }
			options = options || {};
			var label = options.label;
			element.setAttribute("tabindex", options.tabindex === undefined ? "0" : String(options.tabindex));
			if (options.role !== false) {
				element.setAttribute("role", options.role || "button");
			}
			if (options.menu) {
				element.setAttribute("aria-haspopup", "menu");
			}
			var update_label = function () {
				var text = typeof label === "function" ? label() : label;
				if (text) {
					element.setAttribute("aria-label", text);
				}
			};
			update_label();
			$(element)	.off(".keyboard_control")
						.on("focus.keyboard_control", update_label)
						.on("keydown.keyboard_control", function (event) {
							if (event.target !== element) {
								return; // (e.g. typing in a text field inside of it)
							} else if (keyboard.is_activation(event)) {
								event.preventDefault();
								event.stopPropagation();
								if (options.activate) {
									options.activate(event);
								} else {
									keyboard.click(element);
								}
							} else if (options.menu && keyboard.is_menu_key(event)) {
								event.preventDefault();
								event.stopPropagation();
								if (typeof options.menu === "function") {
									options.menu(event);
								} else {
									keyboard.contextmenu(element);
								}
							}
						});
			return { update_label: update_label };
		},

		// Lets the arrow keys navigate a menu that has just been shown, and moves focus into it.
		// options.items: selector for its items, within `menu` (default "> li, > .menu_item")
		// options.choose(item): what choosing an item does (default: click it)
		// options.close(): closes the menu (for Escape and Tab)
		// options.return_focus: where focus goes once the menu is gone
		menu: function (menu, options) {
			var $menu = $(menu);
			if ($menu.length === 0) { return; }
			options = options || {};
			var $items = $menu.find(options.items || "> li, > .menu_item"),
				return_focus = options.return_focus && $(options.return_focus)[0];
			$menu.attr("role", "menu");
			$items.each(function () {
				if (!this.getAttribute("role")) {
					this.setAttribute("role", "menuitem");
				}
				this.setAttribute("tabindex", "-1");
			});
			var focus_item = function (index) {
				var count = $items.length;
				if (count > 0) {
					$items.eq(((index % count) + count) % count).focus();
				}
			};
			// (Before choosing an item, which might move focus somewhere else, like into a text field)
			var restore_focus = function () {
				if (return_focus && document.body.contains(return_focus)) {
					return_focus.focus();
				}
			};
			$menu.off(".keyboard_menu").on("keydown.keyboard_menu", function (event) {
				var index = $items.index(document.activeElement);
				if (event.key === "ArrowDown") {
					focus_item(index + 1);
				} else if (event.key === "ArrowUp") {
					focus_item(index - 1);
				} else if (event.key === "Home") {
					focus_item(0);
				} else if (event.key === "End") {
					focus_item($items.length - 1);
				} else if (keyboard.is_activation(event)) {
					if (index >= 0) {
						var item = $items[index];
						restore_focus();
						if (options.choose) {
							options.choose(item);
						} else {
							keyboard.click(item);
						}
					}
				} else if (event.key === "Escape" || event.key === "Tab") {
					restore_focus();
					if (options.close) {
						options.close();
					}
				} else {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
			});
			focus_item(0);
		},

		// Moves focus to the first of `candidates` (elements or selectors, tried in order) that's on the page
		focus_first: function (candidates) {
			var target = _.find(_.map(candidates, function (candidate) {
				return $(candidate).filter(":visible")[0];
			}), _.identity);
			if (target) {
				target.focus();
			}
			return !!target;
		},

		// Focuses what find() returns, once it returns something (trying for a couple of seconds): for
		// things that show up once a command has gone through
		focus_when: function (find, timeout) {
			var until = Date.now() + (timeout || 2000);
			var attempt = function () {
				var element = find();
				if (element) {
					element.focus();
				} else if (Date.now() < until) {
					window.setTimeout(attempt, 50);
				}
			};
			window.setTimeout(attempt, 0);
		},

		// Announces a message to screen readers
		announce: function (message) {
			var region = document.getElementById("ist_announcer");
			if (!region) {
				region = document.createElement("div");
				region.id = "ist_announcer";
				region.className = "sr-only";
				region.setAttribute("role", "status");
				region.setAttribute("aria-live", "polite");
				document.body.appendChild(region);
			}
			region.textContent = "";
			window.setTimeout(function () { region.textContent = message; }, 50);
		}
	};

	// When the element that has focus leaves the page (say, its row was deleted or the text field
	// it was editing closed) or moves, browsers send focus back to the top of the page. Instead,
	// focus it again if it moved; otherwise, focus the closest control that contained it, or else
	// the control in the same place within the closest column, statechart, or panel that's still there.
	var FOCUSABLE = "a[href], button:not([disabled]), input, select, textarea, [tabindex]",
		AREAS = ".col, .statechart, .component_list, #obj_nav, #pinned, #editor";
	var focusables = function (area) {
		return $(area).find(FOCUSABLE).filter(function () {
			return this.getAttribute("tabindex") !== "-1" && $(this).is(":visible");
		});
	};
	var last_focus = false;
	var remember_focus = function (element) {
		last_focus = {
			element: element,
			controls: $(element).parents(FOCUSABLE).not("[tabindex='-1']").toArray(),
			areas: $(element).parents(AREAS).map(function () {
				return { area: this, index: focusables(this).index(element) };
			}).toArray()
		};
	};
	var on_page = function (element) { return document.body.contains(element); };
	var recover_focus = function () {
		var active = document.activeElement;
		if (!last_focus || (active && active !== document.body && active !== document.documentElement)) {
			return;
		} else if (on_page(last_focus.element)) {
			// It was moved (like the statechart's shapes, which are reordered to keep them in front)
			last_focus.element.focus();
			return;
		}
		var target = _.find(last_focus.controls, on_page);
		if (!target) {
			_.find(last_focus.areas, function (place) {
				if (on_page(place.area)) {
					var $candidates = focusables(place.area);
					target = $candidates[Math.max(0, Math.min(place.index, $candidates.length - 1))];
				}
				return !!target;
			});
		}
		last_focus = false;
		if (target) {
			target.focus();
		}
	};
	// Tooltips (WCAG 1.4.13): the pointer can move onto one without it closing, and Escape closes
	// them wherever focus is (jQuery UI only listens for Escape in the element with the tooltip)
	if ($.ui && $.ui.tooltip) {
		$.widget("ui.tooltip", $.ui.tooltip, {
			close: function (event) {
				var tooltip = event && event.type === "mouseleave" && !event.ist_now && this._find($(event.currentTarget));
				if (tooltip && tooltip.length > 0) {
					var that = this,
						timer,
						close_now = function () {
							window.clearTimeout(timer);
							tooltip.off(".ist_hoverable");
							event.ist_now = true;
							that.close(event);
						};
					timer = window.setTimeout(close_now, 150);
					tooltip.off(".ist_hoverable")
							.on("mouseenter.ist_hoverable", function () { window.clearTimeout(timer); })
							.on("mouseleave.ist_hoverable", close_now);
					return;
				}
				return this._super(event);
			}
		});
	}

	$(function () {
		document.addEventListener("keydown", function (event) {
			if (event.key === "Escape" || event.key === "Esc") {
				$("[aria-describedby^='ui-tooltip-']").each(function () {
					var $target = $(this);
					if ($target.data("ui-tooltip")) {
						var close = $.Event("keyup");
						close.currentTarget = this;
						close.ist_now = true;
						$target.tooltip("close", close);
					}
				});
			}
		}, true);
		document.addEventListener("focusin", function (event) {
			if (event.target !== document.body) {
				remember_focus(event.target);
			}
		}, true);
		// (Not after a click, which can leave focus on the page itself on purpose)
		document.addEventListener("mousedown", function () { last_focus = false; }, true);
		if (window.MutationObserver) {
			new window.MutationObserver(recover_focus).observe(document.body, { childList: true, subtree: true });
		}
	});
}(interstate, jQuery));
