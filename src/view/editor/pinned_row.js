/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var navigator_template = cjs.createTemplate(
		"{{#each columns}}" +
			"{{> col getColumnOptions(this, @index) }}" +
		"{{/each}}"
	);

	cjs.registerCustomPartial("pinned_row", {
		createNode: function(options) {
			return $("<div />").pinned_row(options);
		},
		destroyNode: function(node) {
			$(node).navigator("destroy");
		},
		onAdd: function(node, options) {
			if(!$(node).data("interstate-pinned_row")) {
				$(node).pinned_row(options);
			}
		},
		onRemove: function(node) {
			$(node).pinned_row("destroy");
		}
	});

	$.widget("interstate.pinned_row", {
		options: {
			root_client: false,
			single_col: false,
			client_socket: false
		},
		_create: function() {
			this.$columns = cjs([]);

			this.element.on("child_select.nav", _.bind(this.on_child_select, this))
						.on("header_click.nav", _.bind(this.on_header_click, this))
						.on("open_cobj.nav", _.bind(this.open_cobj, this));

			this._add_content_bindings();
			this._add_class_bindings();
			this._add_destroy_check();
		},
		_destroy: function() {
			var client = this.option("root_client");

			this.element.off(".nav");

			this._remove_class_bindings();
			this._remove_content_bindings();
			this._remove_destroy_check();

			client.signal_destroy();

			this._super();
		},
		_setOption: function(key, value) {
			this._super(key, value);
		},
		_add_content_bindings: function() {
			var client_socket = this.option("client_socket");
			navigator_template({
				columns: this.$columns,
				getColumnOptions: _.bind(function(client, index) {
					return {
						client: client,
						client_socket: client_socket,
						is_curr_col: this.$selected_column.eqStrict(client),
						columns: this.$columns,
						column_index: index,
						single_col: true
					};
				}, this)
			}, this.element);
		},

		_remove_content_bindings: function() {
			cjs.destroyTemplate(this.element);
		},

		_add_class_bindings: function() {
			this.element.attr("id", "obj_nav");
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
				var column_index = this.$columns.indexOf(child);
				if(column_index >= 0) {
					this.$columns.splice(column_index, this.$columns.length()-column_index);
				} else {
					var parent_col = $(event.target).column("option", "client");
					column_index = this.$columns.indexOf(parent_col);
					this.$columns.splice(column_index+1, this.$columns.length()-column_index - 1, child);
				}
			} else {
				this.on_header_click(event, $(event.target).column("option", "client"));
			}
		},
		on_header_click: function(event, client) {
			var column_index = this.$columns.indexOf(client);
			if(column_index >= 0) {
				this.$columns.splice(column_index + 1, this.$columns.length()-column_index-1);
			}
		},
		open_cobj: function(event) {
			var client_socket = this.option("client_socket");
			var cobj_id = event.cobj_id;
			client_socket.once("get_ptr_response", function(message) {
				if(message.cobj_id === cobj_id) {
					var cobjs = message.cobjs,
						wrapper_clients = _.map(cobjs, function(cobj) {
							return client_socket.get_wrapper_client(cobj);
						});
					this.$columns.setValue(wrapper_clients);
				}
			}, this);
			client_socket.post({type: "get_ptr", cobj_id: cobj_id});
		}
	});
}(interstate, jQuery));
