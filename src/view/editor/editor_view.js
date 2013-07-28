/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var display;
    var platform = window.navigator.platform;

	var to_func = function (value) {
		return function () { return value; };
	};

	if(platform === "iPhone" || platform === "iPod") {
		display = "phone";
	} else if(platform === "iPad") {
		display = "tablet";
	} else {
		display = "desktop";
	}

	$.widget("red.editor", {
		options: {
			debug_ready: false,
			full_window: true,
			server_window: window.opener,
			client_id: "",
			single_col_navigation: display === "phone" || display === "tablet",
			view_type: display,
			annotations: {}
		},

		_create: function () {
			this.element.addClass(this.option("view_type"))
						.attr({
							id: "editor"
						});

			if(this.option("full_window")) {
				$("html").addClass("full_window_editor");
			}
			var communication_mechanism;
			if(this.option("server_window") === window) {
				communication_mechanism = new red.SameWindowCommWrapper(this.option("client_id"), 0); 
			} else {
				communication_mechanism = new red.InterWindowCommWrapper(this.option("server_window"), this.option("client_id")); 
			}

			this.client_socket = new red.ProgramStateClient({
				ready_func: this.option("debug_ready"),
				comm_mechanism: communication_mechanism
			}).on("message", function (data) {
				if (data.type === "color") {
					var color = data.value;
				}
			}, this).on("loaded", function (root_client) {
				this.load_viewer(root_client);
			}, this);

			this.element.text("Loading...");
			$(window).on("beforeunload.close_editor", _.bind(function () {
				this.on_unload();
			}, this));
		},

		get_client_socket: function() {
			return this.client_socket;
		},

		load_viewer: function (root_client) {
			this.element.html("");
			this.menu = $("<div />").menu({
										title: "menu",
										items: {
											"Undo": {
												on_select: _.bind(this.undo, this)
											},
											"Redo": {
												on_select: _.bind(this.redo, this)
											},
											"Export": {
												on_select: _.bind(this["export"], this)
											}
										}
									})
									.appendTo(this.element);
									/*
			this.reset_button = $("<a />")	.addClass("reset button")
											.text("Reset")
											.appendTo(this.menu)
											.attr("href", "javascript:void(0)")
											.on("click", $.proxy(this.reset, this));
											*/
											

			this.navigator = $("<div />")	.appendTo(this.element)
											.navigator({
												root_client: root_client,
												single_col: this.option("single_col_navigation")
											})
											.on("command.do_action", _.bind(this.on_command, this));


			$(window).on("keydown.editor_undo_redo", _.bind(function (event) {
				if (event.keyCode === 90 && (event.metaKey || event.ctrlKey)) {
					if (event.shiftKey) { this.redo(); }
					else { this.undo(); }
					event.stopPropagation();
					event.preventDefault();
				}/* else if(event.keyCode === 82 && (event.metaKey || event.ctrlKey)) { // 'r': prevent refresh
					event.stopPropagation();
					event.preventDefault();
				}*/
			}, this));
		},

		"export": function() {
			this.client_socket.post_command("export");
		},

		upload: function() {
		},
		save: function() {
		},
		save_as: function() {
		},
		open: function() {
		},

	
		on_command: function(event) {
			var type = event.command_type;
			var client, name, value, command, state, transition, statechart_puppet_id, parent_puppet_id;

			if(type === "add_property") {
				client = event.client;
				var prop_type;
				if(client.type() === "dict") {
					prop_type = "stateful_obj";
				} else {
					prop_type = "stateful_prop";
				}

				if(prop_type === "stateful_obj") {
					value = new red.StatefulObj(undefined, true);
					value.do_initialize({
						direct_protos: new red.StatefulProp({ can_inherit: false, statechart_parent: value })
					});
				} else if(prop_type === "stateful_prop") {
					value = new red.StatefulProp();
				}

				command = new red.SetPropCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					value: value,
					index: 0
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;

					value.destroy();
					value = null;
				});
			} else if(type === "rename") {
				client = event.client;
				command = new red.RenamePropCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					from: event.from_name,
					to: event.to_name
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "inherit") {
				client = event.client;
				value = event.value;
				var prop_name = event.name;

				command = new red.InheritPropCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					name: prop_name,
					value: { id: to_func(value.obj_id) }
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "unset") {
				client = event.client;
				command = new red.UnsetPropCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					name: event.name
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "set_stateful_prop_for_state") {
				client = event.prop;
				state = event.state;
				value = new red.Cell({str: ''});

				command = new red.SetStatefulPropValueCommand({
					in_effect: true,
					stateful_prop: { id: to_func(client.obj_id) },
					state: { id: to_func(state.cobj_id) },
					value: value
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
					value.destroy();
					value = null;
				});
			} else if(type === "unset_stateful_prop_for_state") {
				client = event.prop;
				state = event.state;

				command = new red.UnsetStatefulPropValueCommand({
					in_effect: true,
					stateful_prop: { id: to_func(client.obj_id) },
					state: { id: to_func(state.cobj_id) }
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "set_str") {
				client = event.client;
				value = event.str;

				command = new red.ChangeCellCommand({
					in_effect: true,
					cell: { id: to_func(client.cobj_id || client.obj_id) },
					str: value
				});
				this.client_socket.post_command(command, function() {
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

				command = new red.AddStateCommand({
					in_effect: true,
					statechart: { id: to_func(statechart_puppet_id) },
					name: state_name,
					make_start: make_start
				});

				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "remove_state") {
				state = event.state;
				name = state.get_name("parent");
				parent_puppet_id = state.parent().puppet_master_id || state.parent().id();
				command = new red.RemoveStateCommand({
					in_effect: true,
					statechart: { id: to_func(parent_puppet_id) },
					name: name
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "remove_transition") {
				transition = event.transition;
				var statechart = transition.root();
				command = new red.RemoveTransitionCommand({
					in_effect: true,
					transition: { id: to_func(transition.puppet_master_id || transition.id()) },
					statechart: { id: to_func(statechart.puppet_master_id || transition.id()) }
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "set_type") {
				var to_type = event.type_name;
				name = event.prop_name;
				client = event.client;
				if(to_type === "Object") {
					value = new red.StatefulObj(undefined, true);
					value.do_initialize({
						direct_protos: new red.StatefulProp({ can_inherit: false, statechart_parent: value })
					});
				} else if(to_type === "Property") {
					value = new red.StatefulProp();
				}

				command = new red.SetPropCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					value: value,
					name: name
				});
				this.client_socket.post_command(command, function() {
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
				event = new red.ParsedEvent({str: "(event)", inert: true});
				command = new red.AddTransitionCommand({
					in_effect: true,
					from: { id: to_func(from_puppet_id) },
					to: { id: to_func(to_puppet_id) },
					event: event,
					statechart: { id: to_func(statechart_puppet_id) }
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
					event.destroy();
					event = null;
				});
			} else if(type === "set_transition_to") {
				transition = event.transition;
				state = event.to;
				statechart_puppet_id = state.puppet_master_id || state.id();
				command = new red.SetTransitionToCommand({
					in_effect: true,
					transition: { id: to_func(transition.puppet_master_id || transition.id()) },
					statechart: { id: to_func(statechart_puppet_id) }
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "set_transition_from") {
				transition = event.transition;
				state = event.from;
				statechart_puppet_id = state.puppet_master_id || state.id();
				command = new red.SetTransitionFromCommand({
					in_effect: true,
					transition: { id: to_func(transition.puppet_master_id || transition.id()) },
					statechart: { id: to_func(statechart_puppet_id) }
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if(type === "rename_state") {
				state = event.state;
				var new_name = event.new_name;
				var old_name = state.get_name("parent");
				parent_puppet_id = state.parent().puppet_master_id || state.parent().id();
				command = new red.RenameStateCommand({
					in_effect: true,
					statechart: { id: to_func(parent_puppet_id) },
					from: old_name,
					to: new_name
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'set_transition_str') {
				transition = event.transition;
				var str = event.str;
				var transition_id = transition.puppet_master_id || transition.id();
				command = new red.SetTransitionEventCommand({
					in_effect: true,
					transition: { id: to_func(transition_id) },
					event: str
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'set_copies') {
				value = event.str;
				client = event.client;
				command = new red.SetCopiesCommand({
					in_effect: true,
					parent: { id: to_func(client.obj_id) },
					value: value
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'reset') {
				client = event.client;
				command = new red.ResetCommand({
					in_effect: true,
					parent: { id: to_func(client.cobj_id) }
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'make_concurrent') {
				state = event.state;
				var state_puppet_id = state.puppet_master_id || state.id();
				command = new red.MakeConcurrentCommand({
					in_effect: true,
					statechart: { id: to_func(state_puppet_id) },
					concurrent: event.concurrent
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else if (type === 'move_prop') {
				var from_obj = event.from_obj;
				var from_name = event.from_name;
				var target_obj = event.target_obj;
				var target_name = event.target_name;
				var above_below = event.above_below;

				command = new red.MovePropAboveBelowCommand({
					in_effect: true,
					from_obj: { id: to_func(from_obj.obj_id) },
					from_name: from_name,
					target_obj: { id: to_func(target_obj.obj_id) },
					target_name: target_name,
					above_below: above_below
				});
				this.client_socket.post_command(command, function() {
					command.destroy();
					command = null;
				});
			} else {
				console.log("Unhandled type " + type);
			}
		},

		undo: function() {
			this.client_socket.post_command("undo");
		},
		redo: function() {
			this.client_socket.post_command("redo");
		},
		reset: function() {
			this.client_socket.post_command("reset");
		},

		on_unload: function() {
			this.navigator.navigator("destroy");
			this.menu.menu("destroy").remove();
			this.client_socket.destroy();
			delete this.client_socket;
			delete this.navigator;
			delete this.menu;
		},

		_destroy: function () {
			this._super();
			this.navigator.off("command.do_action");
			this.on_unload();
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
}(red, jQuery));
