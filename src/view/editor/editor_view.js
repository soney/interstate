/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var editor_template = cjs.createTemplate(
		"<nav class='navbar navbar-default' role='navigation'>" +
			"<div class='undoredo_group btn-group navbar-left'>" +
				"{{#if undo_desc}}" +
					"<div type='button' class='btn btn btn-default' data-cjs-on-click='undo'>" +
						"<div class='tooltip'>{{undo_desc}}</div>" +
						"<span class='glyphicon glyphicon-arrow-left'></span> " +
						"Undo" +
					"</div>" +
				"{{#else}}" +
					"<div disabled type='button' class='btn btn btn-default'>" +
						"<span class='glyphicon glyphicon-arrow-left'></span> " +
						"Undo" +
					"</div>" +
				"{{/if}}" +

				"{{#if redo_desc}}" +
					"<div type='button' class='btn btn btn-default' data-cjs-on-click='redo'>" +
						"<div class='tooltip'>{{redo_desc}}</div>" +
						"Redo" +
						" <span class='glyphicon glyphicon-arrow-right'></span>" +
					"</div>" +
				"{{#else}}" +
					"<div disabled type='button' class='btn btn btn-default'>" +
						"Redo" +
						" <span class='glyphicon glyphicon-arrow-right'></span>" +
					"</div>" +
				"{{/if}}" +
			"</div>" + // btn group
			"<table id='cell_group' class='input-group navbar-left'>" +
				"<tr>" +
					"<td>" +
						"<pre id='ace_ajax_editor'></pre>" +
					"</td>" +
					"<td id='confirm'>" +
						"<span title='Confirm cell' id='confirm_button' class='glyphicon glyphicon-ok-circle'></span>" +
					"</td>" +
					"<td id='cancel'>" +
						"<span title='Cancel' id='cancel_button' class='glyphicon glyphicon-remove-circle'></span>" +
					"</td>" +
				"</tr>" +
				"<tr>" +
					"<td class='resize_bar' data-cjs-on-mousedown='beginResizeAce'></td>" +
				"</tr>" +
			"</table>" +
			"<div class='widget_group navbar-right pull-right'>" +
				"<div type='button' class='btn btn btn-default {{show_components ? \"active\" : \"\"}}' data-cjs-on-click='toggle_show_widgets'>" +
					"Files" +
					" <span class='glyphicon {{show_components ? \"glyphicon-chevron-up\" : \"glyphicon-chevron-down\"}}'></span>" +
				"</div>" +
			"</div>" +
		"</nav>" +


		"{{#fsm loading_state}}" +
			"{{#state loading}}" +
				"<div class='loading'>loading editor...</div>" +
			"{{#state loaded}}" +
				"{{#if show_components}}" +
					"{{> widgetList getWidgetListOptions()}}" +
				"{{/if}}" + // show components
				"{{> navigator getNavigatorOptions()}}" +
				"{{> pinned getPinnedOptions()}}" +
		"{{/fsm}}"
	);
	$.widget("interstate.editor", {
		options: {
			full_window: true,
			server_window: window.opener,
			client_id: uid.get_prefix(),
			upload_usage: false,
			use_socket: false,
			pinned_row: true
		},
		_create: function () {
			this.$pinned_columns = cjs([]);
			this.loading_state = cjs.fsm("loading", "loaded")
									.startsAt("loading");

			this.$dragging_client = cjs(false);

			var on_load = this.loading_state.addTransition("loading", "loaded"),
				on_rootchange = this.loading_state.addTransition("loaded", "loading");

			this.$window_inner_width = cjs(function() { return window.innerWidth; });
			this.$window_inner_height = cjs(function() { return window.innerHeight; });
			$(window).on("resize.owr", _.bind(function() {
				this.$window_inner_width.invalidate();
				this.$window_inner_height.invalidate();
			}, this));

			this.$show_components = cjs(false);
			this.$info_servers = cjs(false);
			this.$undo_client = this.$info_servers.prop("undo_description");
			this.$redo_client = this.$info_servers.prop("redo_description");
			this.$pinned_height_pct = cjs(0.5);

			var get_pinned_height_pct = _.bind(function() {
				if(this.$pinned_columns.length() === 0) {
					if(this.$dragging_client.get()) {
						return .3;
					} else {
						return 0;
					}
				} else {
					return this.$pinned_height_pct.get();
				}
			}, this);
			this.$obj_nav_y = cjs(function() {
				var obj_nav_pos = $("#obj_nav", this.element).position();
				return obj_nav_pos ? obj_nav_pos.top : 0;
			}, {context: this});
			_.delay(_.bind(function() {
				this.$obj_nav_y.invalidate();
			}, this), 500);
			this.$nav_height = cjs(function() {
				var obj_nav_y = this.$obj_nav_y.get();
				return (this.$window_inner_height.get() - obj_nav_y)*(1-get_pinned_height_pct());
			}, {context: this});
			this.$pinned_height = cjs(function() {
				var obj_nav_y = this.$obj_nav_y.get();
				return (this.$window_inner_height.get() - obj_nav_y)*get_pinned_height_pct();
			}, {context: this});

			this.$undo_desc = cjs(function() {
				var client = this.$undo_client.get();
				return client ? client.get() : false;
			}, { context: this});

			this.$redo_desc = cjs(function() {
				var client = this.$redo_client.get();
				return client ? client.get() : false;
			}, { context: this});

			var on_comm_mechanism_load = function(communication_mechanism) {
				this.client_socket = new ist.ProgramStateClient({
					ready_func: this.option("debug_ready"),
					comm_mechanism: communication_mechanism
				})
				.on("loaded", function (root_client, info_servers) {
					this.root_client = root_client;
					this.$info_servers.set(info_servers);
					on_load();
				}, this)
				.on("root_changed", function () {
					on_rootchange();
				}, this)
				.on("stringified_root", function(data) {
					downloadWithName(data.value, data.name+".ist");
					//window.open("data:text/plain;charset=utf-8," + data.value);
				}, this)
				.on("stringified_obj", function(data) {
					downloadWithName("COMPONENT:"+data.value, data.name+".istc");
					//window.open("data:text/plain;charset=utf-8,COMPONENT:" + data.value);
				}, this)
				.on("inspect", function(data) {
					$("#obj_nav", this.element).navigator("open_cobj", data);
				}, this);
			};

			if(this.option("use_socket")) {
				interstate.async_js("/socket.io/socket.io.js", _.bind(function() {
					var socket_info = this.option("use_socket");
					var socket_wrapper = new ist.SocketCommWrapper(socket_info.client_id, false);
					on_comm_mechanism_load.call(this, socket_wrapper);
				}, this));
			} else {
				if(this.option("server_window") === window) {
					on_comm_mechanism_load.call(this, new ist.SameWindowCommWrapper(this.option("client_id"), 0));
				} else {
					on_comm_mechanism_load.call(this, new ist.InterWindowCommWrapper(this.option("server_window"), this.option("client_id")));
				}
			}

			$(window).on("keydown.editor_undo_redo", _.bind(function (event) {
				if (event.keyCode === 90 && (event.metaKey || event.ctrlKey)) {
					if (event.shiftKey) { this._redo(); }
					else { this._undo(); }
					event.stopPropagation();
					event.preventDefault();
				}
			}, this));
			this.element.on("dragstart.pin", _.bind(function(event) {
				this.$dragging_client.set(true);
				var targ = $(event.target),
					component_list = $(".components", this.element),
					pinned = $("#pinned", this.element);
				var clear_drag_info = function() {
												this.$dragging_client.set(false);
                                                component_list.add(pinned)	.removeClass("drop_indicator")
																			.off("dragover.pin drop.pin dragenter.pin dragleave.pin");
                                                targ.off("dragcancel.pin dragend.pin");
                                        };
				component_list.add(pinned)	.addClass("drop_indicator")
											.on("drop.pin", _.bind(function(e) {
												var client = targ.column("option", "client");
												if($(e.target).parents().is(".component_drop")) {
													this.client_socket.post({
														type: "save_component",
														cobj_id: client.cobj_id
													});
												} else {
													clear_drag_info.call(this);
													pinned.pinned("addClient", client);
												}
											}, this));
				
				targ.on("dragcancel.pin dragend.pin", _.bind(function(ev2) {
					clear_drag_info.call(this);
				}, this));
			}, this))
			.on("resize_pinned", _.bind(function(event) {
				var obj_nav_y = $("#obj_nav", this.element).position().top,
					obj_nav_height = Math.max(200, event.clientY - obj_nav_y),
					pinned_height = Math.max(200, window.innerHeight - obj_nav_height - obj_nav_y);

				this.$pinned_height_pct.set(pinned_height / (pinned_height + obj_nav_height));
			}, this));
			$(window).on("beforeunload.close_editor", _.bind(function () {
				this.destroy();
			}, this));

			this._addClassBindings();
			this._addEventListeners();
			this._addContentBindings();
		},
		_destroy: function () {
			this._removeContentBindings();
			this._removeEventListeners();
			this._removeClassBindings();
			this.$show_components.destroy();
			this.on_unload();

			this._super();
		},

		_undo: function() {
			this.client_socket.post_command("undo");
		},
		_redo: function() {
			this.client_socket.post_command("redo");
		},

		_addContentBindings: function() {
			editor_template({
				loading_state: this.loading_state,
				getNavigatorOptions: _.bind(function() {
					return {
						root_client: this.root_client,
						client_socket: this.client_socket,
						editor: this,
						height: this.$nav_height
					};
				}, this),
				getPinnedOptions: _.bind(function() {
					return {
						root_client: this.root_client,
						client_socket: this.client_socket,
						editor: this,
						columns: this.$pinned_columns,
						height: this.$pinned_height
					};
				}, this),
				undo: _.bind(this._undo, this),
				redo: _.bind(this._redo, this),
				show_components: this.$show_components,
				toggle_show_widgets: _.bind(function() {
					this.$show_components.set(!this.$show_components.get());
				}, this),
				getWidgetListOptions: _.bind(function() {
					return {
						info_servers: this.$info_servers,
						editor: this
					};
				}, this),
				undo_desc: this.$undo_desc,
				redo_desc: this.$redo_desc,
				dirty_program: this.$dirty_program,
				beginResizeAce: _.bind(function(event) {
					if(!$("table#cell_group", this.element).hasClass("disabled")) {
						var origY = event.clientY,
							height_diff = 0,
							origHeight = ace_editor.height();
						$(window).on("mousemove.resize_editor", _.bind(function(e) {
							height_diff = e.clientY - origY;
							var height = origHeight + height_diff;
							ace_editor.height(height);
							this.editor.resize();
						}, this)).on("mouseup.resize_editor", _.bind(function(e) {
							$(window).off(".resize_editor");
						}, this));
						event.preventDefault();
						event.stopPropagation();
					}
				}, this),
				dragging_client: this.$dragging_client
			}, this.element);
			var ace_editor = $("nav #ace_ajax_editor", this.element);
			ace_editor.css("width", "100%");
			this.editor = ace.edit(ace_editor[0]);
			this.editor.setHighlightActiveLine(false);
			this.editor.setShowPrintMargin(false);
			this.editor.renderer.setShowGutter(false); 
			this.editor.getSession().setMode("ace/mode/javascript");

			this._cellwidth_binding = cjs.bindCSS(ace_editor, "width", this.$window_inner_width.sub((this.$window_inner_width.le(767).iif(300, 300))).add("px"));
			this.$window_inner_width.onChange(function() {
				this.editor.resize();
			}, this);
			this._disable_editor();
		},
		_removeContentBindings: function() {
			this.editor.destroy();
			cjs.destroyTemplate(this.element);
			$(window).off("resize.owr");
			this._cellwidth_binding.destroy();
			this.$window_inner_width.destroy();
		},
		_addClassBindings: function() {
			if(this.option("full_window")) {
				$("html").addClass("full_window_editor");
			}
			this.element.addClass("editor_view");
		},
		_removeClassBindings: function() {
			if(this.option("full_window")) {
				$("html").removeClass("full_window_editor");
			}
			this.element.removeClass("editor_view");
		},

		_disable_editor: function() {
			$("table#cell_group", this.element).addClass("disabled");
			this.editor.setReadOnly(true)
		},

		_enable_editor: function() {
			$("table#cell_group", this.element).removeClass("disabled");
			this.editor.setReadOnly(false)
		},

		on_unload: function() {
			if(this.client_socket) {
				this.client_socket.destroy();
				delete this.client_socket;
			}
		},

		_addEventListeners: function() {
			this.element.on("command.editor", _.bind(this.on_command, this))
						.on("export.editor", _.bind(function(event) {
							var obj = event.obj;
							this.client_socket.post({
								type: "export_component",
								cobj_id: obj ? obj.cobj_id : false
							});
						}, this))
						.on("remove_storage.editor", _.bind(function(event) {
							this.client_socket.post({
								type: "remove_storage",
								name: event.name,
								storage_type: event.storage_type
							});
						}, this))
						.on("save_curr.editor", _.bind(function(event) {
							this.client_socket.post({
								type: "save_curr"
							});
						}, this))
						.on("save_curr_as.editor", _.bind(function(event) {
							this.client_socket.post({
								type: "save_curr_as",
								name: event.name
							});
						}, this))
						.on("create_program.editor", _.bind(function(event) {
							this.client_socket.post({
								type: "create_program",
								name: event.name
							});
						}, this))
						.on("rename_storage.editor", _.bind(function(event) {
							this.client_socket.post({
								type: "rename_program",
								from_name: event.from_name,
								to_name: event.to_name,
								storage_type: event.storage_type
							});
						}, this))
						.on("download_program.editor", _.bind(function(event) {
							this.client_socket.post({
								type: "download_program",
								name: event.name,
								storage_type: event.storage_type
							});
						}, this))
						.on("load_program.editor", _.bind(function(event) {
							this.client_socket.post({
								type: "load_program",
								name: event.name,
								storage_type: event.storage_type
							});
						}, this))
						.on("load_saved_file.editor", _.bind(function(event) {
							this.client_socket.post({
								type: "load_file",
								contents: event.filecontents,
								name: event.filename,
								also_load: event.also_load
							});
						}, this))
						.on("copy_component.editor", _.bind(function(event) {
							this.client_socket.post({
								type: "copy_component",
								name: event.name,
								target_obj_id: event.target_obj_id,
								above_below: event.above_below,
							});
						}, this))
						.on("begin_editing_cell", _.bind(function(event) {
							this.editor.setValue(event.initial_val, 1);

							this._enable_editor();
							$(event.textarea).editing_text("option", "helper", this.editor);
						}, this))
						.on("done_editing_cell", _.bind(function(event) {
							this.editor.setValue("");
							this._disable_editor();
						}, this))
						.on("add_highlight", _.bind(function(event) {
							var client = event.client,
								type = client.type ? client.type() : false;
							if(type === "stateful" || type === "dict") {
								this.client_socket.post({
									type: "add_highlight",
									cobj_id: client.cobj_id
								});
							}
						}, this))
						.on("remove_highlight", _.bind(function(event) {
							var client = event.client,
								type = client.type ? client.type() : false;
							if(type === "stateful" || type === "dict") {
								if(this.client_socket) { // this might happen after everything was destroyed
									this.client_socket.post({
										type: "remove_highlight",
										cobj_id: client.cobj_id
									});
								}
							}
						}, this)) ;
		},

		_removeEventListeners: function() {
			this.element.off(".editor");
		},

		getDraggingClientConstraint: function() {
			return this.$dragging_client;
		},

		on_command: function(event) {
			var type = event.command_type;
			var client, name, value, command, state, transition, statechart_puppet_id, parent_puppet_id;
			var command_str;

			if(type === "add_property") {
				client = event.client;
				var prop_type = event.prop_type;

				if(prop_type === "stateful") {
					value = new ist.StatefulObj(undefined, true);
					value.do_initialize({
						direct_protos: new ist.StatefulProp({ can_inherit: false, statechart_parent: value })
					});
				} else if(prop_type === "stateful_prop") {
					if(client.type() === "dict") {
						value = new ist.Cell({str: ''});
					} else {
						value = new ist.StatefulProp();
					}
				}

				command = new ist.SetPropCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					value: value,
					index: 0,
					name: event.prop_name
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;

					value.destroy();
					value = null;
				});
			} else if(type === "rename") {
				client = event.client;
				command = new ist.RenamePropCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					from: event.from_name,
					to: event.to_name
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "inherit") {
				client = event.client;
				//value = event.value;
				var prop_name = event.name;

				command = new ist.InheritPropCommand({
					in_effect: true,
					parent: { id: to_func(client.cobj_id) },
					name: prop_name
					//value: { id: to_func(value.cobj_id) }
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "unset") {
				client = event.client;
				command = new ist.UnsetPropCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					name: event.name
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "set_stateful_prop_for_state") {
				client = event.prop;
				state = event.state;
				value = new ist.Cell({str: event.text || '', substantiated: false});

				command = new ist.SetStatefulPropValueCommand({
					in_effect: true,
					stateful_prop: { id: to_func(client.obj_id) },
					state: { id: to_func(state.cobj_id) },
					value: value
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
					value.destroy();
					value = null;
				});
			} else if(type === "unset_stateful_prop_for_state") {
				client = event.prop;
				state = event.state;

				command = new ist.UnsetStatefulPropValueCommand({
					in_effect: true,
					stateful_prop: { id: to_func(client.obj_id) },
					state: { id: to_func(state.cobj_id) }
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "set_str") {
				client = event.client;
				value = event.str;

				command = new ist.ChangeCellCommand({
					in_effect: true,
					cell: { id: to_func(client.cobj_id || client.obj_id) },
					str: value
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "add_state") {
				state = event.state;
				statechart_puppet_id = state.puppet_master_id || state.id(); 
				var substates = state.get_substates();

				var substates_size = _.size(substates);
				var state_name, make_start;

				if(substates_size === 0) {
					state_name = "init";
					make_start = true;
				} else {
					var orig_state_name = "state_" + substates_size;
					state_name = orig_state_name;
					var i = 1;
					while(_.has(substates, state_name)) {
						state_name = orig_state_name + "_" + i;
					}
					make_start = false;
				}

				command = new ist.AddStateCommand({
					in_effect: true,
					statechart: { id: to_func(statechart_puppet_id) },
					name: state_name,
					make_start: make_start
				});

				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "remove_state") {
				state = event.state;
				name = state.get_name("parent");
				parent_puppet_id = state.parent().puppet_master_id || state.parent().id();
				command = new ist.RemoveStateCommand({
					in_effect: true,
					statechart: { id: to_func(parent_puppet_id) },
					name: name
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "remove_transition") {
				transition = event.transition;
				var statechart = transition.root();
				command = new ist.RemoveTransitionCommand({
					in_effect: true,
					transition: { id: to_func(transition.puppet_master_id || transition.id()) },
					statechart: { id: to_func(statechart.puppet_master_id || transition.id()) }
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "set_type") {
				var to_type = event.type_name;
				name = event.prop_name;
				client = event.client;
				if(to_type === "stateful") {
					value = new ist.StatefulObj(undefined, true);
					value.do_initialize({
						direct_protos: new ist.StatefulProp({ can_inherit: false, statechart_parent: value })
					});
				} else if(to_type === "stateful_prop") {
					value = new ist.StatefulProp();
				} else if(to_type === "cell") {
					value = new ist.Cell();
				}

				command = new ist.SetPropCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					value: value,
					name: name
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
					value.destroy();
					value = null;
				});
			} else if(type === "add_transition") {
				var from_state = event.from;
				var to_state = event.to;
				state = from_state.root();
				statechart_puppet_id = state.puppet_master_id || state.id();
				var from_puppet_id = from_state.puppet_master_id || from_state.id(),
					to_puppet_id = to_state.puppet_master_id || to_state.id();
				event = new ist.ParsedEvent({str: "(event)", inert: true});
				command = new ist.AddTransitionCommand({
					in_effect: true,
					from: { id: to_func(from_puppet_id) },
					to: { id: to_func(to_puppet_id) },
					event: event,
					statechart: { id: to_func(statechart_puppet_id) }
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
					event.destroy();
					event = null;
				});
			} else if(type === "set_transition_to") {
				transition = event.transition;
				state = event.to;
				statechart_puppet_id = state.puppet_master_id || state.id();
				command = new ist.SetTransitionToCommand({
					in_effect: true,
					transition: { id: to_func(transition.puppet_master_id || transition.id()) },
					statechart: { id: to_func(statechart_puppet_id) }
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "set_transition_from") {
				transition = event.transition;
				state = event.from;
				statechart_puppet_id = state.puppet_master_id || state.id();
				command = new ist.SetTransitionFromCommand({
					in_effect: true,
					transition: { id: to_func(transition.puppet_master_id || transition.id()) },
					statechart: { id: to_func(statechart_puppet_id) }
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "rename_state") {
				state = event.state;
				var new_name = event.new_name;
				var old_name = state.get_name("parent");
				parent_puppet_id = state.parent().puppet_master_id || state.parent().id();
				command = new ist.RenameStateCommand({
					in_effect: true,
					statechart: { id: to_func(parent_puppet_id) },
					from: old_name,
					to: new_name
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'set_transition_str') {
				transition = event.transition;
				var str = event.str;
				var transition_id = transition.puppet_master_id || transition.id();
				command = new ist.SetTransitionEventCommand({
					in_effect: true,
					transition: { id: to_func(transition_id) },
					event: str
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'set_copies') {
				value = event.str;
				client = event.client;
				command = new ist.SetCopiesCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					value: value
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'reset') {
				client = event.client;
				command = new ist.ResetCommand({
					in_effect: true,
					parent: { id: to_func(client.cobj_id) }
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'make_concurrent') {
				state = event.state;
				var state_puppet_id = state.puppet_master_id || state.id();
				command = new ist.MakeConcurrentCommand({
					in_effect: true,
					statechart: { id: to_func(state_puppet_id) },
					concurrent: event.concurrent
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'move_prop') {
				var from_obj = event.from_obj;
				var from_name = event.from_name;
				var target_obj = event.target_obj;
				var target_name = event.target_name;
				var above_below = event.above_below;

				command = new ist.MovePropAboveBelowCommand({
					in_effect: true,
					from_obj: { id: to_func(from_obj.obj_id) },
					from_name: from_name,
					target_obj: { id: to_func(target_obj.obj_id) },
					target_name: target_name,
					above_below: above_below
				});
				command_str = this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else {
				console.log("Unhandled type " + type);
			}
			if(this.option("upload_usage")) {
				this.upload_event({
					type: "command",
					value: command_str
				});
			}
		}
	});

	ist.create_key_val_map = function(key_constraint, value_constraint) {
		var map = cjs.map({}),
			old_keys = [],
			old_vals = [];

		var live_fn = cjs.liven(function() {
			var keys = key_constraint.get() || [],
				vals = value_constraint.get() || [];

			var map_diff = ist.get_map_diff(old_keys, keys, old_vals, vals);

			_.each(map_diff.key_change, function(info) {
				map.rename(info.from, info.to);
			});
			_.each(map_diff.set, function(info) {
				map.put(info.key, info.value)
			});
			_.each(map_diff.unset, function(info) {
				map.remove(info.key);
			});
			_.each(map_diff.value_change, function(info) {
				map.put(info.key, info.to);
			});

			old_keys = keys;
			old_vals = vals;
		});

		var old_destroy = map.destroy;
		map.destroy = function() {
			old_destroy.apply(this, arguments);
			live_fn.destroy();
		};

		return map;
	}
	function to_func(value) {
		return function () { return value; };
	}

	function eventFire(el, etype) {
		if (el.fireEvent) {
			(el.fireEvent('on' + etype));
		} else {
			var evObj = document.createEvent('Events');
			evObj.initEvent(etype, true, false);
			el.dispatchEvent(evObj);
		}
	}

	function downloadWithName(data, name) {
		var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

		if(is_chrome) {
			var link = document.createElement("a");
			link.download = name;
			link.href = "data:," + data;
			eventFire(link, "click");
		} else {
			//window.open("data:text/plain;charset=utf-8," + data);
			var link = document.createElement("a");
			link.download = name;
			link.href = "data:," + data;
			eventFire(link, "click");
		}
	}
}(interstate, jQuery));
