(function(red, $) {
var cjs = red.cjs, _ = cjs._;

$.widget("red.stateful_dict_statechart", {
	
	options: {
		stateful_obj: undefined
		, context: undefined
	}

	, _create: function() {
		var stateful_obj = this.option("stateful_obj");
		this._own_statechart = $("<span />")	.statechart({
												statechart: stateful_obj.get_own_statechart()
											})
											.appendTo(this.element);
		this._inherited_statecharts = $("<span />").appendTo(this.element);
		this._add_change_listeners();
	}

	, _destroy: function() {
		this._own_statechart.statechart("destroy")
							.remove();
		this._remove_change_listeners();
		this._inherited_statecharts	.children()
									.each(function() {
										$(this).statechart("destroy");
									})
									.end()
									.remove();
	}

	, _add_change_listeners: function() {
		var cached_inherited_statecharts = [];
		var stateful_obj = this.option("stateful_obj");
		var context = this.option("context");
		this._inherited_statechart_listener = cjs.liven(function() {
			var inherited_statecharts = stateful_obj.get_inherited_statecharts(context);
			var diff = _.diff(cached_inherited_statecharts, inherited_statecharts);

			_.forEach(diff.removed, function(info) {
				var index = info.index
					, statechart = info.item;
			});
			_.forEach(diff.added, function(info) {
				var index = info.index
					, statechart = info.item;
			});
			_.forEach(diff.moved, function(info) {
				var from_index = info.from_index
					, to_index = info.to_index
					, statechart = info.item;
			});

			cached_inherited_statecharts = inherited_statecharts;
		});
	}

	, _remove_change_listeners: function() {
		this._inherited_statechart_listener.destroy();
	}
});

}(red, jQuery));
