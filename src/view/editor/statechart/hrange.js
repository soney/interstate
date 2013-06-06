/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,jQuery,window,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.HorizontalRangeDisplay = function (options) {
		able.make_this_optionable(this, {
			font_family: "Source Sans Pro",
			font_size: "12px",
			line_color: "black",
			color: "black",
			background: "white",
			height: 10,
			y: 1,
			from_x: 0,
			to_x: 0,
			paper: false,
			text: "",
			state: null
		}, options);
		able.make_this_listenable(this);
		this.$on_window_click_while_expanded = $.proxy(this.on_window_click_while_expanded, this);
		this.$on_window_keydown_while_expanded = $.proxy(this.on_window_keydown_while_expanded, this);
		var paper = this.option("paper");

		this.left_vline = paper.path("M0,0");
		this.right_vline = paper.path("M0,0");
		this.hline = paper.path("M0,0");
		this.text_background = paper.rect(0,0,0,0);
		this.text_foreground = paper.text(0, 0, this.option("text"));

		this.left_vline.attr({
			stroke: this.option("line_color")
		});
		this.right_vline.attr({
			stroke: this.option("line_color")
		});
		this.hline.attr({
			stroke: this.option("line_color")
		});
		this.text_background.attr({
			stroke: "none",
			fill: this.option("background"),
			"fill-opacity": 0.5
		});
		this.text_foreground.attr({
			fill: this.option("color"),
			"font-family": this.option("font_family"),
			"font-size": this.option("font_size")
		});
		this.update();

		$(this.hline[0]).add(this.text_foreground[0]).on("contextmenu", $.proxy(function(event) {
			event.preventDefault();
			event.stopPropagation();

			this.show_menu();
		}, this));
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_optionable(proto);
		able.make_proto_listenable(proto);

		proto.update = function() {
			var from_x = this.option("from_x"),
				to_x = this.option("to_x"),
				text = this.option("text"),
				y = this.option("y"),
				height = this.option("height");
			this.left_vline.attr({
				path: "M"+from_x+","+y+"V"+(y+height)
			});
			this.right_vline.attr({
				path: "M"+to_x+","+y+"V"+(y+height)
			});
			this.hline.attr({
				path: "M"+from_x+","+(y+height/2)+"H"+to_x
			});
			this.text_foreground.attr({
				x: (from_x + to_x)/2,
				y: y+height/2
			});
			var bbox = this.text_foreground.getBBox();
			this.text_background.attr({
				x: bbox.x,
				y: bbox.y,
				height: bbox.height,
				width: bbox.width
			});
		};

		proto._on_options_set = function () {
			this.update();
		};
		proto.show_menu = function() {
			var my_state = this.option("state");
			this.add_substate_item = $("<div />")	.addClass("menu_item")
													.text("Add substate")
													.pressable()
													.on("pressed", $.proxy(function() {
														this.remove_edit_dropdown();
														this._emit("add_state", {
															parent: my_state
														});
													}, this));

			var is_concurrent = this.option("state").is_concurrent();
			var checkbox_mark = is_concurrent ? "&#x2612;" : "&#x2610;";
			this.toggle_concurrency_item = $("<div />")	.addClass("menu_item")
														.html("Concurrent " + checkbox_mark)
														.pressable()
														.on("pressed", $.proxy(function() {
															this.remove_edit_dropdown();
															this._emit("make_concurrent", {
																state: my_state,
																concurrent: !my_state.is_concurrent()
															});
														}, this));

			var x = this.option("from_x");
			var y = this.option("y");
			var width = this.option("to_x") - x;

			var paper = this.option("paper");
			var parentElement = paper.canvas.parentNode;

			this.edit_dropdown = $("<div />")	.append(this.add_substate_item, this.toggle_concurrency_item)
												.addClass("dropdown")
												.css({
													position: "absolute",
													left: x + "px",
													top: y + "px",
													width: width + "px"
												})
												.appendTo(parentElement);
			$(window).on("mousedown", this.$on_window_click_while_expanded);
			$(window).on("keydown", this.$on_window_keydown_while_expanded);
		};
		proto.on_window_click_while_expanded = function(event) {
			if(!$(event.target).parents().is(this.edit_dropdown)) {
				this.remove_edit_dropdown();
			}
		};
		proto.on_window_keydown_while_expanded = function(event) {
			if(event.keyCode === 27) { // esc
				this.remove_edit_dropdown();
			}
		};
		proto.remove_edit_dropdown = function() {
			if(this.edit_dropdown) {
				this.edit_dropdown.remove();
				delete this.edit_dropdown;
			}
			$(window).off("mousedown", this.$on_window_click_while_expanded);
			$(window).off("keydown", this.$on_window_keydown_while_expanded);
		};
	}(red.HorizontalRangeDisplay));
	
}(red, jQuery));
