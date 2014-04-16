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
					"text-decoration": "none",
					"font-variant": "small-caps",
					"padding-top": "0px",
					position: "fixed",
					top: display === "tablet" ? "15px" : "0px",
					right: "70px",
					color: this.button_color,
					"background-color": "",
					"font-size": "1.2em",
					"font-family": '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
					cursor: "pointer",
					"border-bottom": "5px solid " + this.button_color
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
				}
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

				this.undo_redo_buttons = $("<div />").append("<img src='src/view/editor/style/images/undo.png' width='23px' style='margin:3px'>")
												.append("<img src='src/view/editor/style/images/redo.png' width='23px' style='margin:3px'>")
												.css(this.undo_redo_css)
												.on("mousedown.undo_redo touchstart.undo_redo", _.bind(this.undo_redo, this));
				
				this.running_button = $("<ul />").text("Code View")
												.css(this.running_button_css)
												.css(this.hidden_button_css)
												.css(this.code_view_css);											
				this.editing_button = $("<ul />").text("Design View")
												.css(this.running_button_css)
												.css(this.editing_button_css)
												.css(this.hidden_button_css);
				this.inspect = $("<ul />")		.append("<li><p class='first'><img src='src/view/editor/style/images/circle_info.png' width='15px'/> Inspect</p></li>")
												.css(this.palette_css)
				this.palette = $("<ul />")		.append("<li><p class='rectangle'><img src='src/view/editor/style/images/square.png' width='15px'/> Rectangle</p></li>")
												.append("<li><p class='ellipse'><img src='src/view/editor/style/images/circle.png' width='15px'> Ellipse</p></li>")
												.append("<li><p class='text'><img src='src/view/editor/style/images/font.png' width='15px'> Text</p></li>")												
												.append("<li><p class='image'><img src='src/view/editor/style/images/picture.png' width='15px'> Image</p></li>")												
												.css(this.palette_css)
												.on('click', function(e){
													if (e.target.className === 'circle') {
														that.create_new_object('circle');
													}
													else if (e.target.className === 'rectangle') {
														that.create_new_object('rectangle');
													}
													else if (e.target.className === 'ellipse') {
														that.create_new_object('ellipse');
													}		
													else if (e.target.className === 'text') {
														that.create_new_object('text');
													}																									
													else if (e.target.className === 'image') {
														that.create_new_object('image');
													}																									
												});
				this.run_state = cjs.fsm('code', 'design')
												.addTransition('code', 'design', cjs.on('click', this.running_button))
												.addTransition('design', 'code', cjs.on('click', this.editing_button))
												.on('code->design', function(){
													$("body").on("click.doSetProp", _.bind(function(e) {
														var command = new ist.SetPropCommand({
															name: 'something', 
															value: e.clientX, 
															parent: that.option('root')
														});
													}));
													this.running_button.css(this.run_edit_active_css);
													this.editing_button.css(this.editing_button_css);													
													this.editing_button.css(this.run_edit_inactive_css);
													this.editing_button.css(this.editing_button_open_css);
													this.palette.css(this.palette_css);
													this.inspect.css(this.inspect_css);
													this.undo_redo_buttons.css(this.shown_button_css);													
												}, this)
												.on('design->code', function() {
													$("body").off("click.doSetProp");
													this.editing_button.css(this.run_edit_active_css);
													this.running_button.css(this.run_edit_inactive_css);
													this.running_button.css(this.running_button_css);	
													this.editing_button.css(this.editing_button_css);																									
													this.palette.css(this.palette_css_show);
													this.inspect.css(this.inspect_css_show);																																																													
													this.undo_redo_buttons.css(this.shown_button_css);		
												}, this);

				var append_interval = window.setInterval(_.bind(function (element, edit_button, running_button, editing_button, palette, inspect, undo_redo_buttons) {
					if (element.parentNode) {
						element.parentNode.appendChild(edit_button);
						element.parentNode.appendChild(undo_redo_buttons);
						element.parentNode.appendChild(running_button);
						element.parentNode.appendChild(inspect);												
						element.parentNode.appendChild(editing_button);
						element.parentNode.appendChild(palette);						
						window.clearInterval(append_interval);
					}
				}, window, this.element[0], this.edit_button[0], this.running_button[0], this.editing_button[0], this.palette[0], this.inspect[0], this.undo_redo_buttons[0]), 100);


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

		undo_redo: function() {
			this.client_socket.post_command("undo");
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
			protos_cell = new ist.Cell({str: "svg."+object, ignore_inherited_in_first_dict: true});

			protos_stateful_prop.set(start_state, protos_cell);

			var stateful_obj_small = new ist.StatefulObj(undefined, true),
			protos_stateful_prop_small = new ist.StatefulProp({can_inherit: false,
				statechart_parent: stateful_obj_small});
			stateful_obj_small.do_initialize({
				direct_protos: protos_stateful_prop_small
			});

			var statechart_small = stateful_obj_small.get_own_statechart(),
			start_state_small = statechart_small.get_start_state(),
			protos_cell_small = new ist.Cell({str: "svg.rectangle", ignore_inherited_in_first_dict: true});

			protos_stateful_prop_small.set(start_state_small, protos_cell_small);

			var xVal = 1;
			var yVal = 1;

			if (object === "rectangle") {
				xVal = 140;
				yVal = 90;
			}
			else if (object === "ellipse") {
				xVal = 450;
				yVal = 270;
			}
			else if (object === "image") {
				xVal = 160;
				yVal = 160;

			}

			var propCommandX = new ist.SetPropCommand({
							parent: stateful_obj_small,
							name: "x",
							value: xVal
			}),
			propCommandY = new ist.SetPropCommand({
							parent: stateful_obj_small,
							name: "y",
							value: yVal
			});

			var widthProp = new ist.SetPropCommand({
							parent: stateful_obj_small,
							name: "width",
							value: "10"
			}),
			heightProp = new ist.SetPropCommand({
							parent: stateful_obj_small,
							name: "height",
							value: "10"
			});			

			var colorProp = new ist.SetPropCommand({
							parent: stateful_obj_small,
							name: "fill",
							value: "red"
			})			
			var combined_command = new ist.CombinedCommand({
				commands: [propCommandX, propCommandY]
			});

			var size_command = new ist.CombinedCommand({
				commands: [widthProp, heightProp]
			});


			var sketch = this.option("root"),
				screen = sketch._get_direct_prop('screen');

			if(!screen) {
				screen = new ist.StatefulObj(undefined, true);
				protos_stateful_prop = new ist.StatefulProp({can_inherit: false,
					statechart_parent: screen});
				screen.do_initialize({
					direct_protos: protos_stateful_prop
				});
				sketch._set_direct_prop("screen", screen);

				statechart = screen.get_own_statechart(),
				start_state = statechart.get_start_state(),
				protos_cell = new ist.Cell({str: "svg.paper", ignore_inherited_in_first_dict: true});

				protos_stateful_prop.set(start_state, protos_cell);
			}			
			var parent = this.option("root");
            var prop_names = screen._get_direct_prop_names();
            var prefix = "obj";
            var prefix_small = "resize"
            var len = 0;
            if (parent instanceof ist.Dict) {
            	if (object === "rectangle") {
            		prefix = "rect";
            	}
            	else if (object === "ellipse") {
            		prefix = "ellipse";
            	}
            	else if (object === "text") {
            		prefix = "text";
            	}
            	else if (object === "image") {
            		prefix = "image";
            	}
            }
            var new_prop_name = prefix + "_" +  prop_names.length;

			var propCommand = new ist.SetPropCommand({parent: screen, value: stateful_obj, name: new_prop_name});
			this._command_stack._do(propCommand);
			
			var new_prop_name_small = prefix_small + "_" + screen._get_direct_prop_names().length;
			
			var circle_context = ist.find_or_put_contextual_obj(stateful_obj, new ist.Pointer({stack:[sketch,screen,stateful_obj]}));
			var dom_element = circle_context.get_dom_obj();			
			
			if (object !== 'text') {
				var propCommandSmall = new ist.SetPropCommand({parent: screen, value: stateful_obj_small, name: new_prop_name_small});
				this._command_stack._do(propCommandSmall);
				this._command_stack._do(combined_command);
				this._command_stack._do(size_command);			
				this._command_stack._do(colorProp);			

				var rect_context = ist.find_or_put_contextual_obj(stateful_obj, new ist.Pointer({stack:[sketch,screen,stateful_obj_small]}));														
				var dom_element_small = rect_context.get_dom_obj();
				
				this._add_resize_listener(stateful_obj_small, dom_element_small, stateful_obj, dom_element, object);											
			}


			
			this._add_event_listeners(stateful_obj_small, dom_element_small, stateful_obj, dom_element, object);		

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
			if(!this._update_fn) {
			/*
				ist.update_current_contextual_objects(root_dict, true);
				this._update_fn = cjs.liven(function() {
					ist.update_current_contextual_objects(root_dict);
				}, {
					pause_while_running: true
				});
				*/
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


		// fields and values are arrays, must have the same length
		_save_state_multiple_fields: function(element, fields, values) {
			if (fields.length != values.length) {
				//@TODO, make error handling better
				console.log("ERROR, SHOULD NOT HAVE REACHED HERE");
			}
			for (var i = 0; i < fields.length; i++) {
				_save_state_single_field(element, fields[i], values[i]);
			}

		},

		/*
		field is a string
		value need not be a string
		*/
		_save_state_single_field: function(element, field, value) {
			var field_stateful_prop = new ist.StatefulProp({statechart_parent: element});
			var string_value = value + '';
			var field_cell  = new ist.Cell({str: string_value});

			var statechart = element.get_own_statechart(),
			start_state = statechart.get_start_state();

			field_stateful_prop.set(start_state, field_cell);
			//element.set_prop(field, field_stateful_prop);				  

			var command = new ist.SetPropCommand({
				parent: element,
				name: field,
				value: field_stateful_prop
			});

			return {
				command: command,
				cell: field_cell
			}
		},

		_add_resize_listener: function(rect_element, rect_dom_element, element, dom_element, obj) {
	      	var that = this;	   
	      	var element_initial_state = null;
	      	var cells = false;

			$(rect_dom_element).on("mousedown", function(ev) {
				if (obj === 'rectangle' || obj === 'image') {
					element_initial_state = {
						origHeight: dom_element.height.baseVal.value,
			    		origWidth: dom_element.width.baseVal.value
					};
				}

				else if (obj === 'ellipse') {
					element_initial_state = {
						origRadiusY: dom_element.ry.baseVal.value,
						origRadiusX: dom_element.rx.baseVal.value
					}
				}
		         
		         ev=ev||event;
				 element_initial_state['origClickX'] = ev.clientX;
			     element_initial_state['origClickY'] = ev.clientY;
			});

			$('body').on("mouseup", function(ev) {
		        if (element_initial_state) {
		        	if (obj === 'rectangle' || obj === 'image') {
		        		var new_cells = that._resize_mouse_move_rectangle(ev, element_initial_state, element, rect_element, dom_element, rect_dom_element, cells);

		        		if (new_cells) {
		        			cells = new_cells;
		        		}
		       		}

		       		else if (obj === 'ellipse') {
		       			var new_cells = that._resize_mouse_move_ellipse(ev, element_initial_state, element, rect_element, dom_element, rect_dom_element, cells);	

		       			if(new_cells) {
		       				cells = new_cells;
		       			}
		       		}

		          element_initial_state = null;
		          cells = false;
		        }
			});		

			$('body').on("mousemove", function(ev) {	
		        if(element_initial_state) {
		        	if (obj === 'rectangle' || obj === 'image') {
		        		var new_cells = that._resize_mouse_move_rectangle(ev, element_initial_state, element, rect_element, dom_element, rect_dom_element, cells);

		        		if (new_cells) {
		        			cells = new_cells;
		        		}
		       		}

		       		else if (obj === 'ellipse') {
		       			var new_cells = that._resize_mouse_move_ellipse(ev, element_initial_state, element, rect_element, dom_element, rect_dom_element, cells);	
		       			if(new_cells) {
		       				cells = new_cells;
		       			}
		       		}
		        }
			});					
		},

		_resize_mouse_move_ellipse: function(ev, element_initial_state, element, rect_element, dom_element, rect_dom_element, cells) {
			var rect_width = rect_dom_element.width.baseVal.value;
			var rect_height = rect_dom_element.height.baseVal.value;

			var radius_x = element_initial_state.origRadiusX;
			var radius_y = element_initial_state.origRadiusY;

			var new_radius_x = Math.max((ev.clientX - element_initial_state.origClickX + radius_x), 15) + '';
			var new_radius_y = Math.max((ev.clientY - element_initial_state.origClickY + radius_y), 15) + '';

			var cx = dom_element.cx.baseVal.value;
			var cy = dom_element.cy.baseVal.value;

			var rect_x = cx + parseInt(new_radius_x) + '';
			var rect_y = cy + parseInt(new_radius_y) + '';

			if(cells) {
				//...set cell code
				console.log(cells);
				var change_cell_commands = {
					rx: new ist.ChangeCellCommand({
						cell: cells.rx,
						str: new_radius_x
					}),
					ry: new ist.ChangeCellCommand({
						cell: cells.ry,
						str: new_radius_y
					}),
					x: new ist.ChangeCellCommand({
						cell: cells.x,
						str: rect_x
					}),
					y: new ist.ChangeCellCommand({
						cell: cells.y,
						str: rect_y
					})
				};
				console.log(change_cell_commands);
				var combined_command = new ist.CombinedCommand({
				 	commands: _.values(change_cell_commands)
				});
				
				this._command_stack._do(combined_command);
				return false;
			} else {
				var rx_info = this._save_state_single_field(element, 'rx', new_radius_x),
					ry_info = this._save_state_single_field(element, 'ry', new_radius_y),
					x_info = this._save_state_single_field(rect_element, 'x', rect_x), // cx - (rect_width/2)
					y_info = this._save_state_single_field(rect_element, 'y', rect_y); // cy - (rect_height/2)

				var cells = {
					rx: rx_info.cell,
					ry: ry_info.cell,
					x: x_info.cell,
					y: y_info.cell,
				};

				var commands = {
					rx: rx_info.command,
					ry: ry_info.command,
					x: x_info.command,
					y: y_info.command
				};
				var combined_command = new ist.CombinedCommand({
				 	commands: _.values(commands)
				});

				console.log(combined_command);
				this._command_stack._do(combined_command);
				return cells;
			}
		},

		_resize_mouse_move_rectangle: function(ev, element_initial_state, element, rect_element, dom_element, rect_dom_element, cells) {
			var rect_width = rect_dom_element.width.baseVal.value;
			var rect_height = rect_dom_element.height.baseVal.value;

			var width = element_initial_state.origWidth;
			var height = element_initial_state.origHeight;

			// Remove magic number
			var new_width = Math.max((ev.clientX - element_initial_state.origClickX + width), 20);
			var new_height = Math.max((ev.clientY - element_initial_state.origClickY + height), 20);

			var new_red_x = (dom_element['x'].baseVal.value + new_width - rect_width) + '';
			var new_red_y = (dom_element['y'].baseVal.value + new_height - rect_height) + '';

			if(cells) {
				//...set cell code

				var change_cell_commands = {
					rx: new ist.ChangeCellCommand({
						cell: cells.rx,
						str: (new_width + '')
					}),
					ry: new ist.ChangeCellCommand({
						cell: cells.ry,
						str: (new_height + '')
					}),
					x: new ist.ChangeCellCommand({
						cell: cells.x,
						str: new_red_x
					}),
					y: new ist.ChangeCellCommand({
						cell: cells.y,
						str: new_red_y
					})
				};

				var combined_command = new ist.CombinedCommand({
				 	commands: _.values(change_cell_commands)
				});
				
				this._command_stack._do(combined_command);
				return false;
			} else {
				var rx_info = this._save_state_single_field(element, 'width', new_width),
					ry_info = this._save_state_single_field(element, 'height', new_height),
					x_info = this._save_state_single_field(rect_element, 'x', new_red_x), // cx - (rect_width/2)
					y_info = this._save_state_single_field(rect_element, 'y', new_red_y); // cy - (rect_height/2)

				var cells = {
					rx: rx_info.cell,
					ry: ry_info.cell,
					x: x_info.cell,
					y: y_info.cell,
				};

				var commands = {
					rx: rx_info.command,
					ry: ry_info.command,
					x: x_info.command,
					y: y_info.command
				};
				var combined_command = new ist.CombinedCommand({
				 	commands: _.values(commands)
				});

				this._command_stack._do(combined_command);
				return cells;
			}

		},

/*		_resize_mouse_move: function(ev, element_initial_state, element, rect_element, dom_element, rect_dom_element) {
			ev = ev || event;

			this._resize_mouse_move_rectangle(ev, element_initial_state, element, rect_element, dom_element, rect_dom_element);			

		}, */
		_mouse_move : function(ev, nameX, nameY, dragData, dragDataRed, element, rect_element, cells) {
			ev = ev || event;	
			var new_position_x = ev.clientX - dragData.x;
			var new_position_y = ev.clientY - dragData.y;		

			if (dragDataRed) {
				var x_info_red = this._save_state_single_field(rect_element, 'x', ev.clientX - dragDataRed.x);
				var y_info_red = this._save_state_single_field(rect_element, 'y', ev.clientY - dragDataRed.y);							

				var combined_command_red = new ist.CombinedCommand({
					commands: _.pluck([x_info_red, y_info_red], "command")
				});

				this._command_stack._do(combined_command_red);
			}

			if(cells) {
				//...set cell code
				var change_cell_commands = {
					x: new ist.ChangeCellCommand({
						cell: cells.x,
						str: (new_position_x + '')
					}),
					y: new ist.ChangeCellCommand({
						cell: cells.y,
						str: (new_position_y + '')
					})
				};

				var combined_command = new ist.CombinedCommand({
				 	commands: _.values(change_cell_commands)
				});

				this._command_stack._do(combined_command);

				return false;
			} else {
				var x_info = this._save_state_single_field(element, nameX, new_position_x), // cx - (rect_width/2)
					y_info = this._save_state_single_field(element, nameY, new_position_y); // cy - (rect_height/2)

				var cells = {
					x: x_info.cell,
					y: y_info.cell
				};
				
				var combined_command = new ist.CombinedCommand({
				 	commands: _.pluck([x_info, y_info], "command")
				});

				this._command_stack._do(combined_command);
				return cells;
			}						



		},

		_add_event_listeners: function(rect_element, rect_dom_element, element, dom_element, obj) {
	      	var touchedElement,dragData,dragDataRed=null;
	      	var objectX, objectY = 0;
	      	var redObjectX, redObjectY = 0;	      	
	      	var nameX, nameY = "";
	      	var that = this;
	      	var cells = false;
	      	if (rect_dom_element) {
	      		var red_square_size = rect_dom_element.width.baseVal.value;      				      		      		
	      	}
			$(dom_element).on("mousedown", function(ev) {
				touchedElement = this;
				if(!dragData) {
					if (obj === 'rectangle' || obj === 'text' || obj === 'image') {
						nameX = 'x';
						nameY = 'y';
					}

					else if (obj === 'ellipse' || obj === 'circle') {
						nameX = 'cx';
						nameY = 'cy';		          
					}
					if (obj !== 'text') {
						dragData={
							x: ev.clientX - touchedElement[nameX].baseVal.value,
							y: ev.clientY - touchedElement[nameY].baseVal.value
						}				

						dragDataRed = {
							x : ev.clientX - rect_dom_element.x.baseVal.value,
							y : ev.clientY - rect_dom_element.y.baseVal.value
						}									
					}
					else {
						dragData={
							x: ev.clientX - touchedElement[nameX].baseVal.getItem(0).value,
							y: ev.clientY - touchedElement[nameY].baseVal.getItem(0).value
						}						
					}
		        };
			});

			$(dom_element).on("mouseup", function(ev) {
		        if(dragData) {
		          var new_cells = that._mouse_move(ev, nameX, nameY, dragData, dragDataRed, element, rect_element, cells);
		          if (new_cells) {
		          	cells = new_cells;
		          }

		          dragData = null;
				  dragDataRed = null;		          
		        }
			});			

			$('body').on("mousemove", function(ev) {	
		        if(dragData) {			
				  var new_cells = that._mouse_move(ev, nameX, nameY, dragData,dragDataRed,element,rect_element, cells);
		          if (new_cells) {
		          	cells = new_cells;
		          }				  
		        }
			});							
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
			this.editing_button.css(this.shown_button_css);
			this.running_button.css(this.shown_button_css);
			this.undo_redo_buttons.css(this.shown_button_css);
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
