(function(red, $) {
var cjs = red.cjs, _ = cjs._;
$.widget("red.stateful_prop", {
	options: {
		prop: undefined
		, context: undefined
	}

	, _create: function() {
		this._add_change_listeners();
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		this._super(key, value);
	}

	, _destroy: function() {
		this._remove_change_listeners();
	}


	, _add_change_listeners: function() {
		var prop = this.option("prop");
		var context = this.option("context");
		var propified_context = context.push(prop);
		var self = this;
		this._values_listener = cjs.liven(function() {
			var value_specs = prop.get_value_specs(context);

			var values = _.pluck(value_specs, "value");
			
			self.element.children().each(function() {
				$(this)	.off("click.make_cell")
						.ambiguous("destroy");
			}).remove();

			_.forEach(value_specs, function(value_spec) {
				var value = value_spec.value;
				var state = value_spec.state;

				var view = $("<span />").ambiguous({
					value: value
					, context: propified_context
				});

				if(!value) {
					view.on("click.make_cell", function() {
						var command_event = $.Event("red_command");
						command_event.command = self._get_make_cell_command(state);
						self.element.trigger(command_event);
					});
				}
				self.element.append(view);
			});
		});
	}

	, _remove_change_listeners: function() {
		this._values_listener.destroy();
	}

	, _get_make_cell_command: function(state) {
		return red.command("set_stateful_prop_value", {
			state: state
			, value: cjs.create("red_cell", {str: ""})
			, stateful_prop: this.option("prop")
		});
	}
});

}(red, jQuery));
