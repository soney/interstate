(function(red) {
var cjs = red.cjs, _ = cjs._;

var id = 0;
var RedDict = function(options) {
	options = options || {};
	this._blueprint_data = cjs.create("map");
	if(!options.parent) { options.parent = undefined; }
	else if(!options.direct_props) { options.direct_props = []; }

	this._parent = cjs.create("constraint", options.parent);

	//Properties
	this._direct_props = cjs.create("array", options.direct_props);
	this._inherited_props = cjs(_.bind(this._inherited_props_getter, this));
	this._all_props = cjs(_.bind(this._all_props_getter, this));

	// Prototypes
	this._implicit_protos = options.implicit_protos || [];
	if(options.direct_protos) { this._direct_protos = options.direct_protos; }
	else { this._direct_protos = cjs.create("array"); }
	this._$proto_removed = _.bind(this._proto_removed, this);
	this._$proto_added   = _.bind(this._proto_added,   this);
	this._$proto_moved   = _.bind(this._proto_moved,   this);
	this._all_protos = cjs	.create("constraint", _.bind(this._all_protos_getter, this))
							.onRemove(this._$proto_removed)
							.onAdd   (this._$proto_added)
							.onMove  (this._$proto_moved);
	this.type = "red_dict";
	this.id = id++;
};

(function(my) {
	var proto = my.prototype;
	proto.on_ready = function() {
		var self = this;
		_.forEach(this._get_all_protos(), function(proto) {
			proto.initialize(self);
		});
	};

	//
	// === DIRECT PROPERTIES ===
	//
	proto._get_direct_props = function() {
		return this._direct_props.get();
	};
	proto._create_prop_obj = function(name, value, inherited) {
		var prop_obj = cjs.create("red_prop", {
			name: name
			, value: value
			, inherited: inherited
			, parent: this
		});
		return prop_obj;
	};

	proto._direct_prop_index = function(name) {
		var direct_props = this._get_direct_props();
		var i, len = direct_props.length;
		for(i = 0; i<len; i++) {
			if(direct_props[i].get_name() === name) {
				return i;
			}
		}
		return -1;
	};
	proto._has_direct_prop = function(name) {
		return this._direct_prop_index(name) >= 0;
	};
	proto._get_direct_prop_obj = function(name) {
		var index = this._direct_prop_index(name);
		if(index < 0) {
			return undefined;
		} else {
			var direct_props = this._get_direct_props();
			return direct_props[index];
		}
	};
	proto._set_direct_prop_obj = function(prop_obj, index) {
		this._direct_props.insert_at(prop_obj, index, false);
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
		if(from_index>=0) {
			this._direct_props.move_item(from_index, to_index);
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
		var all_protos = this._all_protos.get();
		var used_names = [];
		var rv = [];
		var self = this;
		_.forEach(all_protos, function(all_proto) {
			var proto_props = all_proto._get_direct_props();
			_.forEach(proto_props, function(proto_prop) {
				var proto_prop_name = proto_prop.get_name();
				if(_.indexOf(used_names, proto_prop_name) < 0) {
					used_names.push(proto_prop_name);
					rv.push(self._create_prop_obj(proto_prop_name, undefined, true)); 
				}
			});
		});
		return rv;
	};
	proto._inherited_props_with_name = function(name) {
		var all_protos = this._all_protos.get();
		var rv = [];
		var inherited_props = _.forEach(all_protos, function(all_proto) {
			var proto_props = all_proto._get_direct_props();
			_.forEach(proto_props, function(proto_prop) {
				var proto_prop_name = proto_prop.get_name();
				if(proto_prop_name === name) {
					rv.push(proto_prop);
				}
			});
		});
		return rv;
	};
	proto._all_props_getter = function() {
		var direct_props = this._direct_props.get();
		var inherited_props = this._inherited_props.get();

		var used_names = [];
		var all_props = [];

		_.forEach(direct_props.concat(inherited_props), function(prop) {
			var prop_name = prop.get_name();
			if(_.indexOf(used_names, prop_name) < 0) {
				used_names.push(prop_name);
				all_props.push(prop);
			}
		});
		return all_props;
	};

	proto.get_all_props = function() {
		return this._all_props.get();
	};

	proto.get_all_prop_names = function() {
		var all_props = this.get_all_props();
		return _.map(all_props, function(prop) {
			return prop.get_name();
		});
	};

	proto._all_prop_index = function(name) {
		var all_props = this._all_props.get();
		var i, len = all_props.length;
		for(i = 0; i<len; i++) {
			if(all_props[i].get_name() === name) {
				return i;
			}
		}
		return -1;
	};
	proto.has_prop = function(name) {
		return this._all_prop_index(name) >= 0;
	};
	proto._get_all_prop_obj = function(name) {
		var index = this._all_prop_index(name);
		if(index < 0) {
			return undefined;
		} else {
			var all_props = this._all_props.get();
			return all_props[index];
		}
	};

	proto._get_all_prop = function(name) {
		var prop_obj = this._get_all_prop_obj(name);
		if(_.isUndefined(prop_obj)) {
			return undefined;
		} else {
			return prop_obj.get_value();
		}
	};
	proto.is_inherited = function(name) {
		var prop_obj = this._get_all_prop_obj(name);
		if(_.isUndefined(prop_obj)) {
			return undefined;
		} else {
			return prop_obj.is_inherited();
		}
	};

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
		var direct_protos = this._direct_protos.get();
		if(!_.isUndefined(direct_protos) && !_.isArray(direct_protos)) {
			direct_protos = [direct_protos];
		}
		return direct_protos;
	};
	proto._get_implicit_protos = function() {
		return this._implicit_protos;
	};

	proto._proto_removed = function(item, index) { item.destroy(this); };
	proto._proto_moved = function(item, index) { };
	proto._proto_added = function(item, index) { item.initialize(this); };

	proto._get_explicit_protos = function() {
		var direct_protos = this._get_direct_protos();
		var explicit_protos = _.map(direct_protos, function(direct_proto) {
			if(_.isUndefined(direct_proto)) { return false; };
			
			return ([direct_proto]).concat(direct_proto._get_explicit_protos());
		});
		explicit_protos = _.compact(explicit_protos);
		return explicit_protos
	};

	proto._all_protos_getter = function() {
		var implicit_protos = this._get_implicit_protos();
		var explicit_protos = this._get_explicit_protos();

		var all_protos = implicit_protos.concat(explicit_protos);

		var flattened_all_protos = _.flatten(all_protos);

		return _.compact(_.uniq(_.flatten(all_protos)));
	};

	proto._get_all_protos = function() {
		return this._all_protos.get();
	};
	proto.get_prop = proto._get_all_prop;
	proto.set_prop = proto._set_direct_prop;
	proto.unset_prop = proto._unset_direct_prop;
	proto.set_protos = proto._set_direct_protos;
	proto.get_protos = proto._get_all_protos;
	proto.prop_index = proto._all_prop_index;
	proto.rename_prop = proto._rename_direct_prop;
	proto.move_prop = proto._move_direct_prop;
	proto.initialize = function(self) {};
	proto.destroy = function(self) { };
	proto.get_blueprint_datum = function(blueprint_name, key) {
		var bn = this._blueprint_data.get(blueprint_name);
		if(bn) {
			return bn.get(key);
		} else {
			return undefined;
		}
	};
	proto.set_blueprint_datum = function(blueprint_name, key, value) {
		this._blueprint_data.get(blueprint_name).set(key, value);
	};
	proto.add_blueprint_data = function(blueprint_name) {
		this._blueprint_data.set(blueprint_name, cjs.create("map"));
	};
	proto.remove_blueprint_data = function(blueprint_name) {
		this._blueprint_data.unset(blueprint_name);
	};
	proto.get_blueprint_datum_getter = function(blueprint_name) {
		var self = this;
		var getter = function(arg0, arg1) {
			if(arguments.length === 1 && _.isString(arg0)) {
				return self.get_blueprint_datum(blueprint_name, arg0);
			} else if(arguments.length === 2 && _.isString(arg0)) {
				self.set_blueprint_datum(blueprint_name, arg0, arg1);
			}
		};
		return getter;
	};
}(RedDict));

red.RedDict = RedDict;
cjs.define("red_dict", function(options) {
	var dict = new RedDict(options);
	dict.on_ready();
	return dict;
});
}(red));
