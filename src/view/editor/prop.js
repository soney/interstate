/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael,RedMap */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var prop_template = cjs.createTemplate(
		"<td class='name'>" +
			"{{#fsm name_edit_state}}" +
				"{{#state idle}}" +
					"<span>{{ prop_name }}</span>" +
				"{{#state editing}}" +
					"<textarea cjs-on-blur=on_edit_blur cjs-on-keydown=on_edit_keydown />" +
			"{{/fsm}}" +
		"</td>" +
		"{{> valueSummary getValueSummaryOptions() }}"  +
		"{{#if show_src}}" +
			"{{#if type==='stateful_prop'}}" +
				"<td class='stateful_prop src'>" +
					"{{#each propValues}}" +
						"{{> propCell getPropCellOptions(@key) }}" +
					"{{/each}}" +
				"</td>" +
			"{{#elif type==='cell'}}" +
				"<td class='src'>" +
					"{{> propCell getPurePropCellOptions() }}" +
				"</td>" +
			"{{#else}}" +
				"<td class='cannot_modify src' />" +
			"{{/if}}" +
		"{{/if}}"
	);
	$.widget("interstate.prop", {
		options: {
			name: "",
			value: false,
			inherited: false,
			builtin: false,
			layout_manager: false,
			show_src: false,
			obj: false,
			client_socket: false
		},

		_create: function() {
			var client = this.option("value");

			this.$prop_name = cjs(this.option("name"));
			this.$inherited = cjs(this.option("inherited"));
			this.$show_src  = cjs(this.option("show_src"));
			this.$selected  = cjs(false);

			this.$type = cjs(function() {
				if(client instanceof ist.WrapperClient) {
					return client.type();
				} else {
					return "";
				}
			});

			this.name_edit_state = cjs	.fsm("idle", "editing")
										.startsAt("idle");

			this.element.on("click.expand", _.bind(this._trigger_expand, this));

			this._create_state_map();
			this._add_content_bindings();
			this._add_class_bindings();
		},
		_destroy: function() {
			this._super();
			this._remove_content_bindings();
			this._remove_class_bindings();
			this._destroy_state_map();
		},

		_create_state_map: function() {
			var client = this.option("value");
			if(client instanceof ist.WrapperClient && client.type() === "stateful_prop") {
				this.$states = client.get_$("get_states");
				this.$values = client.get_$("get_values");
				this.$active_value = client.get_$("active_value");

				this.$prop_values = cjs.map({});
				var old_keys = [],
					old_vals = [];
				cjs.liven(function() {
					var keys = this.$states.get() || [],
						vals = this.$values.get() || [],
						indexed_vals = [];

					_.each(keys, function(key, i) {
						indexed_vals[i] = undefined;
					});

					_.each(vals, function(val) {
						var key_index = keys.indexOf(val.state);
						indexed_vals[key_index] = val;
					}, this);

					var map_diff = ist.get_map_diff(old_keys, keys, old_vals, indexed_vals);

					_.each(map_diff.set, function(info) {
						this.$prop_values.put(info.key, info.value, info.index)
					}, this);
					_.each(map_diff.value_change, function(info) {
						var key = keys[info.index];
						this.$prop_values.put(key, info.to);
					}, this);
					_.each(map_diff.key_change, function(info) {
						this.$prop_values.rename(info.from, info.to);
					}, this);
					_.each(map_diff.moved, function(info) {
						this.$prop_values.move(info.key, info.to);
					}, this);
					_.each(map_diff.unset, function(info) {
						this.$prop_values.remove(info.key);
					}, this);

					old_keys = keys;
					old_vals = indexed_vals;
				}, {
					context: this
				});
			}
		},
		_destroy_state_map: function() {
			if(this.$states) {
				this.$states.destroy();
				this.$values.destroy();
				this.$active_value.destroy();
				this.$prop_values.destroy();
			}
		},

		_add_content_bindings: function() {
			var layout_manager = this.option("layout_manager");
			prop_template({
				prop_name: this.$prop_name,
				name_edit_state: this.name_edit_state,
				getValueSummaryOptions: _.bind(function() {
					return {
						value: this.option("value")
					};
				}, this),
				getPurePropCellOptions: _.bind(function() {
					return { pure: true, value: this.option("value") };
				}, this),
				getPropCellOptions: _.bind(function(key) {
					var value = this.$prop_values.get(key),
						left = function() {
							return layout_manager.get_x(key);
						},
						width = function() {
							return value ? layout_manager.get_width(key) : 7;
						};

					// top fifty bad lines of code I've ever written: `value: value ? value.value : value`
					return { value: value ? value.value : value, left: left, width: width };
				}, this),
				show_src: this.$show_src,
				value: this.option("value"),
				type: this.$type,
				propValues: this.$prop_values 
			}, this.element);
		},

		_remove_content_bindings: function() {
		},

		_add_class_bindings: function() {
			this._class_binding = cjs.bindClass(this.element, "child",
									this.$selected.iif("selected", ""),
									this.$inherited.iif("inherited", ""));
		},

		_remove_class_bindings: function() {
			this._class_binding.destroy();
		},

		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "name") {
				this.$prop_name.set(value);
			} else if(key === "inherited") {
				this.$inherited.set(value);
			} else if(key === "show_src") {
				this.$show_src.set(value);
			}
		},

		_trigger_expand: function(event) {
			event.stopPropagation();
			event.preventDefault();
			if(this.element.not(".selected")) {
				this.element.trigger("expand");
			}
		},

		on_select: function() { this.$selected.set(true); },
		on_deselect: function() { this.$selected.set(false); },
		begin_rename: function() {
		}
	});
}(interstate, jQuery));
