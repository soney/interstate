(function(red, $) {
var cjs = red.cjs, _ = red._;

var insert_at = function(child_node, parent_node, index) {
	var children = parent_node.childNodes;
	if(children.length <= index) {
		parent_node.appendChild(child_node);
	} else {
		var before_child = children[index];
		parent_node.insertBefore(child_node, before_child);
	}
};
var remove = function(child_node) {
	var parent_node = child_node.parentNode;
	if(parent_node) {
		parent_node.removeChild(child_node);
	}
};
var move = function(child_node, from_index, to_index) {
	var parent_node = child_node.parentNode;
	if(parent_node) {
		if(from_index < to_index) { //If it's less than the index we're inserting at...
			to_index++; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
		}
		insert_at(child_node, parent_node, to_index);
	}
};

$.widget("red.stateful_dict_statechart", {
	
	options: {
		stateful_obj: undefined
		, context: undefined
	}

	, _create: function() {
		var stateful_obj = this.option("stateful_obj");
		this._own_statechart = $("<span />").appendTo(this.element)
											.statechart({
												statechart: stateful_obj.get_statechart_for_context(this.option("context"))
												, inherited: false
											});
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

	, _get_view_for_inherited_statechart: function(statechart) {
		var children = this._inherited_statecharts.children();
		for(var i = 0; i<children.length; i++) {
			var child = children.eq(i);
			if(child.statechart("option", "statechart") === statechart) { return child; }
		}
		return undefined;
	}

	, _add_change_listeners: function() {
		var cached_inherited_statecharts = [];
		var stateful_obj = this.option("stateful_obj");
		var context = this.option("context");
		var self = this;
		this._inherited_statechart_listener = cjs.liven(function() {
			var inherited_statecharts = stateful_obj.get_inherited_statecharts(context);
			var diff = _.diff(cached_inherited_statecharts, inherited_statecharts);

			_.forEach(diff.removed, function(info) {
				var index = info.index
					, statechart = info.item;
				var view = self._get_view_for_inherited_statechart(statechart);
				view.statechart("destroy").remove();
			});
			_.forEach(diff.added, function(info) {
				var index = info.index
					, statechart = info.item;
				var view = $("<span />").statechart({
					statechart: statechart
					, inherited: true
				});
				insert_at(view[0], self._inherited_statecharts[0], index);
			});
			_.forEach(diff.moved, function(info) {
				var from_index = info.from_index
					, to_index = info.to_index
					, statechart = info.item;
				var view = self._get_view_for_inherited_statechart(statechart);
				var view_index = view.index();
				move(view[0], view_index, to_index);
			});

			cached_inherited_statecharts = inherited_statecharts;
		});
	}

	, _remove_change_listeners: function() {
		this._inherited_statechart_listener.destroy();
	}
});

}(red, jQuery));
