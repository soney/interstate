/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,jQuery,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.StateView = function (options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {
			state: null,
			paper: null,
			lws: {x: 0, y: 0},
			lwe: {x: 0, y: 0},
			rws: {x: 0, y: 0},
			rwe: {x: 0, y: 0},
			c: {x: 0, y: 0},
			default_stroke: "black",
			default_fill: "white",
			active_fill: "red",
			active_text_foreground: "#900",
			active_stroke: "red",
			selectable_fill: "#AAA",
			text_foreground: "black",
			text_background: "white",
			font_family: "Source Sans Pro",
			font_size: "12px",
			padding_top: 0,
			paper_height: 9999,
			vline_color: "#CCC",
			vline_dasharray: ". "
		}, options);

		this.$on_window_click_while_expanded = $.proxy(this.on_window_click_while_expanded, this);
		this.$on_window_keydown_while_expanded = $.proxy(this.on_window_keydown_while_expanded, this);
		this.active_fn = cjs.liven(function () {
			var state = this.option("state");
			if (state.is_initialized() && state.is_active()) {
				if (this.path) {
					this.path.animate({
						"fill": this.option("active_fill"),
						"stroke": this.option("active_stroke")
					}, 300, "ease-out");
					this.label.option("color", this.option("active_text_foreground"), 300);
				}
			} else {
				if (this.path) {
					this.path.animate({
						"fill": this.option("default_fill"),
						"stroke": this.option("default_stroke")
					}, 300, "ease-out");
					this.label.option("color", this.option("text_foreground"), 300);
				}
			}
		}, {
			context: this
		});

		var state = this.option("state");

		if (state.is_initialized()) {
			this.initialize();
		} else {
			state.once("initialized", _.bind(this.initialize, this));
		}
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);
		proto.initialize = function () {
			var state = this.option("state");
			var paper = this.option("paper");
			this.path = paper.path(this.get_path_str());
			this.path.attr({
				"stroke": this.option(state.is_active() ? "active_stroke" : "default_stroke"),
				"fill": this.option(state.is_active() ? "active_fill" : "default_fill")
			}).toBack();
			var center = this.option("c");

			this.label = new red.EditableText(paper, {x: center.x, y: center.y, text: this.get_name(), fill: this.option("text_background"), color: this.option("text_foreground")});
			this.label	.on("cancel", $.proxy(this.on_cancel_rename, this))
						.on("change", $.proxy(this.on_confirm_rename, this));
			this.label.option({
				"font-size": this.option("font_size"),
				"font-family": this.option("font_family")
			});
			this.label.on("change", this.forward);
			$(this.path[0]).add(this.label.text[0]).on("contextmenu", $.proxy(function(event) {
				event.preventDefault();
				event.stopPropagation();

				this.show_menu();
			}, this));
			this.vline = paper	.path("M0,0")
								.attr({
									stroke: this.option("vline_color"),
									"stroke-dasharray": this.option("vline_dasharray")
								})
								.toBack();

		};

		proto.toFront = function() {
			if(this.path) {
				this.path.toFront();
			}
			if(this.vline) {
				this.vline.toFront();
			}
			if(this.label) {
				this.label.toFront();
			}
		};

		proto.get_name = function() {
			var state = this.option("state");
			var name = state.get_name("parent");
			return name;
		};

		proto._on_options_set = function (values) {
			if (this.path) {
				var state = this.option("state");
				var path_str = this.get_path_str();
				this.path.attr({
					"path": path_str
				});
				if(state.parent_is_concurrent()) {
					this.path.attr({
						"stroke-dasharray": "- "
					});
				} else {
					this.path.attr({
						"stroke-dasharray": ""
					});
				}
				var paper_height = this.option("paper_height");
				var center = this.option("c");
				var name = state.get_name("parent");
				this.label.option({
					x: center.x,
					y: center.y,
					text: name
				});
				this.update_menu_position();
				this.vline.attr({
					path: "M" + center.x + "," + center.y + "V" + paper_height
				});
			}
		};

		proto.show_menu = function() {
			var my_state = this.option("state");
			this.add_transition = $("<div />")	.addClass("menu_item")
												.text("Add transition")
												.pressable()
												.on("pressed", $.proxy(function() {
													this.remove_edit_dropdown();
													var from_state = my_state;
													var root = from_state.root();
													var selectable_substates = _.rest(root.flatten_substates()); // the first element is the major statechart itself
													this._emit("awaiting_state_selection", {
														states: selectable_substates,
														on_select: $.proxy(function(to_state) {
															this._emit("add_transition", {
																from: from_state,
																to: to_state
															});
														}, this)
													});
												}, this));
			this.rename_item = $("<div />")	.addClass("menu_item")
											.text("Rename")
											.pressable()
											.on("pressed", $.proxy(function() {
												this.remove_edit_dropdown();
												this.begin_rename();
											}, this));
			this.remove_item = $("<div />")	.addClass("menu_item")
											.text("Delete")
											.pressable()
											.on("pressed", $.proxy(function() {
												this.remove_edit_dropdown();
												this._emit("remove_state", {
													state: my_state
												});
											}, this));

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
			var lwe = this.option("lwe"),
				rws = this.option("rws");
			var PADDING = 1;
			var HEIGHT = 10;
			var width = rws.x-lwe.x - 2*PADDING;
			var x = lwe.x + PADDING;
			var y = lwe.y - HEIGHT/2;

			var paper = this.option("paper");
			var parentElement = paper.canvas.parentNode;

			this.edit_dropdown = $("<div />")	.append(this.add_transition, this.add_substate_item, this.toggle_concurrency_item, this.rename_item, this.remove_item)
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
		proto.update_menu_position = function() {
			if(this.edit_dropdown) {
				var lwe = this.option("lwe"),
					rws = this.option("rws");
				var PADDING = 1;
				var HEIGHT = 10;
				var width = rws.x-lwe.x - 2*PADDING;
				var x = lwe.x + PADDING;
				var y = lwe.y - HEIGHT/2;
				var state = this.option("state");
				var name = this.get_name();
				this.edit_dropdown.css({
					left: x + "px",
					top: y + "px",
					width: width + "px"
				});
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


		proto.begin_rename = function() {
			this.label.edit();
		};

		proto.on_cancel_rename = function(event) { };

		proto.on_confirm_rename = function(event) {
			var value = event.value;
			this._emit("rename", {
				name: value,
				state: this.option("state")
			});
		};

		proto.get_path_str = function () {
			var pts = [this.option("lws"), this.option("lwe"), this.option("rws"), this.option("rwe")];
			var padding_top = this.option("padding_top");
			var x0 = pts[0].x;
			var y0 = pts[0].y;
			var path_str = "M" + x0 + "," + padding_top + "L" + _.map(pts, function (pt) {
				return pt.x + "," + pt.y;
			}).join("L") + "V"+padding_top+"Z";
			return path_str;
		};
		proto.remove = function () {
			this.path.remove();
			this.label.remove();
			this.vline.remove();
			if(this.edit_dropdown) {
				this.edit_dropdown.remove();
				delete this.edit_dropdown;
			}
		};
		proto.destroy = function() {
			this.active_fn.destroy();
			if(this.edit_dropdown) {
				this.edit_dropdown.dropdown("destroy");
			}
			able.destroy_this_listenable(this);
			able.destroy_this_optionable(this);
		};
		proto.make_selectable = function(callback) {
			this.path.attr({
				fill: this.option("selectable_fill"),
				cursor: "pointer"
			});
			if(this._selectable_callback) {
				this.path.unclick(this._selectable_callback);
			}
			this._selectable_callback = callback;
			this.path.click(this._selectable_callback);
		};
		proto.unmake_selectable = function() {
			if(this._selectable_callback) {
				this.path.unclick(this._selectable_callback);
				delete this._selectable_callback;
			}
			var state = this.option("state");
			this.path.attr({
				fill: this.option(state.is_active() ? "active_fill" : "default_fill"),
				cursor: ""
			});
		};
	}(red.StateView));
}(red, jQuery));
