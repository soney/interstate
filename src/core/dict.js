(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedDict = function(options) {
	options = options || {};
	if(!options.parent) { options.parent = undefined; }
	else if(!options.direct_props) { options.direct_props = []; }
	else if(!options.protos) { options.protos = []; }

	this._parent = cjs.create("constraint", options.parent);

	//Properties
	this._direct_props = cjs.create("array", options.direct_props);
	this._inherited_props = cjs(_.bind(this._inherited_props_getter, this));
	this._all_props = cjs(_.bind(this._all_props_getter, this));

	// Prototypes
	this._protos = cjs.create("array", options.protos);
	this._$proto_removed = _.bind(this._proto_removed, this);
	this._$proto_added   = _.bind(this._proto_added,   this);
	this._$proto_moved   = _.bind(this._proto_moved,   this);
	this._all_protos = cjs	.create("constraint", _.bind(this._all_protos_getter, this))
							.onRemove(this._$proto_removed)
							.onAdd   (this._$proto_added)
							.onMove  (this._$proto_moved);
};

(function(my) {
	var proto = my.prototype;

	//
	// === DIRECT PROPERTIES ===
	//
	proto._create_prop_obj = function(name, value) {
		var prop_obj = red.create("prop", {
			name: name
			, value: value
		});
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
	proto._has_direct_prop = function(name) {
		return this._direct_proop_index(name) >= 0;
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

	proto._move_direct_prop = function(name, to_index) {
		var from_index = this._direct_prop_index(name);
		if(prop_index<0) {
			this._direct_properties.move_item(from_index, to_index);
		}
	};

	proto._rename_direct_prop = function(from_name, to_name) {
		if(this._has_direct_prop(to_name)) {
			throw new Error("Already a property with name " + to_name);
		} else {
			var prop = this._get_direct_prop_obj(from_name);
			if(!_.isUndefined(prop)) {
				prop.set_name(to_name);
			}
		}
	};

	//
	// === INHERITED PROPS ===
	//
	proto._inherited_props_getter = function() {
	};
	proto._all_props_getter = function() {
		var direct_props = this._direct_props.get();
		var inherited_props = this._inherited_props.get();

		var used_names = [];
		var all_props = [];

		_.forEach(direct_props.concat(inherited_props), function(prop) {
			var prop_name = direct_prop.get_name();
			if(_.indexOf(used_names, prop_name) < 0) {
				used_names.push(prop_name);
				all_props.push(prop);
			}
		});
		return all_props;
	};
	/*

	this._inherited_props = cjs(_.bind(this._inherited_props_getter, this));
	this._all_props = cjs(_.bind(this._all_props_getter, this));
	*/

	//
	// === PARENT ===
	//
	proto.set_parent = function(parent) { this._parent.set(parent); };
	proto.get_parent = function() { return this._parent.get(); };

	//
	// === PROTOS ===
	//
	proto._set_direct_protos = function(protos) {
		this._direct_protos.set(protos);
	};

	proto._get_direct_protos = function() {
		return this._protos.get();
	};

	proto._proto_removed = function(item, index) {
		item.destroy(this);
		this.remove_shadow_statechart(index);
	};
	proto._proto_added = function(item, index) {
		//Update the statechart
		var item_statechart = item.get_statechart().get_state_with_name("running.own");
		var shadow_statechart = red._shadow_statechart(item_statechart);
		this.add_shadow_statechart(shadow_statechart, index);
		item.initialize(this);
	};
	proto._proto_moved = function(item, from_index, to_index) {
		this.move_shadow_statechart(from_index, to_index);
	};

	proto._all_protos_getter = function() {
		var direct_protos = this._get_direct_protos();
		var all_protos = _.map(direct_protos, function(direct_proto) {
			return ([direct_proto]).concat(direct_prototype._get_all_protos());
		});

		var flattened_all_protos = _.flatten(all_protos);
		
		return _.uniq(_.flatten(_.map(this._get_direct_protos(), function(direct_proto) {
			return ([direct_proto]).concat(direct_proto._get_all_protos());
		})));
	};
}(RedDict));

red.RedDict = RedDict;
cjs.define("red_dict", function(options) {
	var dict = new RedDict(options);
	var constraint = cjs(function() {
		return dict;
	});
	constraint.get_parent = _.bind(dict.get_parent, dict);
	constraint.set_parent = _.bind(dict.set_parent, dict);
	return new RedDict();
});
}(red));
