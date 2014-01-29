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
			"</table>" +
			"<div class='widget_group btn-group navbar-right'>" +
				"<div type='button' class='btn btn btn-default {{show_components ? \"active\" : \"\"}}' data-cjs-on-click='toggle_show_widgets'>" +
					"Widgets" +
					" <span class='glyphicon {{show_components ? \"glyphicon-chevron-up\" : \"glyphicon-chevron-down\"}}'></span>" +
				"</div>" +
			"</div>" +
		"</nav>" +


		"{{#fsm loading_state}}" +
			"{{#state loading}}" +
				"<div class='loading'>loading editor...</div>" +
			"{{#state loaded}}" +
				"{{#if show_components}}" +
					"{{> widgetList info_servers}}" +
				"{{/if}}" + // show components
				"{{> navigator getNavigatorOptions()}}" +
		"{{/fsm}}" +

		"<div class='pinned'>" +
		"</div>"
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
			this.loading_state = cjs.fsm("loading", "loaded")
									.startsAt("loading");

			var on_load = this.loading_state.addTransition("loading", "loaded"),
				on_rootchange = this.loading_state.addTransition("loaded", "loading");

			this.$show_components = cjs(true);
			this.$info_servers = cjs(false);
			this.$undo_client = this.$info_servers.prop("undo_description");
			this.$redo_client = this.$info_servers.prop("redo_description");

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
					window.open("data:text/plain;charset=utf-8," + data.value);
				}, this)
				.on("stringified_obj", function(data) {
					window.open("data:text/plain;charset=utf-8,COMPONENT:" + data.value);
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

			this._addClassBindings();
			this._addEventListeners();
			this._addContentBindings();
		},
		_destroy: function () {
			this._removeContentBindings();
			this._removeEventListeners();
			this._removeClassBindings();
			this.$show_components.destroy();

			this._super();
		},

		_addContentBindings: function() {
			editor_template({
				loading_state: this.loading_state,
				getNavigatorOptions: _.bind(function() {
					return {
						root_client: this.root_client,
						client_socket: this.client_socket
					};
				}, this),
				undo: _.bind(function() {
					this.client_socket.post_command("undo");
				}, this),
				redo: _.bind(function() {
					this.client_socket.post_command("redo");
				}, this),
				show_components: this.$show_components,
				toggle_show_widgets: _.bind(function() {
					this.$show_components.set(!this.$show_components.get());
				}, this),
				info_servers: this.$info_servers,
				undo_desc: this.$undo_desc,
				redo_desc: this.$redo_desc,
				dirty_program: this.$dirty_program
			}, this.element);
			var ace_editor = $("nav #ace_ajax_editor", this.element);
			ace_editor.css("width", "100%");
			this.editor = ace.edit(ace_editor[0]);
			this.editor.setHighlightActiveLine(false);
			this.editor.setShowPrintMargin(false);
			this.editor.renderer.setShowGutter(false); 
			this.editor.getSession().setMode("ace/mode/javascript");
			this.$window_inner_width = cjs(function() {
				return window.innerWidth;
			});
			$(window).on("resize.owr", _.bind(this.$window_inner_width.invalidate, this.$window_inner_width));

			this._cellwidth_binding = cjs.bindCSS(ace_editor, "width", this.$window_inner_width.sub((this.$window_inner_width.le(767).iif(60, 300))).add("px"));
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
		},
		_removeClassBindings: function() {
			if(this.option("full_window")) {
				$("html").removeClass("full_window_editor");
			}
		},

		_disable_editor: function() {
			$("table#cell_group", this.element).addClass("disabled");
			this.editor.setReadOnly(true)
		},

		_enable_editor: function() {
			$("table#cell_group", this.element).removeClass("disabled");
			this.editor.setReadOnly(false)
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
						/*
							this.editor.setValue(event.initial_val);
							this.editor.clearSelection();
							*/

							this._enable_editor();
							$(event.textarea).editing_text("option", "helper", this.editor);
							/*
							editing_text
							this.$textarea_binding = cjs(textarea);
							this.$textarea_binding.onChange(function() {
								this.editor.setValue(this.$textarea_binding.get());
								this.editor.clearSelection();
							}, this);

							*/
						}, this))
						.on("done_editing_cell", _.bind(function(event) {
							this.editor.setValue("");
							this._disable_editor();
						}, this));
		},

		_removeEventListeners: function() {
			this.element.off(".editor");
		},
	/*

		_create: function () {
			this.element.addClass(this.option("view_type"))
						.attr({
							id: "editor"
						});

			if(this.option("full_window")) {
				$("html").addClass("full_window_editor");
			}
			var communication_mechanism;
			var on_comm_mechanism_load = function(communication_mechanism) {
				this.client_socket = new ist.ProgramStateClient({
					ready_func: this.option("debug_ready"),
					comm_mechanism: communication_mechanism
				})
				.on("loaded", function (root_client, info_servers) {
					if(this.displaying_loading_text) {
						this.element.html("");
						this.displaying_loading_text = false;
					}
					this.load_viewer(root_client, info_servers);
				}, this)
				.on("root_changed", function () {
					this.navigator.navigator("destroy");
					$("column", this.pinned).column("destroy").remove();
					this.element.pane("set_percentage", 0, 1);
				}, this)
				.on("stringified_root", function(data) {
					window.open("data:text/plain;charset=utf-8," + data.value);
				}, this)
				.on("stringified_obj", function(data) {
					window.open("data:text/plain;charset=utf-8,COMPONENT:" + data.value);
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

			this.displaying_loading_text = true;
			this.element.text("Loading...");
			$(window).on("beforeunload.close_editor", _.bind(function () {
				this.on_unload();
			}, this));
			if(this.option("upload_usage")) {
				this.element.on("child_select.upload", _.bind(function(event, info) {
								this.upload_event({
									type: "navigate",
									value: info.name
								});
							}, this))
							.on("header_click.upload", _.bind(function(event, col) {
								if(col && col.option) {
									this.upload_event({
										type: "navigate",
										value: col.option("name")
									});
								}
								//this.upload_event(event);
							}, this));

			}
		},

		get_client_socket: function() {
			return this.client_socket;
		},

		load_navigator: function (root_client) {
			if(!this.navigator) {
			}
		},

		export_component: function(event) {
			var obj = event.obj;
			this.client_socket.post({
				type: "export_component",
				cobj_id: obj ? obj.cobj_id : false
			});
		},

		load_viewer: function (root_client, info_servers) {
			if(!this.element.data("interstate.pane")) {
				this.element.pane();
			}
			if(!this.menu) {
				this.menu = $("<div />").menu({
											title: "menu",
											items: {
												"Undo": {
													on_select: _.bind(this.undo, this)
												},
												"Redo": {
													on_select: _.bind(this.redo, this)
												},
												"Components": {
													on_select: _.bind(this.toggle_components, this)
												},
											}
										})
										.appendTo(this.element);
			}

			if(!this.navigator) {
				this.navigator = $("<div />").addClass("navigator row");

				this.element.pane("add", this.navigator);
			}

			this.navigator .navigator({
								root_client: root_client,
								single_col: this.option("single_col_navigation"),
								client_socket: this.client_socket 
							});

			if(!this.pinned) {
				this.pinned = $("<div />")	.addClass("pinned row");
				this.pin_indicator = $("<div />").addClass("pin_explanation").text("drag here to pin").appendTo(this.pinned);
				if(this.option("pinned_row")) {
					this.element.pane("add", this.pinned);
				}
				this.element.pane("set_percentage", 0, 1);

				this.element.on("command.do_action", _.bind(this.on_command, this))
							.on("export", _.bind(this.export_component, this))
							.on("remove_storage", _.bind(function(event) {
								this.client_socket.post({
									type: "remove_storage",
									name: event.name,
									storage_type: event.storage_type
								});
							}, this))
							.on("save_curr", _.bind(function(event) {
								this.client_socket.post({
									type: "save_curr",
									name: event.name,
									storage_type: event.storage_type
								});
							}, this))
							.on("download_program", _.bind(function(event) {
								this.client_socket.post({
									type: "download_program",
									name: event.name,
									storage_type: event.storage_type
								});
							}, this))
							.on("load_program", _.bind(function(event) {
								this.client_socket.post({
									type: "load_program",
									name: event.name,
									storage_type: event.storage_type
								});
							}, this))
							.on("load_saved_file", _.bind(function(event) {
								this.client_socket.post({
									type: "load_file",
									contents: event.filecontents,
									name: event.filename
								});
							}, this))
							.on("copy_component", _.bind(function(event) {
								this.client_socket.post({
									type: "copy_component",
									name: event.name,
									target_obj_id: event.target_obj_id,
									above_below: event.above_below,
								});
							}, this));

				this.navigator.on("dragstart.pin", _.bind(function(event) {
					var bottom_indicator_was_hidden = this.element.pane("get_percentage", 0) > 0.99;
					if(bottom_indicator_was_hidden) {
						this.element.pane("set_percentage", 0, 0.6);
					}
					var targ = $(event.target);

					var clear_drag_info = function() {
						this.pinned.off("dragenter.pin dragleave.pin drop.pin")
									.removeClass("dropover drop_indicator");
						this.component_list.off("dragover.pin drop.pin dragenter.pin dragleave.pin");
						targ.off("dragcancel.pin dragend.pin");
					};

					this.component_list.on("dragover.pin", function() { })
										.on("dragenter.pin", function() { })
										.on("drop.pin", _.bind(function() {
											var client = targ.column("option", "client");
											
											this.client_socket.post({
												type: "save_component",
												cobj_id: client.cobj_id
											});
										}, this));


					this.pinned	.addClass("drop_indicator")
								.on("dragenter.pin", _.bind(function(ev2) {
									this.pinned.addClass("dropover");
								}, this))
								.on("dragover.pin", function() {
									return false;
								})
								.on("dragleave.pin", _.bind(function(ev2) {
									this.pinned.removeClass("dropover");
								}, this))
								.on("drop.pin", _.bind(function(ev2) {
									clear_drag_info.call(this);
									var client = targ.column("option", "client");
									var client_socket = targ.column("option", "client_socket");
									var pinned_col = $("<table />")	.appendTo(this.pinned)
																	.column({
																		client: targ.column("option", "client"),
																		name: targ.column("option", "name"),
																		prev_col: targ.column("option", "prev_col"),
																		show_prev: true,
																		is_curr_col: true,
																		show_source: true,
																		curr_copy_client: targ.column("option", "curr_copy_client"),
																		client_socket: client_socket,
																		curr_copy_index: targ.column("option", "curr_copy_index"),
																		close_button: true
																	});

									pinned_col.on("child_select.nav", _.bind(function(event, child_info) {
										client = child_info.value;
										pinned_col	.column("destroy")
													.column({
														client: client,
														name: child_info.name,
														prev_col: true,
														show_prev: true,
														is_curr_col: true,
														show_source: true,
														client_socket: client_socket,
														close_button: true
													});
									}, this)).on("prev_click.nav", _.bind(function() {
										client.async_get("parent", function(new_client) {
											client = new_client;
											pinned_col	.column("destroy")
														.column({
															client: client,
															name: client.object_summary.name,
															prev_col: true,
															show_prev: true,
															is_curr_col: true,
															show_source: true,
															client_socket: client_socket,
															close_button: true
														});
										});
									}, this));
									ev2.preventDefault();
									ev2.stopPropagation();
								}, this));

					targ		.on("dragcancel.pin dragend.pin", _.bind(function(ev2) {
									if(bottom_indicator_was_hidden) {
										this.element.pane("set_percentage", 0, 1);
									}
									clear_drag_info.call(this);
								}, this));
				}, this));
				this.pinned.on("close", _.bind(function(event) {
					$(event.target).column("destroy").remove();
					if($(".col", this.pinned).size() === 0) {
						this.element.pane("set_percentage", 0, 1);
					}
				}, this));

				$(window).on("keydown.editor_undo_redo", _.bind(function (event) {
					if (event.keyCode === 90 && (event.metaKey || event.ctrlKey)) {
						if (event.shiftKey) { this.redo(); }
						else { this.undo(); }
						event.stopPropagation();
						event.preventDefault();
					}
				}, this));
				this.component_list = $("<div>").appendTo(this.element).component_list({info_servers: info_servers}).hide();
			}
		},
	
		undo: function() {
			this.client_socket.post_command("undo");
		},
		redo: function() {
			this.client_socket.post_command("redo");
		},
		toggle_components: function() {
			this.component_list.show();
		},

		on_unload: function() {
			if(this.navigator) {
				this.navigator.navigator("destroy");
			}
			if(this.menu) {
				this.menu.menu("destroy").remove();
			}
			if(this.client_socket) {
				this.client_socket.destroy();
			}
			delete this.client_socket;
			delete this.navigator;
			delete this.menu;
		},

		_destroy: function () {
			this._super();
			if(this.navigator) {
				this.navigator.off("command.do_action");
			}
			this.on_unload();
			if(this.option("upload_usage")) {
				this.element.off("command.upload child_select.upload header_click.upload");
			}
			$(window)	.off("beforeunload.close_editor")
						.off("keydown.editor_undo_redo");
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "anotations") {
				this.navigator.navigator("option", key, value);
			}
		}
	});
	*/
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
		},
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
	};
}(interstate, jQuery));
