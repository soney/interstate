(function(red, $) {
var cjs = red.cjs, _ = cjs._;

$.widget("red.ambiguous", {
	
	options: {
	}

	, _create: function() {
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;

		this._super(key, value);
	}

	, _destroy: function() {
	}

	, _add_change_listeners: function() {
	}

	, _remove_change_listeners: function() {
	}
});

}(red, jQuery));
