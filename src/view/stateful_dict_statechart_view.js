(function(red, $) {
var cjs = red.cjs, _ = cjs._;

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
