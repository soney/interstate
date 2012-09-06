(function(red, $) {
var cjs = red.cjs, _ = cjs._;

$.widget("red.ambiguous", {
	
	options: {
		value: undefined
		, context: undefined
		, indent: 0
		, sub_entries: undefined
	}

	, _create: function() {
		this._add_view(this.option("value"), this.option("context"));
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		if(key === "value") {
			var context = this.option("context");
			if(old_value !== new_value) {
				this._remove_view(old_value, context);
				this._add_view(new_value, context);
			}
		} else if(key === "indent") {
			var my_value = this.option("value");
			if(my_value instanceof red.RedDict) {
				var sub_entries = this.option("sub_entries");
				sub_entries.dict("option", "indent", value);
			}
		}

		this._super(key, value);
	}

	, _destroy: function() {
		this._remove_view(this.option("value"), this.option("context"));
	}

	, _add_view: function(value, context) {
		if(value instanceof red.RedCell) {
			this.element.cell({
				cell: value
			});
		} else if(value instanceof red.RedStatefulObj) {
			this.element.stateful_dict_statechart({
				stateful_obj: value
				, context: context
			});
			var sub_entries = this.option("sub_entries");
			sub_entries.dict({
				dict: value
				, context: context
				, indent: this.option("indent")
			});
		} else if(value instanceof red.RedDict) {
			var sub_entries = this.option("sub_entries");
			sub_entries.dict({
				dict: value
				, context: context
				, indent: this.option("indent")
			});
		} else if(value instanceof red.RedStatefulProp) {
			this.element.stateful_prop({
				prop: value
				, context: context
			});
		}
	}

	, _remove_view: function(value, context) {
		if(value instanceof red.RedCell) {
			this.element.cell("destroy");
		} else if(value instanceof red.RedStatefulObj) {
			this.element.stateful_dict_statechart("destroy");
			var sub_entries = this.option("sub_entries");
			sub_entries.dict("destroy");
		} else if(value instanceof red.RedDict) {
			var sub_entries = this.option("sub_entries");
			sub_entries.dict("destroy");
		} else if(value instanceof red.RedStatefulProp) {
			this.element.stateful_prop("destroy");
		}
	}
});

}(red, jQuery));
