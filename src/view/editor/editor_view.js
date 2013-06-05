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
			this.$on_command = $.proxy(this.on_command, this);
			this.element.addClass(this.option("view_type"))
						.attr({
							id: "editor"
						});

			if(this.option("full_window")) {
				$("html").addClass("full_window_editor");
			}
			var communication_mechanism;
			if(this.option("server_window") === window) {
				communication_mechanism = new red.SameWindowCommWrapper(this.option("client_id")); 
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
			$(window).on("beforeunload", _.bind(function () {
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
											"Reset": {
												on_select: _.bind(this.reset, this),
												disabled: true
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
											.on("command", this.$on_command);


			$(window).on("keydown", _.bind(function (event) {
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
					value = red.create("stateful_obj", undefined, true);
					value.do_initialize({
						direct_protos: red.create("stateful_prop", { can_inherit: false, statechart_parent: value })
					});
				} else if(prop_type === "stateful_prop") {
					value = red.create('stateful_prop');
				}

				command = new red.SetPropCommand({
					parent: { id: to_func(client.obj_id) },
					value: value,
					index: 0
				});
				this.client_socket.post_command(command);
			} else if(type === "rename") {
				client = event.client;
				command = new red.RenamePropCommand({
					parent: { id: to_func(client.obj_id) },
					from: event.from_name,
					to: event.to_name
				});
				this.client_socket.post_command(command);
			} else if(type === "inherit") {
				client = event.client;
				value = event.value;
				var prop_name = event.name;

				command = new red.InheritPropCommand({
					parent: { id: to_func(client.obj_id) },
					name: prop_name,
					value: { id: to_func(value.obj_id) }
				});
				this.client_socket.post_command(command);
			} else if(type === "unset") {
				client = event.client;
				command = new red.UnsetPropCommand({
					parent: { id: to_func(client.obj_id) },
					name: event.name
				});
				this.client_socket.post_command(command);
			} else if(type === "set_stateful_prop_for_state") {
				client = event.prop;
				state = event.state;
				value = red.create('cell', {str: ''});

				command = new red.SetStatefulPropValueCommand({
					stateful_prop: { id: to_func(client.obj_id) },
					state: { id: to_func(state.cobj_id) },
					value: value
				});
				this.client_socket.post_command(command);
			} else if(type === "unset_stateful_prop_for_state") {
				client = event.prop;
				state = event.state;

				command = new red.UnsetStatefulPropValueCommand({
					stateful_prop: { id: to_func(client.obj_id) },
					state: { id: to_func(state.cobj_id) }
				});
				this.client_socket.post_command(command);
			} else if(type === "set_str") {
				client = event.client;
				value = event.str;

				command = new red.ChangeCellCommand({
					cell: { id: to_func(client.cobj_id || client.obj_id) },
					str: value
				});
				this.client_socket.post_command(command);
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
					statechart: { id: to_func(statechart_puppet_id) },
					name: state_name,
					make_start: make_start
				});

				this.client_socket.post_command(command);
			} else if(type === "remove_state") {
				state = event.state;
				name = state.get_name("parent");
				parent_puppet_id = state.parent().puppet_master_id || state.parent().id();
				command = new red.RemoveStateCommand({
					statechart: { id: to_func(parent_puppet_id) },
					name: name
				});
				this.client_socket.post_command(command);
			} else if(type === "remove_transition") {
				transition = event.transition;
				var statechart = transition.root();
				command = new red.RemoveTransitionCommand({
					transition: { id: to_func(transition.puppet_master_id || transition.id()) },
					statechart: { id: to_func(statechart.puppet_master_id || transition.id()) }
				});
				this.client_socket.post_command(command);
			} else if(type === "set_type") {
				var to_type = event.type_name;
				name = event.prop_name;
				client = event.client;
				if(to_type === "Object") {
					value = red.create("stateful_obj", undefined, true);
					value.do_initialize({
						direct_protos: red.create("stateful_prop", { can_inherit: false, statechart_parent: value })
					});
				} else if(to_type === "Property") {
					value = red.create('stateful_prop');
				}

				command = new red.SetPropCommand({
					parent: { id: to_func(client.obj_id) },
					value: value,
					name: name
				});
				this.client_socket.post_command(command);
			} else if(type === "add_transition") {
				var from_state = event.from;
				var to_state = event.to;
				state = from_state.root();
				statechart_puppet_id = state.puppet_master_id || state.id();
				var from_puppet_id = from_state.puppet_master_id || from_state.id(),
					to_puppet_id = to_state.puppet_master_id || to_state.id();
				event = red.create_event("parsed", {str: "(event)", inert: true});
				command = new red.AddTransitionCommand({
					from: { id: to_func(from_puppet_id) },
					to: { id: to_func(to_puppet_id) },
					event: event,
					statechart: { id: to_func(statechart_puppet_id) }
				});
				this.client_socket.post_command(command);
			} else if(type === "set_transition_to") {
				transition = event.transition;
				state = event.to;
				command = new red.SetTransitionToCommand({
					transition: transition,
					statechart: state
				});
				this.client_socket.post_command(command);
			} else if(type === "set_transition_from") {
				transition = event.transition;
				state = event.from;
				command = new red.SetTransitionFromCommand({
					transition: transition,
					statechart: state
				});
				this.client_socket.post_command(command);
			} else if(type === "rename_state") {
				state = event.state;
				var new_name = event.new_name;
				var old_name = state.get_name("parent");
				parent_puppet_id = state.parent().puppet_master_id || state.parent().id();
				command = new red.RenameStateCommand({
					statechart: { id: to_func(parent_puppet_id) },
					from: old_name,
					to: new_name
				});
				this.client_socket.post_command(command);
			} else if (type === 'set_transition_str') {
				transition = event.transition;
				var str = event.str;
				var transition_id = transition.puppet_master_id || transition.id();
				command = new red.SetTransitionEventCommand({
					transition: { id: to_func(transition_id) },
					event: str
				});
				this.client_socket.post_command(command);
			} else if (type === 'set_copies') {
				value = event.str;
				client = event.client;
				command = new red.SetCopiesCommand({
					parent: { id: to_func(client.obj_id) },
					value: value
				});
				this.client_socket.post_command(command);
			} else if (type === 'reset') {
				client = event.client;
				command = new red.ResetCommand({
					parent: { id: to_func(client.cobj_id) }
				});
				this.client_socket.post_command(command);
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
		},

		_destroy: function () {
			this.on_unload();
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "anotations") {
				this.navigator.navigator("option", key, value);
			}
		}
	});
}(red, jQuery));
