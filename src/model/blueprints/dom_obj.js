(function(red) {
var cjs = red.cjs, _ = cjs._;

var changeable_css_props = {
	"width": "width"
	, "height": "height"
	, "backgroundColor": "backgroundColor"
	, "color": "color"
	, "left": "left"
	, "top": "top"
	, "position": "position"
};

var changeable_attrs = {
	"src": "src"
}

var update_dom_props = function(self, datum) {
	var dom_obj = datum("dom_obj");
	if(dom_obj) {
		_.forEach(changeable_css_props, function(changeable_css_prop, my_name) {
			var prop = self.get_prop(my_name);
			if(prop) {
				var val = cjs.get(prop);
				dom_obj.style[changeable_css_prop] = val;
			}
		});
		_.forEach(changeable_attrs, function(changeable_attr, my_name) {
			var prop = self.get_prop(my_name);
			if(prop) {
				var val = cjs.get(prop);
				dom_obj[changeable_attr] = val;
			}
		});
		var text = self.get_prop("text");
		if(text) {
			var val = cjs.get(text);
			dom_obj.textContent = val;
		}
	}
};

var add_prop_change_listener = function(obj, prop_name, updater) {
	var prop_val = cjs.create("constraint", function() {
		return cjs.get(obj.get_prop(prop_name));
	})
	prop_val.onChange(function(val) {
		updater(val);
	});
	updater(prop_val.get());
};

var add_tag_change_listener = function(self, datum) {
	var update_tag = function(tag_name) {
		var dom_obj = datum("dom_obj");
		var new_dom_obj;

		if(tag_name) {
			new_dom_obj = document.createElement(tag_name);
		}

		dom_obj = new_dom_obj;
		datum("dom_obj", dom_obj);

		if(dom_obj) {
			update_dom_props(self, datum);
		}
	};

	add_prop_change_listener(self, "tag", update_tag);
};

var add_css_change_listeners = function(self, datum) {
	_.forEach(changeable_css_props, function(changeable_css_prop, my_name) {
		var update_val = function(val) {
			var dom_obj = datum("dom_obj");

			if(dom_obj) {
				dom_obj.style[changeable_css_prop] = val;
			}
		};

		add_prop_change_listener(self, my_name, update_val);
	});
};
var add_attr_change_listeners = function(self, datum) {
	_.forEach(changeable_attrs, function(changeable_attr, my_name) {
		var update_val = function(val) {
			var dom_obj = datum("dom_obj");

			if(dom_obj) {
				dom_obj[changeable_attr] = val;
			}
		};

		add_prop_change_listener(self, my_name, update_val);
	});
};

var add_text_change_listeners = function(self, datum) {
	var update_text = function(text) {
		var dom_obj = datum("dom_obj");
		if(dom_obj) {
			dom_obj.textContent = text;
		}
	};

	add_prop_change_listener(self, "text", update_text);
};


red.blueprints['dom_obj'] = function() {
	var dom_obj = cjs.create("red_dict");

	dom_obj.name = "dom_obj";

	dom_obj.set_prop("children", cjs.create("red_dict"));

	dom_obj.initialize = function(self) {
		self.add_blueprint_data("dom_obj");
		var datum = self.get_blueprint_datum_getter("dom_obj");

		add_tag_change_listener(self, datum);
		add_css_change_listeners(self, datum);
		add_attr_change_listeners(self, datum);
		add_text_change_listeners(self, datum);
	};

	dom_obj.destroy = function(self) {
		self.remove_blueprint_data("dom_obj");
	};

	return dom_obj;
};
}(red));
