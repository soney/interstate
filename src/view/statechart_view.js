(function(red, $) {
var cjs = red.cjs, _ = cjs._;

$.widget("red.statechart", {
	
	options: {
		statechart: undefined
	}

	, _create: function() {
		this._add_change_listeners();
	}

	, _destroy: function() {
		this._remove_change_listeners();
	}

	, _add_change_listeners: function() {
		var statechart = this.option("statechart");
		console.log(statechart.stringify());
		var cached_substate_names = []
		this._states_live_fn = cjs.liven(function() {
			var substate_names = statechart.get_substate_names();

			console.log(substate_names);
			var diff = _.diff(cached_substate_names, substate_names);

			_.forEach(diff.removed, function(info) {
				var index = info.index
					, state_name = info.item;
			});
			_.forEach(diff.added, function(info) {
				var index = info.index
					, state_name = info.item;
				console.log(state_name);
			});
			_.forEach(diff.moved, function(info) {
				var from_index = info.from_index
					, to_index = info.to_index
					, state_name = info.item;
			});

			cached_substate_names = substate_names;
		});
	}

	, _remove_change_listeners: function() {
	}
});

}(red, jQuery));
