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
			active_stroke: "red",
			selectable_fill: "#666",
			text_foreground: "black",
			text_background: "white",
			font_family: "Source Sans Pro",
			font_size: "12px",
			padding_top: 0
		}, options);
		this.active_fn = cjs.liven(function () {
			var state = this.option("state");
			if (state.is_initialized() && state.is_active()) {
				if (this.path) {
					this.path.animate({
						"fill": this.option("active_fill"),
						"stroke": this.option("active_stroke")
					}, 300, "ease-out");
				}
			} else {
				if (this.path) {
					this.path.animate({
						"fill": this.option("default_fill"),
						"stroke": this.option("default_stroke")
					}, 300, "ease-out");
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

			this.label = new red.EditableText(paper, {x: center.x, y: center.y, text: this.get_name(), fill: this.option("text_background"), color: this.option("text_foreground"), edit_on_click: false});
			this.label.option({
				"font-size": this.option("font_size"),
				"font-family": this.option("font_family")
			});
			this.label.on("change", this.forward);
			$(this.path[0]).on("contextmenu", $.proxy(function(event) {
				event.preventDefault();
				event.stopPropagation();

				this.show_menu();
			}, this));
		};

		proto.get_name = function() {
			var state = this.option("state");
			return state.get_name("parent");
		};

		proto._on_options_set = function (values) {
			if (this.path) {
				var path_str = this.get_path_str();
				this.path.attr({
					"path": path_str
				});
				var center = this.option("c");
				var state = this.option("state");
				var name = state.get_name("parent");
				this.label.option({
					x: center.x,
					y: center.y,
					text: name
				});
				this.update_dropdown_position();
			}
		};

		proto.show_menu = function() {
			this.add_transition = $("<div />")	.addClass("menu_item")
												.text("Add transition")
												.pressable()
												.on("pressed", $.proxy(function() {
													this.edit_dropdown.dropdown("collapse");
													var from_state = this.option("state");
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
												this.edit_dropdown.dropdown("collapse");
												this.begin_rename();
											}, this));
			this.remove_item = $("<div />")	.addClass("menu_item")
											.text("Remove")
											.pressable()
											.on("pressed", $.proxy(function() {
												this.edit_dropdown.dropdown("collapse");
												this._emit("remove_state", {
													state: this.option("state")
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

			this.edit_dropdown = $("<div />")	.append(this.add_transition, this.rename_item, this.remove_item)
												.addClass("dropdown")
												.css({
													position: "absolute",
													left: x + "px",
													top: y + "px",
													width: width + "px"
												})
												.appendTo(parentElement);
												/*
			if(this.label) {
				this.label.hide();
			}
		/*
			var paper = this.option("paper");
			var parentElement = paper.canvas.parentNode;
			this.add_substate = $("<div />").addClass("menu_item")
											.text("Add substate")
											.pressable()
											.on("pressed", $.proxy(function() {
												this.edit_dropdown.dropdown("collapse");
												this._emit("add_substate");
											}, this));
			this.add_transition = $("<div />")	.addClass("menu_item")
												.text("Add transition")
												.pressable()
												.on("pressed", $.proxy(function() {
													this.edit_dropdown.dropdown("collapse");
													var from_state = this.option("state");
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
			this.edit_actions = $("<div />").addClass("menu_item")
											.text("Actions...")
											.pressable()
											.on("pressed", $.proxy(function() {
												this.edit_dropdown.dropdown("collapse");
												console.log("edit actions");
											}, this));
			this.rename_item = $("<div />")	.addClass("menu_item")
											.text("Rename")
											.pressable()
											.on("pressed", $.proxy(function() {
												this.edit_dropdown.dropdown("collapse");
												this.begin_rename();
											}, this));
			this.remove_item = $("<div />")	.addClass("menu_item")
											.text("Remove")
											.pressable()
											.on("pressed", $.proxy(function() {
												this.edit_dropdown.dropdown("collapse");
												this._emit("remove_state", {
													state: this.option("state")
												});
											}, this));
			this.make_concurrent = $("<div />")	.addClass("menu_item")
												.html("Concurrent&nbsp;&#9745;")
												.pressable()
												.on("pressed", $.proxy(function() {
													this.make_concurrent.html("Concurrent&nbsp;&#9744;");
													//this.make_concurrent.html("Concurrent&nbsp;&#9745;");
													this._emit("make_concurrent");
												}, this));
			var lwe = this.option("lwe"),
				rws = this.option("rws");
			var PADDING = 1;
			var HEIGHT = 10;
			var width = rws.x-lwe.x - 2*PADDING;
			var x = lwe.x + PADDING;
			var y = lwe.y - HEIGHT/2;

			this.edit_dropdown = $("<div />")	.dropdown({
													text: this.get_name(),
													items: [this.add_transition, this.rename_item, this.remove_item]
												})
												.appendTo(parentElement)
												.css({
													position: "absolute",
													left: x + "px",
													top: y + "px",
													width: width + "px"
												});
			if(this.label) {
				this.label.hide();
			}
			*/
		};
		proto.update_dropdown_position = function() {
			if(this.edit_dropdown) {
				var lwe = this.option("lwe"),
					rws = this.option("rws");
				var PADDING = 1;
				var HEIGHT = 10;
				var width = rws.x-lwe.x - 2*PADDING;
				var x = lwe.x + PADDING;
				var y = lwe.y - HEIGHT/2;
				var state = this.option("state");
				var name = state.get_name("parent");
				this.edit_dropdown.dropdown("option", "text", name);
				this.edit_dropdown.css({
					position: "absolute",
					left: x + "px",
					top: y + "px",
					width: width + "px"
				});
			}
		};
		proto.done_editing = function() {
			this.edit_dropdown.dropdown("destroy").remove();
			delete this.edit_dropdown;
			this.label.show();
		};

		proto.begin_rename = function() {
			this.$on_cancel_rename = $.proxy(this.on_cancel_rename, this);
			this.$on_confirm_rename = $.proxy(this.on_confirm_rename, this);
			this.label	.show()
						.edit()
						.focus()
						.select()
						.on("cancel", this.$on_cancel_rename)
						.on("change", this.$on_confirm_rename);
			this.edit_dropdown.hide();
		};

		proto.on_cancel_rename = function(event) {
			this.end_rename();
		};

		proto.on_confirm_rename = function(event) {
			var value = event.value;
			this.end_rename();
			this._emit("rename", {
				name: value,
				state: this.option("state")
			});
		};

		proto.end_rename = function() {
			this.edit_dropdown.show();
			this.label	.hide()
						.off("cancel", this.$on_cancel_rename)
						.off("change", this.$on_end_rename);
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
