(function(red, $) {
var cjs = red.cjs, _ = cjs._;

var value_to_text = function(val) {
	if(_.isUndefined(val)) {
		return "(undefined)";
	} else if(_.isNull(val)) {
		return "(null)";
	} else if(_.isNumber(val)) {
		return val + "";
	} else if(_.isString(val)) {
		return '"' + val + '"';
	} else if(val instanceof red.RedStatefulObj) {
		return "(stateful)";
	} else if(val instanceof red.RedDict) {
		return "(dict)";
	} else if(val instanceof red.RedCell) {
		return "(cell)";
	} else if(_.isArray(val)) {
		return "[" + _.map(val, function(v) { return value_to_value_str(v);}).join(", ") + "]";
	} else {
		return "{ " + _.map(val, function(v, k) {
			return k + ": " + value_to_value_str(v);
		}).join(", ") + " }";
	}
};

var state = {
	IDLE: 0
	, CHANGING_NAME: 1
};

$.widget("red.dict_entry", {
	options: {
		dict: undefined
		, context: undefined
		, prop_name: ""
		, execute_generated_commands: true
		, indent: 0
	}

	, _create: function() {
		var my_context = this.option("context");
		var dict = this.option("dict");
		this._prop_name = $("<span />")	.addClass("prop_name")
										.editable({str: this.option("prop_name")})
										.appendTo(this.element);

		this._current_value = $("<span />")	.addClass("current_value")
											.appendTo(this.element);
		this._source_value = $("<span />")	.ambiguous({
												context: my_context.push(dict)
												, indent: this.option("indent")
											})
											.appendTo(this.element);

		var self = this;
		this.element.on("editablesetstr.red_cell", function(event, data) {
			event.stopPropagation();
			var str = data.value;
			var command = self._get_rename_command(str);
			self._trigger("command", null, {
				command: command
			});
			if(self.option("execute_generated_commands")) {
				command._do();
			}
		});

		_.defer(_.bind(this._add_change_listeners, this));
		this._state = state.IDLE;
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		this._super(key, value);
	}

	, _destroy: function() {
		this._prop_name.remove();
		this._current_value.remove();
		this._remove_change_listeners();
	}

	, _get_rename_command: function(str) {
		return red.command("rename_prop", {
			parent: this.option("dict")
			, from: this.option("prop_name")
			, to: str
		});
	}

	, _add_change_listeners: function(dict) {
		var self = this;
		this._live_src_fn = cjs.liven(function() {
			var dict = self.option("dict");
			var context = self.option("context");
			var prop_name = self.option("prop_name");
			var prop_value = dict.get_prop(prop_name, context);
			self._source_value.ambiguous({
								value: prop_value
							});
		});
		this._live_value_fn = cjs.liven(function() {
			var dict = self.option("dict");
			var context = self.option("context");
			var prop_name = self.option("prop_name");
			var value = dict.prop_val(prop_name, context);
			var value_str = value_to_text(value);
			self._current_value.text(value_str);
		});
		this._is_inherited_fn = cjs.liven(function() {
			var dict = self.option("dict");
			var context = self.option("context");
			var prop_name = self.option("prop_name");
			var is_inherited = dict.is_inherited(prop_name, context);
		});
	}

	, _remove_change_listeners: function() {
		this._live_value_fn.destroy();
		this._live_src_fn.destroy();
		this._is_inherited_fn.destroy();
		delete this._live_fn;
	}
});

}(red, jQuery));
