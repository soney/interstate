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
			inherited: false
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
			this.element.on("click", $.proxy(this.on_click, this));
		},

		_destroy: function() {
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
		}
	});
}(red, jQuery));
