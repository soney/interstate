(function(red, $) {
var cjs = red.cjs, _ = cjs._;
var state = {
	IDLE: 0
	, EDITING: 1
};

$.widget("red.cell", {
	
	options: {
		cell: undefined
	}

	, _create: function() {
		this._state = state.IDLE;

		var self = this;
		this.element.addClass("cell")
					.editable({str: this.option("cell").get_str()})
					.on("editablesetstr.red_cell", function(event, data) {
						event.stopPropagation();
						var str = data.value;
						var command_event = $.Event("red_command");
						command_event.command = self._get_set_cell_command(str);
						self.element.trigger(command_event);
						event.stopPropagation();
					});
		this._add_change_listeners();
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
		this._remove_change_listeners();
		this.element.removeClass("cell")
					.off("editablesetstr.red_cell")
					.editable("destroy");
	}

	, _add_change_listeners: function() {
		var cell = this.option("cell");
		var self = this;
		this._live_updater = cjs.liven(function() {
			var cell_str = cell.get_str();

			self.element.editable("option", "str", cell_str);
		});
	}

	, _remove_change_listeners: function() {
		this._live_updater.destroy();
		delete this._live_updater;
	}

});

}(red, jQuery));
