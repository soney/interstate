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

	cjs.registerCustomPartial("navigator", {
		createNode: function(options) {
			return $("<div />").navigator(options);
		},
		destroyNode: function(node) {
			$(node).navigator("destroy");
		},
		onAdd: function(node, options) {
			if(!$(node).data("interstate-navigator")) {
				$(node).navigator(options);
			}
		},
		onRemove: function(node) {
			$(node).navigator("destroy");
		}
	});

	$.widget("interstate.navigator", {
		options: {
			root_client: false,
			single_col: false,
			client_socket: false
		},
		_create: function() {
			var client = this.option("root_client");
			client.signal_interest();

			this.$columns = cjs([client]);
			this.$selected_column = this.$columns.itemConstraint(cjs(_.bind(this.$columns.length, this.$columns)).sub(1));

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
						column_index: index
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
			var client_socket = this.option("client_socket"),
				cobj_id = event.cobj_id;
			console.log("open_cobj", cobj_id);
			client_socket.once("cobj_links", function(message) {
				console.log("go5t");
				if(message.cobj_id === cobj_id) {
					var vals = message.value;
					var wrapper_clients = _.map(vals, function(val) {
						return client_socket.get_wrapper_client(val.object_summary);
					}, this);

					this.curr_col.column("option", "is_curr_col", false);
					this.$columns.set(wrapper_clients);
					/*

					var subsequent_columns = this.columns.slice(1);
					_.each(subsequent_columns, function(col) {
						col.column("destroy").remove();
					});
					this.columns.length = 1;
					var len = wrapper_clients.length;
					var next_col = this.columns[0];
					var single_col = this.option("single_col");
					var last_col;
					for(var i = 0; i<len; i++) {
						var wc = wrapper_clients[i];
						var is_last = i===len-1;
						last_col = next_col;
						last_col.column("option", "selected_prop_name", wc.object_summary.name);
						next_col = this.get_column(wc, {
							is_curr_col: is_last,
							prev_col: last_col,
							show_prev: single_col
						});
						if(is_last) {
							next_col.focus();
						}
					}
					this.curr_col = next_col;
					*/
				}
			}, this);
			client_socket.post({type: "get_ptr", cobj_id: cobj_id});
		}
	});
}(interstate, jQuery));
