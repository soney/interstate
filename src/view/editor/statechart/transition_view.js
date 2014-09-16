/*jslint nomen: true, vars: true */
/*global Raphael,interstate,esprima,able,uid,console,jQuery,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var highlight_enabled = ist.__debug_statecharts;

	var get_arrow_paths = function (from, to, self_pointing_theta, radius, arrowLength, arrowAngleRadians) {
		var fromX = from.x,
			fromY = from.y,
			toX = to.x,
			toY = to.y;

		var xDiff = toX - fromX,
			yDiff = toY - fromY;

		var line_path_str;
		var lineStartX, lineStartY, lineEndX, lineEndY, theta, arrow_theta;

		if (Math.pow(xDiff, 2) + Math.pow(yDiff, 2) <= Math.pow(radius + arrowLength, 2)) {
			var curve_radius = 2 * radius * radius + arrowLength + 2;

			theta = self_pointing_theta * Math.PI / 180;
			arrow_theta = theta - (90 * Math.PI / 180);

			lineStartX = fromX + radius * Math.cos(theta);
			lineStartY = fromY + radius * Math.sin(theta);
			lineEndX = (fromX + (radius + arrowLength) * Math.cos(theta));
			lineEndY = (fromY - (radius + arrowLength) * Math.sin(theta));

			line_path_str = "M" + lineStartX + "," + lineStartY +
							"C" + (fromX + curve_radius * Math.cos(theta)) +
							"," + (fromY + curve_radius * Math.sin(theta)) +
							"," + (fromX + (curve_radius + arrowLength) * Math.cos(theta)) +
							"," + (fromY - (curve_radius + arrowLength) * Math.sin(theta)) +
							"," + lineEndX +
							"," + lineEndY;

			toX = (toX + radius * Math.cos(theta));
			toY = (toY - radius * Math.sin(theta));
		} else {
			theta = arrow_theta = Math.atan2(yDiff, xDiff);
			lineStartX = fromX + Math.cos(theta) * radius;
			lineStartY = fromY + Math.sin(theta) * radius;
			lineEndX = toX - Math.cos(theta) * arrowLength;
			lineEndY = toY - Math.sin(theta) * arrowLength;

			line_path_str = "M" + lineStartX + "," + lineStartY + "L" + lineEndX + "," + lineEndY;
		}

		var off_line = arrowLength * Math.tan(arrowAngleRadians);
		var arrow_path = [
			{ x: toX, y: toY},
			{ x: lineEndX + off_line * Math.cos(arrow_theta - Math.PI / 2),
				y: lineEndY + off_line * Math.sin(arrow_theta - Math.PI / 2)
				},
			{ x: lineEndX + off_line * Math.cos(arrow_theta + Math.PI / 2),
				y: lineEndY + off_line * Math.sin(arrow_theta + Math.PI / 2)
				}
		];
		var arrow_path_str = "M" + _.map(arrow_path, function (point) {
			return point.x + "," + point.y;
		}).join("L") + "Z";

		return {
			line: { path: line_path_str },
			arrow: { path: arrow_path_str },
			circle: { cx: fromX, cy: fromY, r: radius }
		};
	};

	var center = function (p1, p2) {
		return { x: (p1.x + p2.x) / 2,
					y: (p1.y + p2.y) / 2 };
	};

	ist.TransitionView = function (options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {
			transition: null,
			paper: null,
			from: {x: 0, y: 0},
			to: {x: 0, y: 0},
			color: "black",
			active_color: "green",
			text_background: "white",
			text_foreground: "black",
			error_background: "#900",
			error_foreground: "white",
			font_family: "Sourse Sans Pro",
			font_size: 14,
			padding_top: 0,
			paper_height: 9999,
			vline_color: "#CCC",
			vline_dasharray: "1,2",
		}, options);
		var paper = this.option("paper");

		this.arrow = new ist.ArrowView({
			paper: paper,
			color: this.option("color"),
			active_color: this.option("active_color"),
			transition: this.option("transition"),
			from: this.option("from"),
			to: this.option("to")
		});
		var transition = this.option("transition");

		//var event = transition.event();
		var str = "";
		/*
		if (event instanceof ist.ParsedEvent) {
			str = event.get_str();
		}
		*/
		var c = center(this.option("from"), this.option("to"));
		this.label = new ist.EditableText(paper, {x: c.x, y: c.y + 8, text: str, fill: this.option("text_background"), color: this.option("text_foreground")});
		this.label.option({
			"font-size": this.option("font_size"),
			"font-family": this.option("font_family")
		});
		this.label	.on("cancel", this.on_cancel_rename, this)
					.on("change", this.on_confirm_rename, this)
					.on("change", this.forward_event, this);
		
		transition.on("fire", this.flash, this);
		var from = this.option("from");

		if (event instanceof ist.ParsedEvent) {
			event.on("setString", function (e) {
				if(this.label) {
					var str = e.to;
					this.label.option("text", str);
				}
			}, this);
			str = event.get_str();
			this.errors_fn = cjs.liven(function () {
				var errors = event.get_errors();
				if(errors && errors.length > 0) {
					this.label.option({
						fill: this.option("error_background"),
						color: this.option("error_foreground")
					});
					var err_text = errors[0];
					$(this.label.text.node)	.attr("title", err_text)
											.tooltip("option", {
												content: err_text
											});
				} else {
					this.label.option({
						fill: this.option("text_background"),
						color: this.option("text_foreground")
					});
					$(this.label.text.node)	.attr("title", "")
											.tooltip("option", {
												tooltipClass: "error",
												content: ""
											});
				}
			}, {
				context: this,
				destroy: function() {
				}
			});
		} else {
			str = "";
		}
		this.label.option("text", str);
		this.vline = paper	.path("M0,0")
							.attr({
								stroke: this.option("vline_color"),
								"stroke-dasharray": this.option("vline_dasharray")
							});
		this.vline.appendTo(paper);
		this.$clickable = $([this.label.text.node, this.label.label_background.node].concat(this.arrow.getDOMNodes()));
		this.$clickable.on("contextmenu.cm", _.bind(this.show_menu, this));

		$(this.label.text.node).tooltip({
			tooltipClass: "error"
		});
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);
		proto._on_options_set = function (values) {
			this.arrow.option(values);
			var transition = this.option("transition");
			var paper_height = this.option("paper_height");
			//var event = transition.event();
			var from = this.option("from");
			var c = center(from, this.option("to"));
			this.label.option({
				x: c.x,
				y: c.y + 8
			});
			this.update_menu_position();
		};

		proto.toFront = function() {
			var paper = this.option("paper");
			this.arrow.toFront();
			this.vline.prependTo(paper);
			this.label.toFront();
		};

		proto.get_str = function() {
			var transition = this.option("transition");
			var event = transition.event();
			var str = "";
			if (event instanceof ist.ParsedEvent) {
				str = event.get_str();
			} else {
				str = "(start)";
			}
			return str;
		};

		proto.flash = function () {
			this.arrow.flash();
		};

		proto.show_menu = function(event) {
			if(event) {
				event.preventDefault();
				event.stopPropagation();
			}

			var paper = this.option("paper");
			var transition = this.option("transition");
			//var parentElement = paper.canvas.parentNode;
			var parentElement = paper.node.parentNode;
			this.edit_event = $("<div />").addClass("menu_item")
											.text("Change event")
											.on("click.menu_item", _.bind(this.on_edit_event_pressed, this));
			this.change_from = $("<div />")	.addClass("menu_item")
												.text("Change from")
												.on("click.menu_item", _.bind(this.on_change_from_pressed, this));
			this.change_to = $("<div />").addClass("menu_item")
											.text("Change to")
											.on("click.menu_item", _.bind(this.on_change_to_pressed, this));
			this.remove_item = $("<div />")	.addClass("menu_item")
											.text("Delete")
											.on("click.menu_item", _.bind(this.on_remove_item_pressed, this));
			this.togglebreakpoint = $("<div />").addClass("menu_item")
												.text("Add breakpoint")
												.on("click.menu_item", _.bind(this.on_toggle_breakpoint, this));
			var from = this.option("from"),
				to = this.option("to");
			var min_x = Math.min(from.x, to.x);
			var max_x = Math.max(from.x, to.x);
			var PADDING = 1;
			var HEIGHT = 10;
			var width = Math.max((max_x-min_x) - 2*PADDING, 100);
			var cx = (max_x + min_x)/2;
			var x = cx - width/2;
			var y = from.y;


			this.edit_dropdown = $("<div />")	.addClass("transition dropdown")
												.appendTo(parentElement)
												.css({
													position: "absolute",
													left: x + "px",
													top: y + "px",
													width: width + "px"
												});
			var items;
			//if(transition.from() instanceof ist.StartState) {
				//this.edit_dropdown.append(this.change_to);
			//} else {
				//this.edit_dropdown.append(this.edit_event, this.change_from, this.change_to, this.remove_item, this.togglebreakpoint);
			//}
			$(window).on("mousedown.close_menu", _.bind(this.on_window_click_while_expanded, this));
			$(window).on("keydown.close_menu", _.bind(this.on_window_keydown_while_expanded, this));
		};

		proto.on_edit_event_pressed = function() {
			this.remove_edit_dropdown();
			this.begin_rename();
		};
		proto.emit_set_from = function(from_state) {
			this._emit("set_from", {
				transition: this.option("transition"),
				from: from_state
			});
		};
		proto.on_change_from_pressed = function() {
			this.remove_edit_dropdown();
			var root = this.option("transition").root();
			var selectable_substates = root.flatten_substates(); // the first element is the major statechart itself
			selectable_substates = selectable_substates.splice(0, selectable_substates.length-1);
			this._emit("awaiting_state_selection", {
				states: selectable_substates,
				on_select: _.bind(this.emit_set_from, this)
			});
		};
		proto.emit_set_to = function(to_state) {
			this._emit("set_to", {
				transition: this.option("transition"),
				to: to_state
			});
		};
		proto.on_change_to_pressed = function() {
			this.remove_edit_dropdown();
			var root = this.option("transition").root();
			var selectable_substates = root.flatten_substates(); // the first element is the major statechart itself
			selectable_substates = selectable_substates.splice(0, selectable_substates.length-1);
			this._emit("awaiting_state_selection", {
				states: selectable_substates,
				on_select: _.bind(this.emit_set_to, this)
			});
		};
		proto.on_remove_item_pressed = function() {
			this.remove_edit_dropdown();
			this._emit("remove_transition", {
				transition: this.option("transition")
			});
		};
		proto.on_toggle_breakpoint = function() {
			this.remove_edit_dropdown();
			var my_transition = this.option("transition");
			this._has_breakpoint = true;

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
				var from = this.option("from"),
					to = this.option("to");
				var min_x = Math.min(from.x, to.x);
				var max_x = Math.max(from.x, to.x);
				var PADDING = 1;
				var HEIGHT = 10;
				var width = Math.max((max_x-min_x) - 2*PADDING, 100);
				var cx = (max_x + min_x)/2;
				var x = cx - width/2;
				var y = from.y;

				this.edit_dropdown.css({
										left: x + "px",
										top: y + "px",
										width: width + "px"
									});
			}
		};
		proto.begin_rename = function() {
			this.label.edit();
		};

		proto.on_cancel_rename = function(event) {
			this.end_rename();
		};

		proto.on_confirm_rename = function(event) {
			var value = event.value;
			this.end_rename();
			this._emit("set_str", {
				str: value,
				transition: this.option("transition")
			});
		};

		proto.end_rename = function() { };

		proto.remove_edit_dropdown = function() {
			$(window).off("mousedown.close_menu");
			$(window).off("keydown.close_menu");
			if(this.edit_dropdown) {
				this.edit_event.off("click.menu_item").remove();
				this.change_from.off("click.menu_item").remove();
				this.change_to.off("click.menu_item").remove();
				this.remove_item.off("click.menu_item").remove();
				this.togglebreakpoint.off("click.menu_item").remove();
				this.edit_dropdown.remove();
				delete this.edit_dropdown;
			}
		};

		proto.remove = function () {
			this.arrow.remove();
			this.vline.remove();
			this.label.remove();
			if(this.edit_dropdown) {
				this.edit_dropdown.remove();
				delete this.edit_dropdown;
			}
		};

		proto.destroy = function () {
			this.arrow.destroy();
			this.$clickable.off("contextmenu.cm");
			delete this.$clickable;
			this.label	.off("cancel", this.on_cancel_rename, this)
						.off("change", this.on_confirm_rename, this);
			this.label.destroy();
			delete this.label;

			var transition = this.option("transition");
			if(!transition.destroyed) {
				transition.off("fire", this.flash, this);
			}
			if(this.edit_dropdown) {
				this.edit_dropdown.dropdown("destroy");
			}
			if(this.enabled_fn) {
				this.enabled_fn.destroy();
			}

			able.destroy_this_listenable(this);
			able.destroy_this_optionable(this);
		};
	}(ist.TransitionView));

	ist.ArrowView = function (options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {
			paper: null,
			from: {x: 0, y: 0},
			to: {x: 0, y: 0},
			arrowLength: 8,
			radius: 1,
			arrowAngle: 20,
			self_pointing_theta: 40,
			color: "black",
			active_color: "green",
			enabled_dasharray: "",
			disabled_dasharray: ". "
		}, options);
		var paper = this.option("paper");
		var paths = this.get_paths();
		this.line_path = paper.path(paths.line.path);
		this.line_path.attr({
			stroke: this.option("color")
		});
		this.arrow_path = paper.path(paths.arrow.path);
		this.arrow_path.attr({
			fill: this.option("color"),
			stroke: "none"
		});
		this.circle = paper.circle(paths.circle.cx, paths.circle.cy, paths.circle.r);
		this.circle.attr({
			fill: this.option("color"),
			stroke: "none"
		});

		if(highlight_enabled) {
			var transition = this.option("transition");
			var enabled = transition.get_$("isEnabled");
			this.enabled_fn = cjs.liven(function () {
				if (enabled.get()) {
					if (this.line_path) {
						this.line_path.attr("stroke-dasharray", this.option("enabled_dasharray"));
					}
				} else {
					if (this.line_path) {
						this.line_path.attr("stroke-dasharray", this.option("disabled_dasharray"));
					}
				}
			}, {
				context: this
			});
		}
	};
	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);

		proto.getDOMNodes = function() {
			return $([this.line_path.node, this.arrow_path.node, this.circle.node]);
		};

		proto.get_paths = function () {
			var from = this.option("from"),
				to = this.option("to"),
				self_pointing_theta = this.option("self_pointing_theta"),
				radius = this.option("radius"),
				arrowLength = this.option("arrowLength"),
				arrowAngleRadians = this.option("arrowAngle") * Math.PI / 180;
			
			return get_arrow_paths(from, to, self_pointing_theta, radius, arrowLength, arrowAngleRadians);
		};

		proto._on_options_set = function (values) {
			var paths = this.get_paths();
			this.line_path.attr("path", paths.line.path);
			this.arrow_path.attr("path", paths.arrow.path);
			var from = this.option("from");
			this.circle.attr({
				cx: paths.circle.cx,
				cy: paths.circle.cy,
				r: paths.circle.r
			});
		};
		proto.toFront = function() {
			var paper = this.option("paper");
			this.line_path.prependTo(paper);
			this.circle.prependTo(paper);
			this.arrow_path.prependTo(paper);
		};
		var anim_time = 400;
		proto.flash = function () {
			var paper = this.option("paper");
			var this_option_color = this.option("color");
			var this_option_active_color = this.option("active_color");
			var line_elem = this.line_path;
			var arrow = this.arrow_path;
			var len = line_elem.getTotalLength();

			this.circle.attr({
				r: this.option("radius") * 4,
				fill: this_option_active_color
			});
			this.circle.animate({
				fill: this_option_color,
				r: this.option("radius")
			}, anim_time);

			var the_flash = paper.path(line_elem.getSubpath(0, 0));
			the_flash.attr({
				stroke: this_option_active_color,
				"stroke-width": 3,
				guide: line_elem,
				along: [0, 0]
			});

			var flash_1_to_0_anim = Raphael.animation({
												path: line_elem.getSubpath(4 * len / 4.1, len)
											}, anim_time/2, "ease-out", function() {
												the_flash.remove();
											});
			var reset_arrow_color_anim = Raphael.animation({
												fill: this_option_color
											}, anim_time/2, "ease_out");

			var flash_0_to_1_anim = Raphael.animation({
												path: line_elem.getSubpath(0, len)
											}, anim_time/2, "ease-in", function() {
												if(paper.height === null) { // we were deleted
													return;
												} else if(arrow[0] === null) {
													the_flash.remove();
													return;
												}
												arrow.attr({"fill": this_option_active_color});
												the_flash.animate(flash_1_to_0_anim);
												arrow.animate(reset_arrow_color_anim);
											});
			the_flash.animate(flash_0_to_1_anim);
		};
		proto.remove = function () {
			this.circle.remove();
			this.line_path.remove();
			this.arrow_path.remove();
		};

		proto.destroy = function () {
			if(this.enabled_fn) {
				this.enabled_fn.destroy();
			}

			able.destroy_this_listenable(this);
			able.destroy_this_optionable(this);
		};
	}(ist.ArrowView));
}(interstate, jQuery));
