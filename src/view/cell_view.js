(function(red, $) {
var cjs = red.cjs, _ = cjs._;
var state = {
	IDLE: 0
	, EDITING: 1
};

$.widget("red.cell", {
	
	options: {
		cell: undefined
		, execute_generated_commands: true
	}

	, _create: function() {
		this._state = state.IDLE;

		var self = this;
		this.element.addClass("cell")
					.editable({str: this.option("cell").get_str()});

		this.element.on("editablesetstr.red_cell", function(event, data) {
			event.stopPropagation();
			var str = data.value;
			var command = self._get_set_cell_command(str);
			self._trigger("command", null, {
				command: command
			});
			if(self.option("execute_generated_commands")) {
				command._do();
			}
		});
		//_.defer(_.bind(this._add_change_listeners, this, this.option("cell")));
		this._add_change_listeners(this.option("cell"));
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;
		if(key === "cell") {
			this._remove_change_listeners(old_value);
			this._add_change_listeners(new_value);
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
		if(this._live_updater) {
			this._live_updater.destroy();
		}
		this.element.removeClass("cell")
					.editable("destroy")
					.off("click.red_cell")
					.off("cellset_cell_command.red_cell")
					.off("cellbegin_editing.red_cell");
	}

	, _add_change_listeners: function(cell) {
		cell = cell || this.option("cell");
		var self = this;
		this._live_updater = cjs.liven(function() {
			var cell_str = cell.get_str();
			self.element.editable("option", "str", cell_str);
		});
	}

	, _remove_change_listeners: function(cell) {
		cell = cell || this.option("cell");
		this._live_updater.destroy();
		delete this._live_updater;
	}

});

}(red, jQuery));
