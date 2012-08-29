(function(red, $) {
var cjs = red.cjs, _ = cjs._;

$.widget("red.ambiguous", {
	
	options: {
		value: undefined
		, context: undefined
		, indent: 0
	}

	, _create: function() {
		this._add_view(this.option("value"), this.option("context"));
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		if(key === "value") {
			var context = this.option("context");
			this._remove_view(old_value, context);
			this._add_view(new_value, context);
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
		}
	}

	, _remove_view: function(value, context) {
		if(value instanceof red.RedCell) {
			this.element.cell("destroy");
		}
	}
});

}(red, jQuery));
