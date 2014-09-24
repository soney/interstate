/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery,window,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.HorizontalRangeDisplay = function (options) {
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
			"fill-opacity": 0.8
		});
		this.text_foreground.attr({
			fill: this.option("color"),
			"font-family": this.option("font_family"),
			"font-size": this.option("font_size"),
			"text-anchor": "middle"
		});
		this.update();

		$(this.hline.node).add(this.text_foreground.node).on("contextmenu.showmenu", _.bind(function(event) {
			event.preventDefault();
			event.stopPropagation();

			this.show_menu();
		}, this));
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_optionable(proto);
		able.make_proto_listenable(proto);

		proto.destroy = function() {
			$(this.hline.node).add(this.text_foreground.node).off("contextmenu.showmenu");
			this.remove_edit_dropdown();
			able.destroy_this_optionable(this);
			able.destroy_this_listenable(this);
		};

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
				y: y+2*height/3
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
		proto.on_toggle_concurrency_item_pressed = function() {
			var my_state = this.option("state");
			this.remove_edit_dropdown();
			my_state.async_get("isConcurrent", function(isConcurrent) {
				this._emit("make_concurrent", {
					state: my_state,
					concurrent: !isConcurrent
				});
			}, this);
		};
		proto.show_menu = function() {
			var my_state = this.option("state");
			this.add_substate_item = $("<div />")	.addClass("menu_item")
													.text("Add substate")
													.on("click", _.bind(function() {
														this.remove_edit_dropdown();
														this._emit("add_state", {
															parent: my_state
														});
													}, this));

			this.toggle_concurrency_item = $("<div />")	.addClass("menu_item")
														.html("")
														.on("click.menu_item", _.bind(this.on_toggle_concurrency_item_pressed, this));

			my_state.async_get("isConcurrent", function(is_concurrent) {
				var checkbox_mark = is_concurrent ? "&#x2612;" : "&#x2610;";
				this.toggle_concurrency_item.html("Concurrent " + checkbox_mark)
			}, this);

			this.reset_item = $("<div />")	.addClass("menu_item")
													.text("Reset")
													.on("click", _.bind(function() {
														this.remove_edit_dropdown();
														this._emit("reset", {
															parent: my_state
														});
													}, this));

			var x = this.option("from_x");
			var y = this.option("y");
			var width = this.option("to_x") - x;

			var paper = this.option("paper");
			//var parentElement = paper.canvas.parentNode;
			var parentElement = paper.node.parentNode;

			this.edit_dropdown = $("<div />")	.append(this.add_substate_item, this.toggle_concurrency_item, this.reset_item)
												.addClass("dropdown")
												.css({
													position: "absolute",
													left: x + "px",
													top: y + "px",
													width: width + "px"
												})
												.appendTo(parentElement);
			$(window).on("mousedown.collapse", _.bind(this.on_window_click_while_expanded, this));
			$(window).on("keydown.collapse", _.bind(this.on_window_keydown_while_expanded, this));
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
			$(window).off("mousedown.collapse");
			$(window).off("keydown.collapse");
		};
	}(ist.HorizontalRangeDisplay));
	
}(interstate, jQuery));
