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
		, indent: 0
	}

	, _create: function() {
		this._state = state.IDLE;
		var my_context = this.option("context");
		var self = this;
		this.element.addClass("dict_row")
					.on("editablesetstr.red_cell", function(event, data) {
						event.stopPropagation();
						var str = data.value;
						var event = $.Event("red_command");
						event.command = self._get_rename_command(str);
						self.element.trigger(event);
					});
		this._sub_entries = $("<div />");

		var dict = this.option("dict");
		this._prop_name = $("<span />")	.addClass("prop_name")
										.editable({str: this.option("prop_name")})
										.css("padding-left", (this.option("indent")*15)+"px")
										.appendTo(this.element);

		this._current_value = $("<span />")	.addClass("current_value")
											.appendTo(this.element);
		this._source_value = $("<span />")	.ambiguous({
												context: my_context.push(dict)
												, indent: this.option("indent") + 1
												, sub_entries: this._sub_entries
											})
											.appendTo(this.element);
		this._sub_entries.appendTo(this.element);


		_.defer(_.bind(this._add_change_listeners, this));
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		if(key === "indent") {
			this._prop_name.css("padding-left", (value*15)+"px");
			this._source_value.ambiguous("option", "indent", value + 1);
		}

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
