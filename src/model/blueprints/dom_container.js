(function(red) {
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

var get_children = function(node) {
	var rv = {	node: node
				, dom_elem: undefined
				, children: [] };

	var children_prop, got_children_prop;
	if(node instanceof red.RedDict) {
		children_prop = node.get_prop("children");
		got_children_prop = cjs.get(children_prop);
	}

	if(node instanceof red.RedDict) {	
		rv.dom_elem = node.get_blueprint_datum("dom_obj", "dom_obj");

		if(got_children_prop) {
			rv.children = _.filter(
				_.map(got_children_prop.get_all_prop_names(), function(prop_name) {
					var child = got_children_prop.get_prop(prop_name);
					return get_children(child);
				}), function(child) {
					return child && child.dom_elem;
			});
		}
	}

	return rv;
};

var update = function(node, container) {
	var useful_children = _.filter(node.children, function(child) {
		return child.dom_elem;
	});

	var proposed_children = _.map(useful_children, function(child) {
		return child.dom_elem;
	});

	var actual_children = _.toArray(container.childNodes);

	var diff = _.diff(actual_children, proposed_children);
	if(diff.added.length > 0 || diff.moved.length > 0 || diff.removed.length > 0) {
		_.forEach(diff.removed, function(x) {
			var index = x.index
				, item = x.item;
			remove(item);
		});
		_.forEach(diff.added, function(x) {
			var index = x.index
				, item = x.item;
			insert_at(item, container, index);
		});
		_.forEach(diff.moved, function(x) {
			var from_index = x.from_index
				, to_index = x.to_index
				, item = x.item;
			move(item, from_index, to_index);
		});
	}

	_.forEach(useful_children, function(child) {
		update(child, child.dom_elem);
	});
};

red.blueprints['dom_container'] = function() {
	var dom_container = cjs.create("red_dict");

	dom_container.name = "dom_container";

	var container = document.createElement("div");
	document.body.getElementsByClassName("output")[0].appendChild(container);


	dom_container.initialize = function(self) {
		self.add_blueprint_data("dom_container");
		var datum = function(arg0, arg1) {
			if(arguments.length === 1 && _.isString(arg0)) {
				return self.get_blueprint_datum("dom_container", arg0);
			} else if(arguments.length === 2 && _.isString(arg0)) {
				self.set_blueprint_datum("dom_container", arg0, arg1);
			}
		};

		datum("container", container);

		var children_constraint = cjs.create("constraint", function() {
			return get_children(self);
		});

		cjs.liven(function() {
			var children = children_constraint.get();
			update(children, container);
		});

		datum("children_constraint", children_constraint);
	};

	dom_container.destroy = function(self) {
		self.remove_blueprint_data("dom_container");
	};

	return dom_container;
};
}(red));
