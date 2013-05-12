/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	$.widget("red.pressable", {
		options: {
			touch_move_tolerance: 10
		},

		_create: function() {
			this.$on_touch_start = $.proxy(this.on_touch_start, this);
			this.$on_touch_move = $.proxy(this.on_touch_move, this);
			this.$on_touch_end = $.proxy(this.on_touch_end, this);
			this.$on_click = $.proxy(this.on_click, this);

			this.element.on("touchstart", this.$on_touch_start);
			this.element.on("click", this.$on_click);

			this.active = false;
		},

		_destroy: function() {
			this.element.off("touchstart", this.$on_touch_start);
			this.element.off("click", this.$on_click);

			this.reset();
		},

		on_touch_start: function(jqEvent) {
			var event = jqEvent.originalEvent;
			this.startX = event.touches[0].clientX;
			this.startY = event.touches[0].clientY;
			this.active = true;
			this.element.on("touchend", this.$on_touch_end);
			this.element.on("touchmove", this.$on_touch_move);
		},

		on_touch_move: function(jqEvent) {
			var event = jqEvent.originalEvent;
			if (Math.abs(event.touches[0].clientX - this.startX) > 10 ||
				Math.abs(event.touches[0].clientY - this.startY) > 10) {
				this.reset();
			}
		},

		on_touch_end: function(jqEvent) {
			var event = jqEvent.originalEvent;
			event.stopPropagation();
			event.preventDefault();
			this.reset();
			this.trigger_pressed(event);
		},

		on_click: function(jqEvent) {
			var event = jqEvent.originalEvent;
			event.stopPropagation();
			event.preventDefault();
			this.reset();
			this.trigger_pressed(event);
		},

		trigger_pressed: function(event) {
			this.element.trigger("pressed", event);
		},

		reset: function() {
			if(this.active) {
				this.active = false;
				delete this.startX;
				delete this.startY;
				this.element.off("touchend", this.$on_touch_end);
				this.element.off("touchmove", this.$on_touch_move);
			}
		}
	});
}(red, jQuery));
