(function(red, $) {
var cjs = red.cjs, _ = cjs._;
}(red, jQuery));
/*
(function(Euclase) {
var array_utils = Euclase._array_utils;
$.widget(
"euc.euc_cell_view",
{
	// default options
	options: {
		cell: null,
		debug: false,
		parent_update_queue: Euclase._update_queue
	},
	_create: function() {
		var self = this,
			options = self.options,
			element = self.element,
			cell = options.cell;
		

		if(cell.update_queue!=null) {
			self.option("parent_update_queue", cell.update_queue);
		}

		self.update_queue = options.parent_update_queue.add_queue({type: "Cell", element: element});

		var king_cell = null;
		if(Euclase.environment) {
			king_cell = $("div#king_cell");
		}

		self.display = $("<div />")	.addClass("cell_display")
									.appendTo(element)
									.editablelabel({
										manualValueChange: true,
										defaultValue: cell.attr("default_display"),
										otherClickables: "#king_cell",
										charLimit: 10
									});
		self.display.bind("valuechange", function(event) {
			var old_value = event.oldValue,
				new_value = event.newValue;
			if(Euclase.environment) {
				Euclase.environment.command("change_cell", {cell: cell, new_value: new_value, old_value: old_value});
			}
			else {
				cell.option("text", new_value);
			}
		});
		self.display.bind("startedediting", function(event) {
			if(king_cell) {
				king_cell.euc_environment_king_cell("option", {
					"editingCell": element
				});
			}
		});
		self.display.bind("stoppedediting", function(event) {
			if(king_cell) {
				king_cell.euc_environment_king_cell("option", {
					"editingCell": null
				});
			}
		});

		self.update_queue.add(function() {
			self.display.editablelabel("option", {value: cell.attr("text"), defaultValue: cell.attr("default_display")});
		}, {name: "Update cell text", object: cell});

		self.update_queue.add(function() {
			var errors = cell.attr("errors");
			if(errors == null) errors = [];
			self._set_errors(errors);
		}, {name: "Update cell errors", object: cell});
	},
	destroy: function() {
		var self = this,
			options = self.options;

		options.parent_update_queue.remove(self.update_queue);
		$.Widget.prototype.destroy.apply(self, arguments); // default destroy
		self.display.editablelabel("destroy");
		self.display.remove();
	},
	_set_errors: function(errors) {
		var self = this;

		if(errors.length == 0) {
			self.display.removeClass("error");
		}
		else {
			self.display.addClass("error");
		}
	},
	accept: function() {
		this.display.editablelabel("confirmValue");
	},
	cancel: function() {
		this.display.editablelabel("cancel");
	}

});
})(Euclase);
*/
