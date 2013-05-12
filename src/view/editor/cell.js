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
			active: false
		},
		_create: function() {
			this.element.addClass("cell");
			this.update_position();
			this.update_active();
			this.create_live_text_fn();
			this.$on_click = $.proxy(this.on_click, this);
			this.element.on("click", this.$on_click);
		},
		_destroy: function() {
			this.element.removeClass("cell");
			this.destroy_live_text_fn();
			this.element.off("click", this.$on_click);
		},
		on_click: function() {
			console.log("edit me");
		},
		create_live_text_fn: function() {
			var value = this.option("value");
			if(value.type() === "raw_cell") {
				var $str = value.get_$("get_str");
				this.live_text_fn = cjs.liven(function() {
					var str = $str.get();
					this.element.text(str);
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
			this.element.addClass("unset");
			this.update_left();
			this.$on_click = $.proxy(this.on_click, this);
			this.element.on("click", this.$on_click);
		},
		_destroy: function() {
			this.element.removeClass("unset");
			this.element.off("click", this.$on_click);
		},
		update_left: function() {
			this.element.css("left", (this.option("left") - this.option("radius")) + "px");
		},
		on_click: function() {
			console.log("set me");
		},
		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "left" || key === "radius") {
				this.update_left();
			}
		}
	});
}(red, jQuery));
