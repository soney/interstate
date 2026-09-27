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
			"{{#if columns.length()>0}}" +
				// (Drag it, click it to step through sizes, or use the arrow keys)
				"<div class='resize_bar' data-cjs-on-mousedown=beginResize data-cjs-on-keydown=resizeKey tabindex='0' role='separator' aria-orientation='horizontal' aria-label='Height of pinned objects' aria-valuemin='0' aria-valuemax='100' aria-valuenow='50' />" +
			"{{/if}}" +
			"<div class='pinned_cols'>" +
				"{{#each columns}}" +
					"{{> col getColumnOptions(this, @index) }}" +
				"{{/each}}" +
			"</div>" +
		"{{/if}}"
	);

	// Whether what's being dragged (see the editor's getDraggingClientConstraint) can be pinned: a
	// column (true) or the row of a property whose value is an object (that object's client)
	ist.can_pin = function(dragging) {
		return dragging === true ||
				(dragging instanceof ist.WrapperClient && (dragging.type() === "dict" || dragging.type() === "stateful"));
	};

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
			root_client: false,
			columns: false
		},
		_create: function() {
			this.$columns = this.option("columns");
			this.$dragging = this.option("editor").getDraggingClientConstraint();

			this.$show_instructions = cjs(function() {
				return this.$columns.length() === 0 && ist.can_pin(this.$dragging.get());
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
				show_instructions: this.$show_instructions,
				beginResize: _.bind(function(event) {
					var origY = event.clientY,
						moved = false;

					$(window).on("mousemove.resize_pinned", _.bind(function(e) {
						moved = moved || Math.abs(e.clientY - origY) > 3;
						var event = new $.Event("resize_pinned");
						event.clientY = e.clientY;

						this.element.trigger(event);

					}, this)).on("mouseup.resize_pinned", _.bind(function(e) {
						$(window).off(".resize_pinned");
						if(!moved) {
							// Clicking (rather than dragging) steps through a few sizes
							var pct = this._get_height_pct();
							this._set_height_pct(pct < 0.35 ? 0.5 : (pct < 0.65 ? 0.75 : 0.25));
						} else {
							this._update_resize_bar();
						}
					}, this));
					event.preventDefault();
					event.stopPropagation();
				}, this),
				resizeKey: _.bind(function(event) {
					var step = event.key === "ArrowUp" ? 0.05 : (event.key === "ArrowDown" ? -0.05 : 0);
					if(step) {
						this._set_height_pct(Math.min(0.85, Math.max(0.15, this._get_height_pct() + step)));
						event.preventDefault();
					}
				}, this)
			}, this.element);
		},

		_remove_content_bindings: function() {
			cjs.destroyTemplate(this.element);
		},
		// How much of the editor's height (below the objects' columns) pinned objects take up
		_get_height_pct: function() {
			var pinned_height = this.element.outerHeight(),
				nav_height = $("#obj_nav").outerHeight() || 0;
			return pinned_height + nav_height > 0 ? pinned_height / (pinned_height + nav_height) : 0.5;
		},
		_set_height_pct: function(pct) {
			var event = new $.Event("resize_pinned");
			event.height_pct = pct;
			this.element.trigger(event);
			this._update_resize_bar();
		},
		_update_resize_bar: function() {
			_.defer(_.bind(function() {
				$("> .resize_bar", this.element).attr("aria-valuenow", String(Math.round(100 * this._get_height_pct())));
			}, this));
		},

		_add_class_bindings: function() {
			this.element.attr({ id: "pinned", role: "region", "aria-label": "Pinned objects" });
			this._height_binding = cjs.bindCSS(this.element, "height", this.option("height").add("px"));
		},

		_remove_class_bindings: function() {
			this._height_binding.destroy();
			this.element.attr("id", "").removeAttr("role aria-label");
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
