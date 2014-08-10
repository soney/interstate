/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery,window,FileReader,document */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._,
		origin = window.location.protocol + "//" + window.location.host;

    var platform = window.navigator.platform;
	var display;
	if(platform === "iPhone" || platform === "iPod") {
		display = "phone";
	} else if(platform === "iPad") {
		display = "tablet";
	} else {
		display = "desktop";
	}

	function is_touch_device() {
		return !!('ontouchstart' in window);
	}

/*	var run_edit_template = cjs.createTemplate(
		"{{#fsm run_state}}" +
			"{{#state edit}}" +
				"<a class='edit'>edit</span>" +
			"{{#state run}}" +
				"<a class='run'>run</span>" +				
		"{{/fsm}}"
	);
*/

	$.widget("interstate.dom_output", {
		options: {
			root: undefined,
			show_edit_button: true,
			edit_on_open: false,
			editor_url: "editor.html",
			editor_name: uid.get_prefix() + "ist_editor",
			open_separate_client_window: true,
			external_editor: display === "phone" || display === "tablet",
			auto_open_external_editor: true,
			editor_window_options: function () {
				return "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=" + window.innerWidth + ", height=" + (2*window.innerHeight/3) + ", left=" + window.screenX + ", top=" + (window.screenY + window.outerHeight);
			},
			client_id: uid.get_prefix(),
			immediately_create_server_socket: false,
			touchscreen_layer: is_touch_device()
		},

		_create: function () {
			this.element.addClass("ist_runtime");
			this._command_stack = new ist.CommandStack();
			this.$dirty_program = cjs(false);
			this.$highlighting_objects = cjs([]);
			this.$inspecting_hover_object = cjs(false);
			this.$breakpoints = cjs({});

			if(!this.option("root")) {
				var root = ist.load();
				if(!root) {
					root = ist.get_default_root();
					ist.saveAndSetCurrent(root);
				}
				this.option("root", root);
			}
			if (this.option("show_edit_button")) {
				this.button_color = "#990000";
				this.edit_button_css = {
					float: "right",
					"text-decoration": "none",
					"font-variant": "small-caps",
					//"padding-top": "0px",
					position: "fixed",
					top: (display === "tablet" || display === "phone") ? "15px" : "0px",
					right: "0px",
					color: this.button_color,
					"background-color": "",
					"font-size": "1.2em",
					"font-family": '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
					cursor: "pointer",
					padding: "5px",
					"border-bottom": ""
				};
				this.running_button_css = {
					float: "right",
					position: "fixed",
					top: "20px",
					"padding-left": "5px",
					right: "20px",
					"font-family": '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
					color: this.button_color,
					"-webkit-touch-callout": "none",
					"-webkit-user-select": "none",
					"-khtml-user-select": "none",
					"-moz-user-select": "none",
					"-ms-user-select": "none",
					"user-select": "none"							
				};
				this.editing_button_css = {					
					position: "fixed",
					top: "40px"
				};
				this.editing_button_open_css = {
					top: "60px"
				};
				this.hidden_button_css = {
					display: "none"
				};
				this.shown_button_css = {
					display: "block"
				};
				this.run_edit_active_css = {
					"font-weight": "bold"
				};
				this.run_edit_inactive_css = {
					"font-weight": "normal"
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
				this.palette_css = {
					"float":"right",					
					"position": "fixed",
					top: "65px",
					right:"13px",
					"padding-left": "0",
					"margin": "0",
					display: "none",
					"font-size": "0.95em",
					"list-style-type": "none",
					"font-family": '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
					color: this.button_color				
				};
				this.palette_css_show = {
					display: "block"
				};
				this.inspect_css = {
					display: "block",
					top: "42px",
					right: "25px"
				};
				this.code_view_css = {
					right: "25px"
				};
				this.inspect_css_show = {
					display: "none"
				};
				this.undo_redo_css = {
					float: "right",
					position: "fixed",
					right: "0px",
					padding: "5px",
					top: "0",
					display: "none"
				};

				var that = this;

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

				var append_interval = window.setInterval(_.bind(function() {
					this.element.append(this.edit_button);
				}, this));
			}

			if(this.option("touchscreen_layer")) {
				this.element.touchscreen_layer({
				});
			}

			if (this.option("edit_on_open")) {
				this.open_editor();
			}

			$(window)	.on("keydown.open_editor", _.bind(this.on_key_down, this))
						.on("beforeunload.do_save onunload.do_save unload.do_save pagehide.do_save", _.bind(function() {
							this._save();
							this.element.dom_output("destroy");
						}, this));

			if(this.option("immediately_create_server_socket")) {
				this.server_socket = this._create_server_socket();
			}

			this._add_change_listeners();
			this._add_highlight_listeners();
		},


		_setOption: function(key, value) {
			if(key === "root") {
				this._remove_change_listeners();
				var old_root = this.option("root");
				if(old_root) {
					var old_root_contextual_object = ist.find_or_put_contextual_obj(old_root);
					if(old_root_contextual_object) {
						//old_root_contextual_object.destroy();
					}
					//old_root.destroy();
				}
			}
			this._super(key, value);
			if(key === "root") {
				this._command_stack.clear();
				if(this.server_socket) {
					this.server_socket.set_root(this.option("root"));
				}
				if(value) {
					this._add_change_listeners();
				}
				this.$dirty_program.set(false);
			}
		},

		import_component: function(name, obj) {
			var root = this.option("root");
			var orig_name = name;
			var i = 1;
			while(root._has_direct_prop(name)) {
				name = orig_name+"_"+i;
				i++;
			}
			root.set(name, obj);
		},

		get_server_socket: function() {
			return this.server_socket;
		},

		on_key_down: function(event) {
			if(event.altKey && event.metaKey) {
				if(event.keyCode === 69) { // e
					this.open_editor();
				} else if(event.keyCode === 84) { // i
					this.begin_inspect();
					event.preventDefault();
					event.stopPropagation();
				}
			}
		},

		_destroy: function () {
			if(this.option("touchscreen_layer")) {
				this.element.touchscreen_layer("destroy");
			}
			this._super();
			this.close_editor();
			$(window).off(".do_save");
			this._remove_highlight_listeners();

			this.$highlighting_objects.destroy(true);
			delete this.$highlighting_objects;
			this.$inspecting_hover_object.destroy(true);
			delete this.$inspecting_hover_object;

			this.$dirty_program.destroy(true);
			delete this.$dirty_program;
			this.$breakpoints.destroy(true);
			delete this.$breakpoints;

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

		_add_highlight_listeners: function () {
			var old_highlighting_elements = [],
				svg_followers = [];
			this._highlight_fn = cjs.liven(function() {
				var highlighting_objects = this.$highlighting_objects.toArray(),
					highlighting_elements = _	.chain(highlighting_objects)
												.map(function(cobj) {
													if(cobj.is_destroyed()) {
														return false;
													} else if(cobj.is_template()) {
														return cobj.instances();
													} else {
														return cobj;
													}
												})
												.compact()
												.flatten()
												.map(function(obj) {
													if(!obj._destroyed) {
														return obj.get_dom_obj();
													}
												})
												//.compact()
												.flatten()
												.value()
												.concat(this.$inspecting_hover_object.get());
				highlighting_elements = _.compact(highlighting_elements);
				var diff = _.diff(old_highlighting_elements, highlighting_elements);

				_.each(diff.added, function(info) {
					var dom_node = info.item;
					$(dom_node).addClass("highlight");
					if(dom_node instanceof SVGElement) {
						var bounding_rect = dom_node.getBoundingClientRect(),
							tagName = dom_node.tagName,
							follower = $("<div />").appendTo(document.body)
													.addClass("highlight svg_follow")
													.css({
														left: bounding_rect.left+"px",
														top: bounding_rect.top+"px",
														width: bounding_rect.width+"px",
														height: bounding_rect.height+"px",
														borderRadius: tagName.toUpperCase() === "CIRCLE" ? bounding_rect.width/2+"px" : "0px"
													});
						svg_followers.push({
							following: dom_node,
							follower: follower
						});
					}
				});
				_.each(diff.removed, function(info) {
					var dom_node = info.from_item;
					$(dom_node).removeClass("highlight");
					if(dom_node instanceof SVGElement) {
						_.each(svg_followers, function(info, index) {
							if(info.following === dom_node) {
								info.follower.remove();
								svg_followers.splice(index, 1);
							}
						});
					}
				});

				old_highlighting_elements = highlighting_elements;
			}, {
				context: this,
				on_destroy: function() {
					_.each(old_highlighting_elements, function(dom_node) {
						$(dom_node).removeClass("highlight");
						if(dom_node instanceof SVGElement) {
							_.each(svg_followers, function(info, index) {
								if(info.following === dom_node) {
									info.follower.remove();
									svg_followers.splice(index, 1);
								}
							});
						}
					});
				},
				run_on_start: false
			});

			this._highlight_fn.run();
		},

		_remove_highlight_listeners: function () {
			if(this._highlight_fn) {
				this._highlight_fn.destroy();
			}
		},

		_add_change_listeners: function () {
			var root_dict = this.option("root");
			var root_contextual_object = ist.find_or_put_contextual_obj(root_dict);

			if(!ist.__empty_files) {
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
					pause_while_running: true,
					on_destroy: function() {
						this.element.children().remove();
					}
				});
			}
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
				root: root,
				command_stack: this._command_stack,
				dirty_program: this.$dirty_program
			}).on("connected", function () {
				if(this.edit_button) {
					this.edit_button.addClass("active").css(this.edit_active_css);
				}
			}, this).on("disconnected", function () {
				this.cleanup_closed_editor();
			}, this).on("command", function (command) {
				if (command === "undo") {
					this._command_stack._undo();
					this.$dirty_program.set(true);
				} else if (command === "redo") {
					this._command_stack._redo();
					this.$dirty_program.set(true);
				} else {
					this._command_stack._do(command);
					this.$dirty_program.set(true);
				}
			}, this).on("load_program", function (name) {
				var new_root = ist.load(name);
				this.option("root", new_root);
			}, this).on("load_file", function (message) {
				this.load_str(message.contents, message.name, message.also_load);
			}, this).on("download_program", function (name, type) {
				if(type === "component") {
					this.server_socket.post({
						type: "stringified_obj",
						value: ist.loadString(name, type),
						name: name
					});
				} else {
					this.server_socket.post({
						type: "stringified_root",
						value: ist.loadString(name, type),
						name: name
					});
				}
			}, this).on("save_component", function (event) {
				var cobj_id = event.cobj_id,
					cobj = ist.find_uid(cobj_id);
				if(cobj) {
					var obj = cobj.get_object();
					ist.save(obj, cobj.get_name(), "component");
				}
			}, this).on("save_curr", function (event) {
				this._save();
			}, this).on("save_curr_as", function (event) {
				this._save();
				ist.saveAndSetCurrent(this.option("root"), event.name);
			}, this).on("create_program", function (event) {
				this._save();
				var newroot = ist.get_default_root();
				ist.saveAndSetCurrent(newroot, event.name);
				this.option("root", newroot);
			}, this).on("copy_component", function (event) {
				var target_obj_id = event.target_obj_id;
				var target_obj = ist.find_uid(target_obj_id);
				//var tobj = target_cobj.get_object();
				var component = ist.load(event.name, "component");
				target_obj.set(event.name, component);
			}, this).on("rename_program", function(event) {
				var from_name = event.from_name,
					to_name = event.to_name,
					storage_type = event.storage_type;

				this._save();
				ist.rename(from_name, to_name, storage_type);
			}, this).on("add_highlight", function(event) {
				var cobj_id = event.cobj_id,
					cobj = ist.find_uid(cobj_id);
				if(cobj) {
					this.$highlighting_objects.push(cobj);
				}
			}, this).on("remove_highlight", function(event) {
				var cobj_id = event.cobj_id,
					cobj = ist.find_uid(cobj_id);
				if(cobj) {
					var index = this.$highlighting_objects.indexOf(cobj);
					if(index >= 0) {
						this.$highlighting_objects.splice(index, 1);
					}
				}
			}, this)
			;
			return server_socket;
		},
		load_str: function(fr_result, filename, also_load) {
			var result = fr_result.replace(/^COMPONENT:/, ""),
				is_component = result.length !== fr_result.length,
				obj,
				name = filename.replace(/\.\w*$/, "");

			if(ist.__debug) {
				obj = ist.destringify(result);
			} else {
				try {
					obj = ist.destringify(result);
				} catch(e) {
					console.error("Error loading " + filename);
					console.error(e);
					return;
				}
			}

			if(is_component) {
				//this.import_component(name, obj);
				interstate.save(obj, name, "component");
			} else {
				this._save();
				if(also_load) {
					ist.saveAndSetCurrent(obj, name);
					this.option("root", obj);
					this.element.trigger("change_root", obj);
				} else {
					ist.save(obj, name);
				}
			}
		},
		open_editor: function (event, cobj) {
			if(this.editing_button) {
				this.editing_button.css(this.shown_button_css);
			}
			if(this.running_button) {
				this.running_button.css(this.shown_button_css);
			}
			if(this.undo_redo_buttons) {
				this.undo_redo_buttons.css(this.shown_button_css);
			}
			if(event) {
				event.preventDefault();
				event.stopPropagation();
			}
			if (this.editor_window) {
				this.editor_window.focus();
			} else {
				var on_comm_mechanism_load = function(communication_mechanism) {
					this.server_socket = this.server_socket || this._create_server_socket(cobj);
					this.server_socket.set_communication_mechanism(communication_mechanism);

					if (this.server_socket.is_connected()) { // It connected immediately
						if(this.edit_button) {
							this.edit_button.addClass("active").css(this.edit_active_css);
						}
					}
					this.element.trigger("editor_open");
				};

				if(this.option("external_editor")) {
					interstate.async_js("/socket.io/socket.io.js", _.bind(function() {
						var socket_wrapper = new ist.SocketCommWrapper(this.option("client_id"), true);
						if(this.option("auto_open_external_editor")) {
							$.ajax({
								url: "auto_open_editor",
								data: {
									client_id: this.option("client_id")
								},
								type: "GET"
							});
						} else {
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
						}
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

		_save: function() {
			if(this.$dirty_program.get()) {
				this.$dirty_program.set(false);
				ist.save(this.option("root"));
			}
		},

		cleanup_closed_editor: function () {
			this.$highlighting_objects.setValue([]);
			if(this.edit_button) {
				this.edit_button.removeClass("active").css(this.edit_button_css);
			}
			delete this.editor_window;
		},
		begin_inspect: function () {
			if(this._inspecting) {
				this.cancel_inspect();
			} else {
				this._inspecting = true;
				this._inspecting_target = false;

				this._on_mover = _.bind(function(mo_event) {
					var target = this._inspecting_target = mo_event.target;
					this.$inspecting_hover_object.set(target);
				}, this);
				this._on_mout = _.bind(function(mo_event) {
					if(mo_event.target === this._inspecting_target) {
						this.$inspecting_hover_object.set(false);
						this._inspecting_target = false;
					}
				}, this);
				this._on_click = _.bind(function(c_event) {
					var target = c_event.target,
						cobj = target.__ist_contextual_object__;
					this.inspect_cobj(cobj);
				}, this);

				$(this.element).get(0).addEventListener("mouseover", this._on_mover, true);
				$(this.element).get(0).addEventListener("mouseout", this._on_mout, true);
				$(this.element).get(0).addEventListener("click", this._on_click, true);
				$(window).on("keydown.inspector", _.bind(function(kd_event) {
					if(kd_event.keyCode === 27) { // esc
						this.cancel_inspect();
					} else if(kd_event.keyCode === 13) { // enter
						if(this._inspecting_target) {
							var cobj = this._inspecting_target.__ist_contextual_object__;

							this.inspect_cobj(cobj);
						}
					}
				}, this));
			}

		},
		cancel_inspect: function() {
			if(this._inspecting) {
				this._inspecting = false;
				this._inspecting_target = false;
				this.$inspecting_hover_object.set(false);

				$(this.element).get(0).removeEventListener("mouseover", this._on_mover, true);
				$(this.element).get(0).removeEventListener("mouseout", this._on_mout, true);
				$(this.element).get(0).removeEventListener("click", this._on_click, true);
				$(window).off("keydown.inspector");
			}
		},
		inspect_cobj: function(cobj) {
			if (this.editor_window) {
				this.server_socket.post({
					type: "inspect",
					cobj_id: cobj.id()
				});
				this.editor_window.focus();
			} else {
				this.open_editor();
			}
			this.cancel_inspect();
		}
	});
}(interstate, jQuery));
