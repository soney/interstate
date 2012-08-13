(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedDict = function() {
	this._parent = cjs.create("constraint", parent);
	this._direct_props = cjs.create("array");
};

(function(my) {
	var proto = my.prototype;

	//
	// === DIRECT PROPERTIES ===
	//
	proto._create_prop_obj = function(name, value) {
		var prop_obj = red.create("prop", name, value);
		return prop_obj;
	};

	proto._direct_prop_index = function(name) {
		var direct_props = this._direct_props.get();
		var i, len = direct_props.length;
		for(i = 0; i<len; i++) {
			if(direct_props[i].get_name() === name) {
				return i;
			}
		}
		return -1;
	};
	proto._get_direct_prop_obj = function(name) {
		var index = this._direct_prop_index(name);
		if(index < 0) {
			return undefined;
		} else {
			var direct_props = this._direct_props.get();
			return direct_props[index];
		}
	};
	proto._set_direct_prop_obj = function(prop_obj, index) {
		this._direct_props.insert_at(prop, index);
	};

	proto._set_direct_prop = function(name, value, index) {
		var prop_obj = this._get_direct_prop_obj(name);
		if(_.isUndefined(prop_obj)) {
			prop_obj = this._create_prop_obj(name, value);
			this._set_direct_prop_obj(prop_obj, index);
		} else {
			prop_obj.set_value(value);
		}
	};

	proto._unset_direct_prop = function(name) {
		var index = this._direct_prop_index(name);
		if(index >= 0) {
			this._direct_props.remove_item(index);
		}
	};

	proto._get_direct_prop = function(name) {
		var prop_obj = this._get_direct_prop_obj(name);
		if(_.isUndefined(prop_obj)) {
			return prop_obj;
		} else {
			return prop_obj.get_value();
		}
	};

	proto._move_direct_prop = function(prop_name, index) {
		this._direct_properties.move(prop_name, index);
		return this;
	};
	/*

	proto._prop_index = function(prop_name) {
	};

	proto.set_prop = function(name, value, index) {
		var prop = this._create_prop_obj(name, value);
		this._props.insert_at(prop, index);
	};

	proto.remove_prop = function(prop_name) {
		this._direct_properties.unset(prop_name);
		return this;
	};

	proto.move_prop = function(prop_name, index) {
		this._direct_properties.move(prop_name, index);
		return this;
	};

	proto.rename_prop = function(old_name, new_name) {
		prop.set_name(new_name);
		this._direct_properties.rename(old_name, new_name);
		return this;
	};
	*/

	//
	// === PARENT ===
	//
	proto.set_parent = function(parent) { this._parent.set(parent); };
	proto.get_parent = function() { return this._parent.get(); };
}(RedDict));

red.RedDict = RedDict;
cjs.define("red_dict", function(parent) {
	var dict = new RedDict(parent);
	var constraint = cjs(function() {
		return dict;
	});
	constraint.get_parent = _.bind(prop.get_parent, prop);
	constraint.set_parent = _.bind(prop.set_parent, prop);
	return new RedDict();
});
}(red));
