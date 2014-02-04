/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var pinned_template = cjs.createTemplate(
		"{{#if show_instructions}}" +
			"<div class='instructions'>" +
				"Drop here to pin" +
			"</div>" +
		"{{#else}}" +
			"<div class='pinned_cols'>" +
				"{{#each columns}}" +
					"{{> col getColumnOptions(this, @index) }}" +
				"{{/each}}" +
			"</div>" +
		"{{/if}}"
	);

	cjs.registerCustomPartial("pinned", {
		createNode: function(options) {
			return $("<div />").pinned(options);
		},
		destroyNode: function(node) {
			$(node).pinned("destroy");
		},
		onAdd: function(node, options) {
			if(!$(node).data("interstate-pinned")) {
				$(node).pinned(options);
			}
		},
		onRemove: function(node) {
			$(node).pinned("destroy");
		}
	});

	$.widget("interstate.pinned", {
		options: {
			single_col: false,
			client_socket: false,
			editor: false,
			root_client: false
		},
		_create: function() {
			this.$columns = cjs([this.option("root_client")]);
			this.$dragging = this.option("editor").getDraggingClientConstraint();

			this.$show_instructions = cjs(function() {
				if(this.$columns.length() === 0) {
					return this.$dragging.get();
				}
				return false;
			}, {context: this});

			this.element.on("child_select.nav", _.bind(this.on_child_select, this))
						.on("close_column.nav", _.bind(this.on_close_col, this))
						.on("prev_column.nav", _.bind(this.on_prev_col, this))
						.on("open_cobj.nav", _.bind(this.open_cobj, this));

			this._add_content_bindings();
			this._add_class_bindings();
			this._add_destroy_check();
			this.element.on("dragover", _.bind(this.dragoverComponent, this))
						.on("dragout", _.bind(this.dragoutComponent, this))
						.on("dragenter", _.bind(this.dragEnterComponent, this))
						.on("dragleave", _.bind(this.dragLeaveComponent, this));
		},
		_destroy: function() {
			this.element.off(".nav");

			this._remove_class_bindings();
			this._remove_content_bindings();
			this._remove_destroy_check();

			this._super();
		},
		_setOption: function(key, value) {
			this._super(key, value);
		},
		_add_content_bindings: function() {
			var client_socket = this.option("client_socket");
			pinned_template({
				columns: this.$columns,
				getColumnOptions: _.bind(function(client, index) {
					return {
						client: client,
						client_socket: client_socket,
						is_curr_col: cjs(true),
						editor: this.option("editor"),
						pinned: true
					};
				}, this),
				show_instructions: this.$show_instructions 
			}, this.element);
		},

		_remove_content_bindings: function() {
			cjs.destroyTemplate(this.element);
		},

		_add_class_bindings: function() {
			this.element.attr("id", "pinned");
		},

		_remove_class_bindings: function() {
			this.element.attr("id", "");
		},
		_add_destroy_check: function() {
			var old_cols = [],
				ondestroy = _.bind(function(client) {
					var index = this.$columns.indexOf(client);
					this.$columns.splice(index, this.$columns.length()-index);
				}, this);

			this._destroy_check_fn = cjs.liven(function() {
				_.each(old_cols, function(c) {
					c.off('begin_destroy', ondestroy);
				}, this);
				var cols = this.$columns.toArray();
				_.each(cols, function(c) {
					c.on('begin_destroy', ondestroy);
				}, this);
				old_cols = cols;
			}, {
				context: this
			});
		},
		_remove_destroy_check: function() {
			this._destroy_check_fn.destroy();
		},

		on_child_select: function(event, child) {
			if(child instanceof ist.WrapperClient && (child.type() === "dict" || child.type() === "stateful")) {
				var column_index = $(event.target).index();
				if(column_index >= 0) {
					this.$columns.splice(column_index, 1, child);
				}
			}
		},
		on_close_col: function(event) {
			var column_index = $(event.target).index();
			if(column_index >= 0) {
				this.$columns.splice(column_index, 1);
			}
		},
		on_prev_col: function(event) {
			var client = $(event.target).column("option", "client"),
				column_index = $(event.target).index();
			if(column_index >= 0) {
				var client_socket = this.option("client_socket"),
					cobj_id = client.cobj_id;

				client_socket.once("get_ptr_response", function(message) {
					if(message.cobj_id === cobj_id) {
						var cobjs = message.cobjs;
						if(cobjs.length > 1) {
							var wrapper_client = client_socket.get_wrapper_client(cobjs[cobjs.length-2]);
							this.$columns.splice(column_index, 1, wrapper_client);
						}
					}
				}, this);
				client_socket.post({type: "get_ptr", cobj_id: cobj_id});
			}
		},

		addClient: function(client) {
			this.$columns.unshift(client);
		},
		open_cobj: function(event) {
			var column_index = $(event.target).parents(".col").index();
			if(column_index >= 0) {
				var client_socket = this.option("client_socket"),
					cobj_id = event.cobj_id;
				client_socket.once("get_ptr_response", function(message) {
					if(message.cobj_id === cobj_id) {
						var cobjs = message.cobjs,
							wrapper_client = client_socket.get_wrapper_client(cobjs[cobjs.length-1]);
						this.$columns.splice(column_index, 1, wrapper_client);
					}
				}, this);
				client_socket.post({type: "get_ptr", cobj_id: cobj_id});
			}
		},


		dragoverComponent: _.bind(function(event) {
			event.preventDefault();
			event.stopPropagation();
			return false;
		}, this),
		dragoutComponent: _.bind(function(event) {
			event.preventDefault();
			event.stopPropagation();
			return false;
		}, this),
		dragEnterComponent: _.bind(function(event) {
			event.preventDefault();
			event.stopPropagation();
			return false;
		}, this),
		dragLeaveComponent: _.bind(function(event) {
			event.preventDefault();
			event.stopPropagation();
			return false;
		}, this)
	});
}(interstate, jQuery));
