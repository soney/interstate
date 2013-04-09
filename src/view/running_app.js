/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,jQuery,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._,
		origin = window.location.protocol + "//" + window.location.host;
		
	function componentToHex(c) {
		var hex = c.toString(16);
		return hex.length === 1 ? "0" + hex : hex;
	}

	function rgbToHex(r, g, b) {
		return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
	}

	/**
	 * Converts an HSL color value to RGB. Conversion formula
	 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
	 * Assumes h, s, and l are contained in the set [0, 1] and
	 * returns r, g, and b in the set [0, 255].
	 *
	 * @param   Number  h       The hue
	 * @param   Number  s       The saturation
	 * @param   Number  l       The lightness
	 * @return  Array           The RGB representation
	 */
	function hslToRgb(h, s, l) {
		var r, g, b, hue2rgb;

		if (s === 0) {
			r = g = b = l; // achromatic
		} else {
			hue2rgb = function (p, q, t) {
				if (t < 0) { t += 1; }
				if (t > 1) { t -= 1; }
				if (t < 1 / 6) { return p + (q - p) * 6 * t; }
				if (t < 1 / 2) { return q; }
				if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
				return p;
			};

			var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			var p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}

		return [Math.floor(r * 256), Math.floor(g * 256), Math.floor(b * 256)];
	}

	function randomColor(hrange, srange, lrange) {
		var h = Math.random() * (hrange[1] - hrange[0]) + hrange[0],
			s = Math.random() * (srange[1] - srange[0]) + srange[0],
			l = Math.random() * (lrange[1] - lrange[0]) + lrange[0];
		var rgb = hslToRgb(h, s, l);
		return rgbToHex.apply(window, rgb);
	}

	$.widget("red.dom_output", {
		options: {
			root: undefined,
			show_edit_button: true,
			edit_on_open: false,
			editor_url: origin + "/src/view/editor.ejs.html",
			editor_name: uid.get_prefix() + "red_editor",
			open_separate_client_window: true,
			editor_window_options: function () {
				return "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=" + window.innerWidth + ", height=" + window.innerHeight + ", left=" + window.screenX + ", top=" + (window.screenY + window.outerHeight);
			}
		},

		_create: function () {
			this._command_stack = red.create("command_stack");
			if (this.option("show_edit_button")) {
				this.button_color = randomColor([0, 1], [0.1, 0.7], [0.4, 0.6]);
				//this.button_color = "#990000";
				this.edit_button_css = {
					float: "right",
					opacity: 0.7,
					"text-decoration": "none",
					"font-variant": "small-caps",
					padding: "3px",
					"padding-top": "0px",
					position: "fixed",
					top: "0px",
					right: "0px",
					color: this.button_color,
					"background-color": "",
					"font-size": "0.95em",
					"font-family": '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
					cursor: "pointer",
					"border-bottom": ""
				};
				this.edit_hover_css = {
					opacity: 1.0,
					color: "white",
					"background-color": this.button_color,
					cursor: "pointer",
					"border-bottom": ""
				};
				this.edit_active_css = {
					opacity: 1.0,
					color: this.button_color,
					"background-color": "",
					cursor: "default",
					"border-bottom": "5px solid " + this.button_color
				};

				this.edit_button = $("<a />").text("edit")
					.css(this.edit_button_css)
					.hover(_.bind(function () {
						if (!this.edit_button.hasClass("active")) {
							this.edit_button.addClass("hover").css(this.edit_hover_css);
						}
					}, this), _.bind(function () {
						if (!this.edit_button.hasClass("active")) {
							this.edit_button.removeClass("hover").css(this.edit_button_css);
						}
					}, this))
					.on("click", _.bind(this.open_editor, this));

				var append_interval = window.setInterval(_.bind(function () {
					var parent = $(this.element).parent();
					if (parent) {
						parent.append(this.edit_button);
						window.clearInterval(append_interval);
					}
				}, this), 100);

				if (this.option("edit_on_open")) {
					this.open_editor();
				}
			}
			this._add_change_listeners();
		},

		_destroy: function () {
			if (this.edit_button) {
				this.edit_button.remove();
			}
			if (this.server_socket) {
				this.server_socket.destroy();
			}
		},

		_add_change_listeners: function () {
			var root_dict = this.option("root");
			var root_contextual_object = red.find_or_put_contextual_obj(root_dict);

			this._dom_tree_fn = cjs.liven(function () {
				var dom_attachment = root_contextual_object.get_attachment_instance("dom");
				var dom_element = dom_attachment.get_dom_obj();

				if (this.element.children().is(dom_element)) {
					this.element.children().not(dom_element).remove();
				} else {
					this.element.children().remove();
					this.element.append(dom_element);
				}
			}, {
				context: this,
				pause_while_running: true
			});
		},
		
		_remove_change_listeners: function () {
			this._dom_tree_fn.destroy();
		},

		open_editor: function () {
			if (this.editor_window) {
				this.editor_window.focus();
			} else {
				if (this.option("open_separate_client_window")) {
					this.editor_window = window.open(this.option("editor_url"), this.option("editor_name"), this.option("editor_window_options")());
				} else {
					this.editor_window = window;
				}

				var root = this.option("root");

				this.server_socket = new red.ProgramStateServer({
					root: root,
					client_window: this.editor_window
				}).on("connected", function () {
					this.edit_button.addClass("active").css(this.edit_active_css);
					this.server_socket.post({
						type: "color",
						value: this.button_color
					});
				}, this).on("disconnected", function () {
					this.cleanup_closed_editor();
				}, this).on("command", function (command) {
					if (command === "undo") {
						this._command_stack._undo();
					} else if (command === "redo") {
						this._command_stack._redo();
					} else if (command === "reset") {
						root.reset();
					} else {
						this._command_stack._do(command);
					}
				}, this);

				if (this.server_socket.is_connected()) { // It connected immediately
					this.edit_button.addClass("active").css(this.edit_active_css);
					this.server_socket.post({
						type: "color",
						value: this.button_color
					});
				}
				$(window).on("beforeunload", _.bind(this.close_editor, this));
			}
		},
		
		close_editor: function () {
			if (this.editor_window) {
				this.editor_window.close();
				this.cleanup_closed_editor();
			}
		},

		cleanup_closed_editor: function () {
			this.edit_button.removeClass("active").css(this.edit_button_css);
			delete this.editor_window;

			this.server_socket.destroy();
			delete this.server_socket;
		}
	});
}(red, jQuery));
