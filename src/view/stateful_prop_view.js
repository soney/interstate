(function(red, $) {
var cjs = red.cjs, _ = cjs._;
$.widget("red.stateful_prop", {
	options: {
		prop: undefined
		, context: undefined
	}

	, _create: function() {
		console.log("A");
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


	, _add_change_listeners: function(dict) {
	}

	, _remove_change_listeners: function() {
	}
});

}(red, jQuery));
