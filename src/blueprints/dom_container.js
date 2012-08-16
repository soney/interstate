(function(red) {
var cjs = red.cjs, _ = cjs._;

var get_children = function(node) {
	var rv = {	node: node
				, children: [] };
	var children_prop = node.get_prop("children");

	var got_children_prop = cjs.get(children_prop);
	_.forEach(got_children_prop, function(child) {
		if(child.get_blueprint_datum("dom_obj", "dom_elem")) {
		}
	});

	return rv;
};

red.blueprints['dom_container'] = function() {
	var dom_container = cjs.create("red_dict");

	dom_obj.initialize = function(self) {
		self.add_blueprint_data("dom_container");
		var datum = function(arg0, arg1) {
			if(arguments.length === 1 && _.isString(arg0)) {
				return self.get_blueprint_datum("dom_container", arg0);
			} else if(arguments.length === 2 && _.isString(arg0)) {
				self.set_blueprint_datum("dom_container", arg0, arg1);
			}
		};

		var children_constraint = cjs.create("constraint", function() {
			return get_children(self);
			var curr_node = self.get_prop("children");

			return children;
		});

		datum("children_constraint", children_constraint);
	};

	dom_obj.destroy = function(self) {
		self.remove_blueprint_data("dom_container");
	};

	return dom_obj;
};
}(red));
