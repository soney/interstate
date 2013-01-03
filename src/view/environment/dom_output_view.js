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

$.widget("red.dom_output", {
	
	options: {
		root: undefined
		, context: undefined
	}

	, _create: function() {
		this.element.css("height", "100px");
		this._add_change_listeners();
	}

	, _destroy: function() {
		this._remove_change_listeners();
	}

	, _add_change_listeners: function() {
		var get_dom_tree = function(node, context) {
			var sw = new Stopwatch().start();
			if(!(node instanceof red.RedDict)) { return false; }
			sw.lap("Check if RedDict");
			var manifestations = node.get_manifestation_objs(context);
			sw.lap("Get manifestations");

			if(_.isArray(manifestations)) {
				var manifestation_contexts = _.map(manifestations, function(manifestation) {
					return context.push(manifestation);
				});
				sw.lap("Get manifestation contexts");

				var dom_elem_array = _.map(manifestation_contexts, function(manifestation_context) {
					return get_dom_tree(node, manifestation_context);
				});
				sw.lap("Get DOM Element Array");

				return dom_elem_array;
			} else {
				sw.lap("Post is-array check");
			}

			var dom_attachment = node.get_attachment_instance("dom", context);
			sw.lap("Got DOM attachment instance");

			if(_.isUndefined(dom_attachment)) {
				return false;
			} else {
				var dom_element = dom_attachment.get_dom_obj();
				if(_.isUndefined(dom_element)) {
					return false;
				}

				sw.lap("Got DOM obj");
				var text_prop = node.get_prop("text", context);
				sw.lap("Find text prop");
				var text = red.get_contextualizable(text_prop, context);
				sw.lap("Got text val");
				if(_.isUndefined(text)) {
					var children = node.get_prop("children", context);
					sw.lap("Get prop children");
					var children_context = context.push(children);

					var children_got = red.get_contextualizable(children, children_context);
					sw.lap("Get prop val children_got");
					var prop_values = [];

					if(children_got instanceof red.RedDict) {
						var prop_names = children.get_prop_names(children_context);
						prop_values = _.map(prop_names, function(prop_name) {
							return children.get_prop(prop_name, children_context);
						});
					} else if(red.is_contextualizable(children)) {
						prop_values = children_got;
					} else if(_.isArray(children)) {
						prop_values = children;
					}
					sw.lap("Got prop_values");
					var children = _.map(prop_values, function(prop_value) {
						var dt = get_dom_tree(prop_value, children_context.push(prop_value));
						return dt;
					});
					sw.lap("Got children");
					var desired_children = _.compact(_.flatten(children));
					sw.lap("Compact & Flatten children");
					var current_children = _.toArray(dom_element.childNodes);
					sw.lap("Get Current Children");

					var diff = _.diff(current_children, desired_children);
					sw.lap("Took current, desired children diff");
					_.forEach(diff.removed, function(info) {
						var index = info.index, child = info.item;
						remove(child);
					});
					sw.lap("DOM mutations: Removed");
					_.forEach(diff.added, function(info) {
						var index = info.index, child = info.item;
						insert_at(child, dom_element, index);
					});
					sw.lap("DOM mutations: Added");
					_.forEach(diff.moved, function(info) {
						var from_index = info.from_index, to_index = info.to_index, child = info.item;
						move(child, from_index, to_index);
					});
					sw.lap("DOM mutations: Moved");
				} else {
					dom_element.textContent = text;
					sw.lap("Setting text val");
				}
				sw.stop();
				sw.drop("dom out");
				return dom_element;
			}
		};

		var root = this.option("root");
		var root_context = this.option("context");
		console.log("Begin DOM change listeners");

		this._dom_tree_fn = cjs.liven(function() {
			//if(red.__debug) debugger;
			console.log("begin live");
			var dom_element = get_dom_tree(root, root_context);
			if(this.element.children().is(dom_element)) {
				this.element.children().not(dom_element).remove();
			} else {
				this.element.children().remove();
				this.element.append(dom_element);
			}
			console.log("end live");
		}, {
			context: this
			, pause_while_running: true
		});
		//this._dom_tree_fn.run();
		console.log("End DOM change listeners");
	}

	, _remove_change_listeners: function() {
	}

});

}(red, jQuery));
