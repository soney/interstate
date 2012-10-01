(function(red, $) {
var cjs = red.cjs, _ = red._;

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
	} else if(val instanceof red.RedGroup) {
		return "(group)";
	} else if(_.isArray(val)) {
		return "[" + _.map(val, function(v) { return value_to_text(v);}).join(", ") + "]";
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
		, value: undefined
		, static: false
	}

	, _create: function() {
		this._state = state.IDLE;
		var my_context = this.option("context");
		var self = this;
		this.element.addClass("dict_row");
		this._sub_entries = $("<div />");

		var dict = this.option("dict");
		this._prop_name = $("<span />")	.addClass("prop_name")
										.css("padding-left", (this.option("indent")*15)+"px")
										.appendTo(this.element);

		this._current_value = $("<span />")	.addClass("current_value")
											.appendTo(this.element);
		this._source_value = $("<span />")	.ambiguous({
												context: my_context
												, indent: this.option("indent") + 1
												, sub_entries: this._sub_entries
											})
											.appendTo(this.element);
		this._sub_entries.appendTo(this.element);

		if(this.option("static")) {
			this._prop_name.text(this.option("prop_name"));
			this._source_value.ambiguous({
								value: this.option("value")
							});
		} else {
			this._prop_name	.editable({str: this.option("prop_name")})
							.on("editablesetstr.red_cell", function(event, data) {
								event.stopPropagation();
								var str = data.value;
								var event = $.Event("red_command");
								if(str === "") {
									event.command = self._get_remove_command(str);
								} else {
									event.command = self._get_rename_command(str);
								}
								self.element.trigger(event);
							});
		}
		this._add_change_listeners();
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
		this._remove_change_listeners();

		this._prop_name	.off("editablesetstr.red_cell");
		if(!this.option("static")) {
			this._prop_name.editable("destroy")
		}
		this._prop_name.remove();

		this._source_value	.ambiguous("destroy")
							.remove();

		this._current_value.remove();
	}


	, _add_change_listeners: function(dict) {
		var self = this;
		if(!this.option("static")) {
			this._live_src_fn = cjs.liven(function() {
				var dict = self.option("dict");
				var context = self.option("context");
				var prop_name = self.option("prop_name");
				var prop_value = dict.get_prop(prop_name, context);
				self._source_value.ambiguous({
									value: prop_value
								});
			});
		}
		this._live_value_fn = cjs.liven(function() {
			var dict = self.option("dict");
			var context = self.option("context");
			var value;
			if(self.option("static")) {
				value = red.get_contextualizable(self.option("value"), context);
			} else {
				var prop_name = self.option("prop_name");
				value = dict.prop_val(prop_name, context);
			}
			var value_str = value_to_text(value);
			self._current_value.text(value_str);
		});
		this._is_inherited_fn = cjs.liven(function() {
			var dict = self.option("dict");
			var context = self.option("context");
			var prop_name = self.option("prop_name");
			var is_inherited = dict.is_inherited(prop_name, context);
			self._mark_inherited(is_inherited);
		});
	}

	, _remove_change_listeners: function() {
		if(_.has(this, "_live_src_fn")) { this._live_src_fn.destroy(); }
		if(_.has(this, "_live_value_fn")) { this._live_value_fn.destroy(); }
		if(_.has(this, "_is_inherited_fn")) { this._is_inherited_fn.destroy(); }
	}

	, _mark_inherited: function(is_inherited) {
		if(is_inherited) {
			this.element.addClass("inherited");
			if(!this.option("static")) {
				this._prop_name.editable("disable")
			}
		} else {
			this.element.removeClass("inherited");
			if(!this.option("static")) {
				this._prop_name.editable("enable")
			}
		}
	}

	, _get_rename_command: function(str) {
		return red.command("rename_prop", {
			parent: this.option("dict")
			, from: this.option("prop_name")
			, to: str
		});
	}

	, _get_remove_command: function() {
		return red.command("unset_prop", {
			parent: this.option("dict")
			, name: this.option("prop_name")
		});
	}
});

}(red, jQuery));
