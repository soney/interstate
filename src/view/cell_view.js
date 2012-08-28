(function(red, $) {
var cjs = red.cjs, _ = cjs._;
var state = {
	IDLE: 0
	, EDITING: 1
};

$.widget("red.cell", {
	
	options: {
		cell: undefined
		, immediate_edits: true
		, execute_generated_commands: true
	}

	, _create: function() {
		this._state = state.IDLE;

		var self = this;
		this.element.addClass("cell")
					.on("mousedown.red_cell", function(event) {
						if(self._state === state.IDLE) {
							event.preventDefault();
							event.stopPropagation();
							self._trigger("begin_editing");
						}
					})
					.text(this.option("cell").get_str());
		if(this.option("immediate_edits")) {
			this.element.on("cellbegin_editing.red_cell", function() {
				self.begin_edit();
			});
		}
		if(this.option("execute_generated_commands")) {
			this.element.on("cellcommand.red_cell", function(event, data) {
				var command = data.command;
				command._do();
			});
		}
		this._add_change_listeners(this.option("cell"));
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;
		if(key === "cell") {
			this._remove_change_listeners(old_value);
			this._add_change_listeners(new_value);
		} else if(key === "immediate_edits") {
			if(old_value) {
				this.element.off("cellbegin_editing.red_cell");
			}
			if(new_value) {
				this.element.on("cellbegin_editing.red_cell", function() {
					self.begin_edit();
				});
			}
		} else if(key === "execute_generated_commands") {
			if(old_value) {
				this.element.off("cellcommand.red_cell");
			}
			if(new_value) {
				this.element.on("cellcommand.red_cell", function(event, command) {
					command._do();
				});
			}
		}

		this._super(key, value);
	}

	, _get_set_cell_command: function(str) {
		var command = red.command("change_cell", {
			cell: this.option("cell")
			, str: str
		});

		return command;
	}
	
	, _destroy: function() {
		this.element.removeClass("cell")
					.off("click.red_cell")
					.off("cellset_cell_command.red_cell")
					.off("cellbegin_editing.red_cell");
		if(this._live_updater) {
			this._live_updater.destroy();
		}
	}

	, begin_edit: function() {
		if(this._state === state.IDLE) {
			this._state = state.EDITING;

			this._before_editing_value = this.option("cell").get_str();
			this.element.html("")
						.addClass("editing");

			this._edit_input = $("<input type='text' />")	.appendTo(this.element)
															.attr("value", this._before_editing_value)
															.select()
															.focus();
			var self = this;
			$(window).on("keydown.red_cell", function(event) {
				if(event.which === 27) { //Esc
					self.cancel_changes();
				} else if(event.which === 13) { //Enter
					self.commit_changes();
				}
			});
		}
	}

	, cancel_changes: function() {
		if(this._state === state.EDITING) {
			this._state = state.IDLE;
			$(window).off("keydown.red_cell");
			this._edit_input.remove();
			this.element.text(this._before_editing_value)
						.removeClass("editing");
		}
	}

	, commit_changes: function(value) {
		if(this._state === state.EDITING) {
			this._state = state.IDLE;
			$(window).off("keydown.red_cell");
			value = value || this._edit_input.attr("value");
			this._edit_input.remove();
			this.element.removeClass("editing");

			var command = this._get_set_cell_command(value);
			this._trigger("command", null, {
				command: command
			});
		}
	}

	, _add_change_listeners: function(cell) {
		cell = cell || this.option("cell");
		var self = this;
		this._live_updater = cjs.liven(function() {
			var cell_str = cell.get_str();
			self.element.text(cell_str);
		});
	}

	, _remove_change_listeners: function(cell) {
		cell = cell || this.option("cell");
		this._live_updater.destroy();
		delete this._live_updater;
	}

});

}(red, jQuery));
