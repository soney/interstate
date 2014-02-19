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
			auto_open_external_editor: false,
			editor_window_options: function () {
				return "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=" + window.innerWidth + ", height=" + (2*window.innerHeight/3) + ", left=" + window.screenX + ", top=" + (window.screenY + window.outerHeight);
			},
			client_id: uid.get_prefix(),
			immediately_create_server_socket: false
		},

		_create: function () {
			this.element.addClass("ist_runtime");
			this._command_stack = new ist.CommandStack();
			this.$dirty_program = cjs(false);

			if(!this.option("root")) {
				var root = ist.load();
				if(!root) {
					root = ist.get_default_root();
					ist.saveAndSetCurrent(root);
				}
				this.option("root", root);
			}
			this.highlights = [];
			if (this.option("show_edit_button")) {
				this.button_color = "#990000";
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
				this.running_button_css = {
					float: "left",
					position: "fixed",
					top: "0",
					"padding-left": "5px",
					"font-family": '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
					"font-variant": "small-caps",
					color: this.button_color,
					"-webkit-touch-callout": "none",
					"-webkit-user-select": "none",
					"-khtml-user-select": "none",
					"-moz-user-select": "none",
					"-ms-user-select": "none",
					"user-select": "none"							
				};
				this.editing_button_css = {
					left: "60px"
				};
				this.run_edit_active_css = {
					"font-weight": "bold",
					"border-bottom-width": "5px",
					"border-bottom-style": "solid",
					"border-bottom-color": "rgb(153, 0, 0)"
				};
				this.run_edit_inactive_css = {
					"font-weight": "normal",
					"border": "none"
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
				},
				this.palette_css = {
					position: "absolute",
					top: "20px",
					"padding-left": "0",
					display: "block"
				}, 
				this.palette_css_hidden = {
					display: "none"
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

				var that = this;
				
				this.running_button = $("<a />").text("running")
												.css(this.running_button_css);
				this.editing_button = $("<a />").text("editing")
												.css(this.running_button_css)
												.css(this.editing_button_css)
												.css(this.run_edit_active_css);
				this.palette = $("<ul />")		.append("<button class='circle'>circle</button>")
												.append("<button class='rectangle'>rectangle</button>")
												.append("<button class='ellipse'>ellipse</button>")
												.css(this.palette_css)
												.on('click', function(e){
													if (e.target.className === 'circle') {
														that.create_new_object('circle');
													}
													else if (e.target.className === 'rectangle') {
														that.create_new_object('rect');
													}
													else if (e.target.className === 'ellipse') {
														that.create_new_object('ellipse');
													}		
													else if (e.target.className === 'text') {
														//that.create_new_object('text');
													}																										
												});


				this.run_state = cjs.fsm('run', 'edit')
												.addTransition('run', 'edit', cjs.on('click', this.running_button))
												.addTransition('edit', 'run', cjs.on('click', this.editing_button))
												.on('run->edit', function(){
													$("body").on("click.doSetProp", _.bind(function(e) {
														var command = new ist.SetPropCommand({
															name: 'something', 
															value: e.clientX, 
															parent: that.option('root')
														});
													}));
													this.running_button.css(this.run_edit_active_css);
													this.editing_button.css(this.run_edit_inactive_css);
													this.palette.css(this.palette_css_hidden);																									
												}, this)
												.on('edit->run', function() {
													$("body").off("click.doSetProp");
													this.editing_button.css(this.run_edit_active_css);
													this.running_button.css(this.run_edit_inactive_css);
													this.palette.css(this.palette_css);													
												}, this);

				var append_interval = window.setInterval(_.bind(function (element, edit_button, running_button, editing_button, palette) {
					if (element.parentNode) {
						element.parentNode.appendChild(edit_button);
						element.parentNode.appendChild(running_button);
						element.parentNode.appendChild(editing_button);
						element.parentNode.appendChild(palette);						
						window.clearInterval(append_interval);
					}
				}, window, this.element[0], this.edit_button[0], this.running_button[0], this.editing_button[0], this.palette[0]), 100);


			}

		/*	var run_edit = run_edit_template({
					run_state: this.run_state
				}, this.element);*/

			if (this.option("edit_on_open")) {
				this.open_editor();
			}

			$(window)	.on("keydown.open_editor", _.bind(this.on_key_down, this))
						.on("beforeunload onunload unload pagehide", _.bind(this._save, this));

			if(this.option("immediately_create_server_socket")) {
				this.server_socket = this._create_server_socket();
			}

			this._add_change_listeners();
		},

		create_new_object: function(object) {
			var stateful_obj = new ist.StatefulObj(undefined, true),
			protos_stateful_prop = new ist.StatefulProp({can_inherit: false,
				statechart_parent: stateful_obj});
			stateful_obj.do_initialize({
				direct_protos: protos_stateful_prop
			});

			var statechart = stateful_obj.get_own_statechart(),
			start_state = statechart.get_start_state(),
			protos_cell = new ist.Cell({str: "shape."+object, ignore_inherited_in_first_dict: true});

			protos_stateful_prop.set(start_state, protos_cell);

			var sketch = this.option("root"),
			screen = sketch._get_direct_prop('screen'),
			propCommand = new ist.SetPropCommand({parent: screen, value: stateful_obj});
			var circle_context = ist.find_or_put_contextual_obj(stateful_obj);														
			this._command_stack._do(propCommand);
			/*var shape_attachment_instance = circle_context.get_attachment_instance("shape");
			if(shape_attachment_instance) {
				var dom_element = shape_attachment_instance.get_dom_obj();
			}*/
			this._add_event_listeners(stateful_obj, object);																	
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
				this._remove_change_listeners();
				var old_root = this.option("root");
				if(old_root) {
					old_root.destroy();
				}
			}
			this._super(key, value);
			if(key === "root") {
				this._command_stack.clear();
				if(this.server_socket) {
					this.server_socket.set_root(this.option("root"));
				}
				this._add_change_listeners();
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
			if(event.keyCode === 69 && event.altKey && event.metaKey) {
				this.open_editor();
			}
		},

		_destroy: function () {
			this._super();

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

			if(!this._update_fn) {
				this._update_fn = cjs.liven(function() {
					ist.update_current_contextual_objects(root_dict);
				}, {
					pause_while_running: true
				});
			}

			if(!ist.__empty_files) {
			/*
				if(!this._raphael_fn) {
					this._raphael_fn = cjs.liven(function () {
						var paper_attachment = root_contextual_object.get_attachment_instance("paper");
						var dom_element = paper_attachment.get_dom_obj();

						if(display === "phone") {
							$("svg", dom_element).css("background-color", "black");
						} else if(display === "tablet") {
							$("svg", dom_element).css("background-color", "black");
						} else {
							$("svg", dom_element).css("background-color", "white");
						}

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
				}
				*/
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

		_add_event_listeners: function(element, obj) {
	      	var touchedEl,dragData=null;
	      	var objectX, objectY = 0;
	      	var nameX, nameY = "";
	      	var that = this;
			$(obj).on("mousedown", function(ev) {
				touchedEl = this;
		        if(!dragData) {
		          ev=ev||event;
		          if (obj === 'rect' || obj === 'text') {
		          	console.log(dragData, ev.clientX, ev.clientY,touchedEl.x);
		          	dragData={
			            x: ev.clientX-touchedEl.x.baseVal.value,
			            y: ev.clientY-touchedEl.y.baseVal.value
		          	}
		          	nameX = "x";
		          	nameY = "y";
		          }
      			  else if (obj === 'ellipse' || obj === 'circle') {
			        dragData={
						x: ev.clientX-touchedEl.cx.baseVal.value,
			            y: ev.clientY-touchedEl.cy.baseVal.value
			        }
			          nameX = "cx";
			          nameY = "cy";
		          }					                    	
		        };
			});

			$('body').on("mouseup", function(ev) {				
		        if(dragData) {
		          ev=ev||event;
		          objectX=ev.clientX-dragData.x;
		          objectY=ev.clientY-dragData.y;
				  var x_stateful_prop = new ist.StatefulProp({statechart_parent: element});
				  var y_stateful_prop = new ist.StatefulProp({statechart_parent: element});

				  var stringX = objectX + '';
				  var stringY = objectY + '';				

				  var x_cell  = new ist.Cell({str: stringX});
				  var y_cell  = new ist.Cell({str: stringY});		

				  var statechart = element.get_own_statechart(),
					  start_state = statechart.get_start_state();
				  
				  x_stateful_prop.set(start_state, x_cell);
				  y_stateful_prop.set(start_state, y_cell);	

				  var sketch = that.option("root"),
					  screen = sketch._get_direct_prop('screen'),
					  propCommandX = new ist.SetPropCommand({
							parent: element,
							name: nameX,
							value: stringX
					  }),
					  propCommandY = new ist.SetPropCommand({
							parent: element,
							name: nameY,
							value: stringY
					  });
				 var combined_command = new ist.CombinedCommand({
				 	commands: [propCommandX, propCommandY]
				 });

				  that._command_stack._do(combined_command);

				  element.set_prop(nameX, x_stateful_prop);				  
				  element.set_prop(nameY, y_stateful_prop);		

		          dragData=null;
		        }
			});			

			$('body').on("mousemove", function(ev) {	
		        if(dragData) {
		          ev=ev||event;							          
		          objectX=ev.clientX-dragData.x;
				  objectY=ev.clientY-dragData.y;
				  var x_stateful_prop = new ist.StatefulProp({statechart_parent: element});
				  var y_stateful_prop = new ist.StatefulProp({statechart_parent: element});

				  var stringX = objectX + '';
				  var stringY = objectY + '';				

				  var x_cell  = new ist.Cell({str: stringX});
				  var y_cell  = new ist.Cell({str: stringY});		

				  var statechart = element.get_own_statechart(),
					  start_state = statechart.get_start_state();
				  
				  x_stateful_prop.set(start_state, x_cell);
				  y_stateful_prop.set(start_state, y_cell);	

				  element.set_prop(nameX, x_stateful_prop);				  
				  element.set_prop(nameY, y_stateful_prop);		


		        }
			});						
			console.log(screen);
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
					/*
				} else if (command === "reset") {
					root.reset();
					this.$dirty_program.set(true);
				} else if (command === "export") {
					this.server_socket.post({
						type: "stringified_root",
						value: ist.stringify(root)
					});
				} else if (command === "store") {
					interstate.save(this.option("root"));
					*/
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
			}, this)
			;
			return server_socket;
		},
		load_str: function(fr_result, filename, also_load) {
			var result = fr_result.replace(/^COMPONENT:/, ""),
				is_component = result.length !== fr_result.length,
				obj,
				name = filename.replace(/\.\w*$/, "");

			try {
				obj = ist.destringify(result);
			} catch(e) {
				console.error("Error loading " + filename);
				console.error(e);
				return;
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
		open_editor: function (event) {
			if(event) {
				event.preventDefault();
				event.stopPropagation();
			}
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
					}
					$(window).on("beforeunload.close_editor", _.bind(this.close_editor, this));
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
			if(this.edit_button) {
				this.edit_button.removeClass("active").css(this.edit_button_css);
			}
			delete this.editor_window;
		},
	});
}(interstate, jQuery));
