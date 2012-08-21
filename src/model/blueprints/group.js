(function(red) {
var cjs = red.cjs, _ = cjs._;

red.blueprints['group'] = function() {
	var group = cjs.create("red_dict");

	group.name = "group";

	group.initialize = function(self) {
		self.add_blueprint_data("group");
		var datum = self.get_blueprint_datum_getter("group");
		
	};

	group.destroy = function(self) {
		self.remove_blueprint_data("group");
	};

	return proto_prop;
};
}(red));
