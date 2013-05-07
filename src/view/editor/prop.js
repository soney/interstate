/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	
	var insert_at = function (child_node, parent_node, index) {
		var children = parent_node.childNodes;
		if (children.length <= index) {
			parent_node.appendChild(child_node);
		} else {
			var before_child = children[index];
			parent_node.insertBefore(child_node, before_child);
		}
	};
	var remove = function (child_node) {
		var parent_node = child_node.parentNode;
		if (parent_node) {
			parent_node.removeChild(child_node);
		}
	};
	var move = function (child_node, from_index, to_index) {
		var parent_node = child_node.parentNode;
		if (parent_node) {
			if (from_index < to_index) { //If it's less than the index we're inserting at...
				to_index += 1; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
			}
			insert_at(child_node, parent_node, to_index);
		}
	};

	$.widget("red.prop", {
		options: {
			name: "",
			value: false,
			inherited: false,
			layout_manager: false,
			show_src: false
		},

		_create: function() {
			this.element.addClass("child");

			this.name_disp = $("<td />")	.addClass("name")
											.appendTo(this.element)
											.attr("colspan", "2")
											.text(this.option("name"));

			this.value_summary = $("<td />")	.appendTo(this.element)
												.value_summary({ value: this.option("value") })
												.addClass("value_summary val_col");

			if(this.option("inherited")) {
				this.element.addClass("inherited");
			}
			this.element.on("click touchstart", $.proxy(this.on_click, this));
			if(this.option("show_src")) {
				this.on_show_src();
			} else {
				this.on_hide_src();
			}
		},

		_destroy: function() {
			this._super();
		},

		on_click: function(event) {
			event.stopPropagation();
			event.preventDefault();
			if(this.element.not(".selected")) {
				this.element.trigger("select");
			}
		},
		on_select: function() {
			this.element.addClass("selected");
		},
		on_deselect: function() {
			this.element.removeClass("selected");
		},
		on_show_src: function() {
			this.src_cell = $("<td />")	.addClass("src")
										.appendTo(this.element);

			var value = this.option("value");
			if(value instanceof red.WrapperClient && value.type() === "stateful_prop") {
				var layout_manager = this.option("layout_manager");
				if(layout_manager) {
					var client = value;
					var $states = client.get_$("get_states");
					var $values = client.get_$("get_values");
					var $active_value = client.get_$("active_value");
					this.live_prop_vals_fn = cjs.liven(function() {
						var values = $values.get();
						var states = $states.get();
						var active_value = $active_value.get();

						this.src_cell.children().remove();

						_.each(states, function(state) {
							if(state) {
								var view = $("<span />").unset_prop({
									left: layout_manager.get_x(state)
								});
								view.appendTo(this.src_cell);
							}
						}, this);

						_.each(values, function(value_info) {
							var value = value_info.value,
								state = value_info.state;

							var active = active_value && active_value.value === value && value !== undefined;
							if(state) {
								var view = $("<span />").prop_cell({
									left: layout_manager.get_x(state),
									width: layout_manager.get_width(state),
									value: value,
									active: active
								});
								view.appendTo(this.src_cell);
							}
						}, this);
					}, {
						context: this
					});
				}
			}
		},
		on_hide_src: function() {
			if(this.src_cell) {
				this.src_cell.remove();
				delete this.src_cell;
			}
			if(this.live_prop_vals_fn) {
				this.live_prop_vals_fn.destroy();
				delete this.live_prop_vals_fn;
			}
		},
		_setOption: function(key, value) {
			this._super(key, value);
			if(key === "show_src") {
				if(value) {
					this.on_show_src();
				} else {
					this.on_hide_src();
				}
			} else if(key === "layout_manager") {
				if(this.option("show_src")) {
					this.on_hide_src();
					this.on_show_src();
				}
			}
		}
	});
}(red, jQuery));
