/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery,window,FileReader,document */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._,
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

    var platform = window.navigator.platform;
	var display;
	if(platform === "iPhone" || platform === "iPod") {
		display = "phone";
	} else if(platform === "iPad") {
		display = "tablet";
	} else {
		display = "desktop";
	}

	$.widget("interstate.dom_output", {
		options: {
			root: undefined,
			show_edit_button: true,
			edit_on_open: false,
			editor_url: "editor.html",
			editor_name: uid.get_prefix() + "ist_editor",
			open_separate_client_window: true,
			external_editor: display === "phone" || display === "tablet",
			editor_window_options: function () {
				return "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=" + window.innerWidth + ", height=" + (2*window.innerHeight/3) + ", left=" + window.screenX + ", top=" + (window.screenY + window.outerHeight);
			},
			client_id: uid.get_prefix(),
			highlight_colors: {
				hover: 'red'
			},
			immediately_create_server_socket: false
		},

		_create: function () {
			this.element.addClass("ist_runtime");
			this._command_stack = new ist.CommandStack();
			this.highlights = [];
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
					top: display === "tablet" ? "15px" : "0px",
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


				this.edit_button = $("<a />")	.text("edit")
												.css(this.edit_button_css)
												.on("mouseover.make_active", _.bind(function() {
													if (!this.edit_button.hasClass("active")) {
														this.edit_button.addClass("hover").css(this.edit_hover_css);
													}
												}, this))
												.on("mouseout.make_active", _.bind(function () {
													if (!this.edit_button.hasClass("active")) {
														this.edit_button.removeClass("hover").css(this.edit_button_css);
													}
												}, this))
												.on("mousedown.open_editor touchstart.open_editor", _.bind(this.open_editor, this));

				var append_interval = window.setInterval(_.bind(function (element, edit_button) {
					if (element.parentNode) {
						element.parentNode.appendChild(edit_button);
						window.clearInterval(append_interval);
					}
				}, window, this.element[0], this.edit_button[0]), 100);
			}

			if (this.option("edit_on_open")) {
				this.open_editor();
			}

			$(window).on("keydown.open_editor", _.bind(this.on_key_down, this));

			if(this.option("immediately_create_server_socket")) {
				this.server_socket = this._create_server_socket();
			}

			this._add_change_listeners();
			this.$window = $(window);
			this.$window.on("dragover.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														this.show_drag_over();
														return false;
													}, this))
						.on("dragout.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														this.hide_drag_over();
														return false;
													}, this))
						.on("dragenter.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														this.show_drag_over();
														return false;
													}, this))
						.on("dragleave.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														this.hide_drag_over();
													}, this))
						.on("drop.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														this.hide_drag_over();
														// fetch FileList object
														var files = event.target.files || event.dataTransfer.files;
														var file = files[0];
														var fr = new FileReader();
														fr.onload = _.bind(function() {
															var new_root = ist.destringify(fr.result);
															this.option("root", new_root);
															this.element.trigger("change_root", new_root);

															delete fr.onload;
															fr = null;
														}, this);
														fr.readAsText(file);
														return false;
													}, this));
		},

		show_drag_over: function() {
			$(document.body).addClass("drop_target");
			if(!this.hasOwnProperty("overlay")) {
				this.overlay = $("<div />")	.addClass("overlay")
											.css({
												"background-color": "#555",
												"opacity": "0.8",
												"position": "fixed",
												"left": "0px",
												"top": "0px",
												"width": "100%",
												"height": "100%",
												"pointer-events": "none",
												"border": "10px dashed #DDD",
												"box-sizing": "border-box"
											})
											.appendTo(document.body);
			}
		},

		hide_drag_over: function() {
			$(document.body).removeClass("drop_target");
			this.overlay.remove();
			delete this.overlay;
		},

		_setOption: function(key, value) {
			if(key === "root") {
				var old_root = this.option("root");
				if(old_root) {
					old_root.destroy();
				}
			}
			this._super(key, value);
			if(key === "root") {
				var to_open = false;
				if(this.editor_window) {
					to_open = true;
					this.close_editor();
				}

				this._remove_change_listeners();
				if(this.server_socket) {
					this.server_socket.destroy();
				}
				this.server_socket = this._create_server_socket();
				this._add_change_listeners();

				if(to_open) {
					this.open_editor();
				}
			}
		},


		get_server_socket: function() {
			return this.server_socket;
		},

		on_key_down: function(event) {
			if(event.keyCode === 69 && event.altKey && event.metaKey) {
				this.open_editor();
			}
		},

		_destroy: function () {
			this._super();
			delete this.highlights;
			this.$window.off("dragover.replace_program")
						.off("dragout.replace_program")
						.off("dragenter.replace_program")
						.off("dragleave.replace_program")
						.off("drop.replace_program")
						.off("keydown.open_editor")
						.off("beforeunload.close_editor");

			this._remove_change_listeners();
			this.element.removeClass("ist_runtime");
			$(window).off("keydown.open_editor");
			if (this.edit_button) {
				this.edit_button.off("mouseover.make_active")
								.off("mouseout.make_active")
								.off("click.open_editor")
								.remove();
			}
			if (this.server_socket) {
				this.server_socket.destroy();
				delete this.server_socket;
			}
			this._command_stack.destroy();
			delete this._command_stack;

			delete this.options;
		},

		_add_change_listeners: function () {
			var root_dict = this.option("root");
			var root_contextual_object = ist.find_or_put_contextual_obj(root_dict);

			var is_running = false;
			this._update_fn = cjs.liven(function() {
				//if(is_running) { debugger; }
				is_running = true;
				ist.update_current_contextual_objects(root_dict);
				is_running = false;
			}, {
			});

			this._raphael_fn = cjs.liven(function () {
				var paper_attachment = root_contextual_object.get_attachment_instance("paper");
				var dom_element = paper_attachment.get_dom_obj();
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

/*
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
			*/
		},
		
		_remove_change_listeners: function () {
			if(this._dom_tree_fn) {
				this._dom_tree_fn.destroy();
				delete this._dom_tree_fn;
			}
			if(this._raphael_fn) {
				this._raphael_fn.destroy();
				delete this._raphael_fn;
			}
			if(this._update_fn) {
				this._update_fn.destroy();
				delete this._update_fn;
			}
		},

		_create_server_socket: function() {
			var root = this.option("root");

			var server_socket = new ist.ProgramStateServer({
				root: root
			}).on("connected", function () {
				if(this.edit_button) {
					this.edit_button.addClass("active").css(this.edit_active_css);
				}
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
				} else if (command === "export") {
					this.server_socket.post({
						type: "stringified_root",
						value: ist.stringify(root)
					});
				} else if (command === "upload") {
					$.ajax({
						url: "http://interstate.from.so/gallery/upload.php",
						type: "POST",
						dataType: "text",
						data: {
							root: interstate.stringify(root),
							name: interstate._.isString(name) ? name : "(no name)"
						},
						success: _.bind(function(url_id) {
							var url = "http://interstate.from.so/gallery?id="+url_id;
							this.server_socket.post({
								type: "upload_url",
								value: url
							});
						}, this)
					});
				} else {
					this._command_stack._do(command);
				}
			}, this).on("message", function(message) {
				if(message) {
					if(message.type === "add_highlight") {
						this.add_highlight(ist.find_uid(message.cobj_id), message.highlight_type);
					} else if(message.type === "remove_highlight") {
						this.remove_highlight(ist.find_uid(message.cobj_id), message.highlight_type);
					} else if(message.type === "get_ptr") {
						var cobj_id = message.cobj_id;
						var cobj = ist.find_uid(message.cobj_id);
						if(cobj) {
							var ptr = cobj.get_pointer();
							var cobjs = [];
							for(var i = ptr.length(); i>=2; i--) {
								cobjs[i-2] = ist.find_or_put_contextual_obj(ptr.points_at(i), ptr.slice(0, i));
							}
							var summaries = ist.summarize_value_for_comm_wrapper(cobjs);
							this.server_socket.post({
								type: "cobj_links",
								cobj_id: cobj_id,
								value: summaries
							});
							/*
							console.log(summaries);
							console.log(cobjs);
							*/
						}
					} else if(message.type === "load_file") {
						var new_root = ist.destringify(message.contents);
						this.option("root", new_root);
						this.element.trigger("change_root", new_root);
					}
				}
			}, this);
			return server_socket;
		},
		open_editor: function (event) {
			event.preventDefault();
			event.stopPropagation();
			if (this.editor_window) {
				this.editor_window.focus();
			} else {
				var on_comm_mechanism_load = function(communication_mechanism) {
					this.server_socket = this.server_socket || this._create_server_socket();
					this.server_socket.set_communication_mechanism(communication_mechanism);

					if (this.server_socket.is_connected()) { // It connected immediately
						if(this.edit_button) {
							this.edit_button.addClass("active").css(this.edit_active_css);
						}
						this.server_socket.post({
							type: "color",
							value: this.button_color
						});
					}
					$(window).on("beforeunload.close_editor", _.bind(this.close_editor, this));
					this.element.trigger("editor_open");
				};


				if(this.option("external_editor")) {
					interstate.async_js("/socket.io/socket.io.js", _.bind(function() {
						var socket_wrapper = new ist.SocketCommWrapper(this.option("client_id"), true);
						var url = origin+"/e/"+encodeURIComponent(this.option("client_id"));
						var code_container = $("<div />");
						var size = display === "tablet" ? 500 : 256;
						var qrcode = new QRCode(code_container[0], {
							text: url,
							width: size,
							height: size,
							colorDark : "#000000",
							colorLight : "#ffffff",
							correctLevel : QRCode.CorrectLevel.H
						});
						var alert = $("<div />").addClass("upload_url")
												.appendTo(document.body)
												.append(code_container, $("<a />").attr({"href": url, "target": "_blank"}).text(url));
						$(window).on("touchstart.close_alert mousedown.close_alert", function(event) {
							if(!$(event.target).parents().is(alert)) {
								$(window).off("touchstart.close_alert mousedown.close_alert");
								alert.remove();
							}
						});
						on_comm_mechanism_load.call(this, socket_wrapper);
					}, this));
				} else if (this.option("open_separate_client_window")) {
					this.editor_window = window.open(this.option("editor_url")+"?client_id="+encodeURIComponent(this.option("client_id")), this.option("editor_name"), this.option("editor_window_options")());
					on_comm_mechanism_load.call(this, new ist.InterWindowCommWrapper(this.editor_window, this.option("client_id")));
				} else {
					this.editor_window = window;
					on_comm_mechanism_load.call(this, new ist.SameWindowCommWrapper(this.option("client_id"), 0));
				}
			}
		},
		
		close_editor: function () {
			if (this.editor_window) {
				this.editor_window.close();
				this.cleanup_closed_editor();
			}
		},

		cleanup_closed_editor: function () {
			if(this.edit_button) {
				this.edit_button.removeClass("active").css(this.edit_button_css);
			}
			delete this.editor_window;
		},

		add_highlight: function(cobj, highlight_type) {
			if(cobj instanceof ist.ContextualDict) {
				var len = this.highlights.length;
				var highlight;
				for(var i = 0; i < len; i++) {
					highlight = this.highlights[i];
					if(highlight.cobj === cobj && highlight.type === highlight_type) {
						return false;
					}
				}
				this.highlights.push({
					cobj: cobj,
					type: highlight_type
				});
				this.update_highlights();
				return true;
			} else {
				return false;
			}
		},

		remove_highlight: function(cobj, highlight_type) {
			var len = this.highlights.length;
			var highlight;
			var remove_elem = function(elem) {
				elem.remove();
			};
			for(var i = 0; i < len; i++) {
				highlight = this.highlights[i];
				if(highlight.cobj === cobj && highlight.type === highlight_type) {
					if(highlight.elems) {
						_.each(highlight.elems, remove_elem);
					}
					this.highlights.splice(i, 1);
					this.update_highlights();
					return true;
				}
			}
			return false;
		},

		update_highlights: function() {
			var len = this.highlights.length;
			var highlight;
			var per_instance = function(instance) {
				var shape_attachment_instance = instance.get_attachment_instance("shape");
				if(shape_attachment_instance) {
					var robj = shape_attachment_instance.get_robj();
					return robj;
				} else {
					var group_attachment_instance = instance.get_attachment_instance("group");
					if(group_attachment_instance) {
						var children = group_attachment_instance.get_children();
						return _.map(children, function(child) {
							return child.get_robj();
						});
					}
				}
			};
			var getbboxes = function(robj) {
				var bbox = robj.getBBox();
				return {bbox: bbox, robj: robj};
			};
			var get_highlight_elem = function(info) {
				var bbox = info.bbox,
					robj = info.robj;
				var elem = $("<div />")	.addClass("highlight")
										.css({
											left: bbox.x,
											top: bbox.y,
											width: bbox.width,
											height: bbox.height
										})
										.appendTo(this.element);
				if(robj.type === "circle" || robj.type === "ellipse") {
					elem.css("border-radius", Math.max(bbox.width, bbox.height)+"px");	
				}
				return elem;
			};
			var remove_elem = function(elem) {
				elem.remove();
			};
			var bboxes = [];
			for(var i = 0; i < len; i++) {
				highlight = this.highlights[i];
				var cobj = highlight.cobj;

				if(cobj.is_destroyed()) {
					this.highlights.splice(i, 1);
					i--;
					len--;
					if(highlight.elems) {
						_.each(highlight.elems, remove_elem);
					}
					continue;
				}

				var instances;
				if(cobj.is_template()) {
					instances = cobj.instances();
				} else {
					instances = [cobj];
				}
				var highlight_objs = _	.chain(instances)
										.map(per_instance)
										.flatten(true)
										.compact()
										.value();
				var bounding_boxes = _	.map(highlight_objs, getbboxes);
				highlight.elems = _.map(bounding_boxes, get_highlight_elem, this);
			}
		}
	});
}(interstate, jQuery));
