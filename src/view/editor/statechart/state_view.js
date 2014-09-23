/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	var highlight_running = ist.__debug_statecharts;

	ist.StateView = function (options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {
			state: null,
			paper: null,
			layout: false,
			default_stroke: "black",
			default_fill: "white",
			active_fill: "green",
			active_text_foreground: "#008000",
			active_stroke: "green",
			selectable_fill: "#AAA",
			text_foreground: "black",
			text_background: "none",
			font_family: "Source Sans Pro",
			font_size: 12,
			padding_top: 0,
			paper_height: 9999,
			vline_color: "#CCC",
			vline_dasharray: "1,2",
			stroke_width: 1,
			running_width: 3
		}, options);

		var state = this.option("state");
		this.active = state.get_$("isActive");
		this.active_fn = cjs.liven(function () {
			if (this.active.get()) {
				if (this.path) {
					this.path.animate({
						"fill": this.option("active_fill"),
						"stroke": this.option("active_stroke")
					}, 300, mina.easeout);
					this.label.option("color", this.option("active_text_foreground"), 300);
				}
			} else {
				if (this.path) {
					this.path.animate({
						"fill": this.option("default_fill"),
						"stroke": this.option("default_stroke")
					}, 300, mina.easeout);
					this.label.option("color", this.option("text_foreground"), 300);
				}
			}
		}, {
			context: this
		});
		if(highlight_running) {
			var running = state.get_$("isActive");
			this.running_fn = cjs.liven(function () {
				var state = this.option("state");
				if (running.get()) {
					if (this.path) {
						this.path.attr("stroke-width", this.option("running_width"));
					}
				} else {
					if (this.path) {
						this.path.attr("stroke-width", this.option("stroke_width"));
					}
				}
			}, {
				context: this
			});
		}

		var state = this.option("state");
		var paper = this.option("paper");

		this.path = paper	.path("M0,0");
		this.path.appendTo(paper);
		this.vline = paper	.path("M0,0")
							.attr({
								stroke: this.option("vline_color"),
								"stroke-dasharray": this.option("vline_dasharray")
							});
		this.vline.prependTo(paper);
		this.name = state.get_$("getName", "parent");
		this.label = new ist.EditableText(paper, {x: -100, y: -100, text: "", fill: this.option("text_background"), color: this.option("text_foreground")});

		this.initialize();
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);
		proto.initialize = function () {
			var state = this.option("state");
			this.path .attr({
							"path": this.get_path_str(),
							"stroke": "default_stroke",
							"fill": "default_fill"
						});
			var layout = this.option("layout");
			this.parent_is_concurrent = state.get_$("parentIsConcurrent");
			this.is_concurrent = state.get_$("isConcurrent");

			this.label	.on("cancel", this.on_cancel_rename, this)
						.on("change", this.on_confirm_rename, this);
			this.label.option({
				"font-size": this.option("font_size"),
				"font-family": this.option("font_family"),
				x: layout.x,
				y: layout.y,
				text: this.get_name()
			});
			this.label.on("change", this.forward_event, this);
			this.$clickable = $([this.path.node, this.label.text.node]);
			this.$clickable.on("contextmenu.show", _.bind(this.show_menu, this));
			if(this.parent_is_concurrent.get()) {
				this.path.attr({
					"stroke-dasharray": "- "
				});
			} else {
				this.path.attr({
					"stroke-dasharray": ""
				});
			}
		};

		proto.toFront = function() {
			var paper = this.option("paper");
			this.path.appendTo(paper);
			this.vline.appendTo(paper);
			this.label.toFront();
		};

		proto.get_name = function() {
			return this.name.get();
			//var state = this.option("state");
			//var name = state.get_name("parent");
			//return name;
		};

		proto._on_options_set = function (values) {
			if (this.path) {
				var state = this.option("state");
				var path_str = this.get_path_str();
				this.path.attr({
					"path": path_str
				});
				if(this.parent_is_concurrent.get()) {
					this.path.attr({
						"stroke-dasharray": "- "
					});
				} else {
					this.path.attr({
						"stroke-dasharray": ""
					});
				}
				var paper_height = this.option("paper_height");
				var layout = this.option("layout");
				var name = this.name.get();
				this.label.option({
					x: layout.x,
					y: layout.y,
					text: name
				});
				this.update_menu_position();
				this.vline.attr({
					path: "M" + layout.x + "," + layout.y + "V" + paper_height
				});
			}
		};

		proto.show_menu = function(event) {
			if(event) {
				event.preventDefault();
				event.stopPropagation();
			}
			this.add_transition = $("<div />")	.addClass("menu_item")
												.text("Add transition")
												.on("click.menu_item", _.bind(this.on_add_transition_item_pressed, this));
			this.rename_item = $("<div />")	.addClass("menu_item")
											.text("Rename")
											.on("click.menu_item", _.bind(this.on_rename_item_pressed, this));
			this.remove_item = $("<div />")	.addClass("menu_item")
											.text("Delete")
											.on("click.menu_item", _.bind(this.on_remove_item_pressed, this));

			this.add_substate_item = $("<div />")	.addClass("menu_item")
													.text("Add substate")
													.on("click.menu_item", _.bind(this.on_add_substate_item_pressed, this));

			var is_concurrent = this.is_concurrent.get();
			var checkbox_mark = is_concurrent ? "&#x2612;" : "&#x2610;";
			this.toggle_concurrency_item = $("<div />")	.addClass("menu_item")
														.html("Concurrent " + checkbox_mark)
														.on("click.menu_item", _.bind(this.on_toggle_concurrency_item_pressed, this));
			this.toggle_breakpoint_item = $("<div />")	.addClass("menu_item")
														.text("Add breakpoint")
														.on("click.menu_item", _.bind(this.on_toggle_breakpoint_item_pressed, this));
			var PADDING = 1;
			var HEIGHT = 10;
			var width = 20 - 2*PADDING;
			var x = 0;//lwe.x + PADDING;
			var y = 0;//lwe.y - HEIGHT/2;

			var paper = this.option("paper");
			//var parentElement = paper.canvas.parentNode;
			var parentElement = paper.node.parentNode;

			this.edit_dropdown = $("<div />")	.append(this.add_transition, this.add_substate_item, this.toggle_concurrency_item, this.toggle_breakpoint_item, this.rename_item, this.remove_item)
												.addClass("dropdown")
												.css({
													position: "absolute",
													left: x + "px",
													top: y + "px",
													width: width + "px"
												})
												.appendTo(parentElement);
			var state = this.option("state");
			$(window).on("mousedown.expanded_mousedown", _.bind(this.on_window_click_while_expanded, this));
			$(window).on("keydown.expanded_keydown", _.bind(this.on_window_keydown_while_expanded, this));
		};
		proto.add_transition_to_state = function(to_state) {
			this._emit("add_transition", {
				from: this.option("state"),
				to: to_state
			});
		};
		proto.on_add_transition_item_pressed = function(event) {
			event.preventDefault();
			event.stopPropagation();
			this.remove_edit_dropdown();
			var from_state = this.option("state");
			var root = from_state.root();
			var flat_statecharts = root.flatten_substates();
			var selectable_substates = flat_statecharts.splice(0, flat_statecharts.length-1); // the first element is the major statechart itself
			this._emit("awaiting_state_selection", {
				states: selectable_substates,
				on_select: _.bind(function() {
								this.add_transition_to_state.apply(this, arguments);
								$(window).off("mousemove.update_display_arrow");
								arrow_disp.remove();
								arrow_disp.destroy();
							}, this),
				on_cancel: _.bind(function() {
								$(window).off("mousemove.update_display_arrow");
								arrow_disp.remove();
								arrow_disp.destroy();
							}, this)
			});

			var paper = this.option("paper"),
				lwe = this.option("lwe"),
				rwe = this.option("rwe");
			var cx = (lwe.x + rwe.x) / 2;
			var cy = (this.option("padding_top") + lwe.y)/2;

			var arrow_disp = new ist.ArrowView({
				paper: paper,
				from: { x: cx, y: cy },
				to: {x: cx, y: cy}
			});
			$(arrow_disp.arrow_path[0]).css("pointer-events", "none");
			
			$(window).on("mousemove.update_display_arrow", function(event) {
				var offset = $(paper.canvas).offset();
				//var offset = $(paper.node).offset();
				arrow_disp.option("to", { x: event.clientX - offset.left, y: event.clientY - offset.top });
			});
		};
		proto.on_add_substate_item_pressed = function() {
			this.remove_edit_dropdown();
			this._emit("add_state", {
				parent: this.option("state")
			});
		};
		proto.on_rename_item_pressed = function() {
			this.remove_edit_dropdown();
			this.begin_rename();
		};
		proto.on_remove_item_pressed = function() {
			this.remove_edit_dropdown();
			this._emit("remove_state", {
				state: this.option("state")
			});
		};
		proto.on_toggle_concurrency_item_pressed = function() {
			var my_state = this.option("state");
			this.remove_edit_dropdown();
			this._emit("make_concurrent", {
				state: my_state,
				concurrent: !my_state.is_concurrent()
			});
		};
		proto.on_toggle_breakpoint_item_pressed = function() {
			var my_state = this.option("state");
			this.remove_edit_dropdown();
			this._has_breakpoint = true;
			this._emit("toggle_breakpoint", {
				state: my_state
			});
			if(this.togglebreakpoint.text() === "Add breakpoint") {
				this.togglebreakpoint.text("Remove breakpoint");
				this._emit("toggle_breakpoint", {
					transition: my_transition
				});
			} else {
				this.togglebreakpoint.text("Add breakpoint");
				this._emit("toggle_breakpoint", {
					transition: my_transition
				});
			}
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
				this.add_transition.off("click.menu_item").remove();
				this.rename_item.off("click.menu_item").remove();
				this.remove_item.off("click.menu_item").remove();
				this.add_substate_item.off("click.menu_item").remove();
				this.toggle_concurrency_item.off("click.menu_item").remove();
				this.toggle_breakpoint_item.off("click.menu_item").remove();
				this.edit_dropdown.remove();
				delete this.edit_dropdown;
			}
			$(window).off("mousedown.expanded_mousedown");
			$(window).off("keydown.expanded_keydown");
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
			var layout = this.option("layout");
			/*
			var pts = [this.option("lws"), this.option("lwe"), this.option("rws"), this.option("rwe")];
			var padding_top = this.option("padding_top");
			var x0 = pts[0].x;
			var y0 = pts[0].y;
			var path_str = "M" + x0 + "," + padding_top + "L" + _.map(pts, function (pt) {
				return pt.x + "," + pt.y;
			}).join("L") + "V"+padding_top+"Z";
			*/
			var shape = layout.shape,
				path_str = _.map(shape, function(cmd_arr) {
					return cmd_arr[0] + _.rest(cmd_arr).join(",")
				}).join("");
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
			this.unmake_selectable();
			this.$clickable.off("contextmenu.show");
			delete this.$clickable;

			this.remove_edit_dropdown();

			this.active_fn.destroy();
			delete this.active_fn;
			if(this.edit_dropdown) {
				this.edit_dropdown.dropdown("destroy");
			}
			if(this.running_fn) {
				this.running_fn.destroy();
				delete this.running_fn;
			}

			this.label.destroy();
			delete this.label;

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
			var even = false;
			var interval_time = 500;
			this.change_color_interval = window.setInterval(_.bind(function() {
				if(even) {
					this.path.animate({
						"fill": this.option("selectable_fill")
					}, interval_time);
				} else {
					this.path.animate({
						"fill": "#888"
					}, interval_time);
				}
				even = !even;
			}, this), interval_time);
		};
		proto.unmake_selectable = function() {
			if(this.change_color_interval) {
				this.path.stop();
				window.clearInterval(this.change_color_interval);
				delete this.change_color_interval;
			}
			if(this._selectable_callback) {
				this.path.unclick(this._selectable_callback);
				delete this._selectable_callback;
			}
			var state = this.option("state");
			this.path.attr({
				fill: this.option(this.active.get() ? "active_fill" : "default_fill"),
				cursor: ""
			});
		};
	}(ist.StateView));
}(interstate, jQuery));
