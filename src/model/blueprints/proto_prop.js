(function(red) {
var cjs = red.cjs, _ = cjs._;

var add_prop_change_listener = function(obj, prop_name, updater) {
	var prop_val = cjs.create("constraint", function() {
		return cjs.get(obj.get_prop(prop_name));
	});
	prop_val.onChange(function(val) {
		updater(val);
	});
	updater(prop_val.get());
};

red.blueprints['proto_prop'] = function() {
	var proto_prop = cjs.create("red_dict");

	proto_prop.name = "proto_prop";
	//proto_prop.set_prop("blueprints", cjs.create("red_cell", {str: "[]"}));

	proto_prop.initialize = function(self) {
		self.add_blueprint_data("proto_prop");
		var datum = self.get_blueprint_datum_getter("proto_prop");
		
		add_prop_change_listener(self, "blueprints", function(val) {
			self.set_protos(val);
		});
	};

	proto_prop.destroy = function(self) {
		self.remove_blueprint_data("proto_prop");
	};

	return proto_prop;
};
}(red));
