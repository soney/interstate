(function(red) {
var cjs = red.cjs, _ = cjs._;

var set_parent = function(obj, parent) {
	if(obj && obj.set_parent) {
		obj.set_parent(parent);
	}
};

var RedProp = function(options) {
	options = options || {};
	if(!options.parent) { options.parent = undefined; }
	else if(!_.has(options, "name")) { options.name = undefined; }
	else if(!_.has(options, "value")) { options.value = undefined; }
	else if(!_.has(options, "inherited")) { options.inherited = false; }

	this._parent = cjs.create("constraint", options.parent, true);
	this._name = cjs.create("constraint", options.name);
	this._value = cjs.create("constraint", options.value, true);
	this._inherited = cjs.create("constraint", options.inherited, true);
	this._inherits_from = cjs.create("constraint", _.bind(this._inherits_from_getter, this));
	set_parent(options.value, this);
};

(function(my) {
	var proto = my.prototype;
	proto.get = function() { var value = this.get_value(); return cjs.get(value); };
	proto.get_value = function() {
		if(this.is_inherited()) {
			var inherits_from = this.inherits_from();
			if(inherits_from.length > 0) {
				var primary_inheritance = _.first(inherits_from);
				var primary_inheritance_value = primary_inheritance.get_value();
				var cloned_value;
				if(cjs.is_constraint(primary_inheritance_value)) {
					return primary_inheritance_value.clone({
						parent: this
					});
				} else {
					cloned_value = primary_inheritance_value;
				}
				return cloned_value;
			} else {
				return undefined;
			}
		} else {
			return this._value.get();
		}
	};
	proto.set_value = function(value) {
		set_parent(value, this);
		this._value.set(value, true);
	};
	proto.set_name = function(name) { this._name.set(name); };
	proto.get_name = function() { return this._name.get(); };
	proto.set_parent = function(parent) { this._parent.set(parent, true); };
	proto.get_parent = function() { return this._parent.get(); };
	proto.is_inherited = function() { return this._inherited.get(); };
	proto.inherits_from = function() {
		return this._inherits_from.get();
	};
	proto._inherits_from_getter = function() {
		var parent = this.get_parent();
		if(parent) {
			var name = this.get_name();
			return parent._inherited_props_with_name(name);
		}
		return [];
	};
}(RedProp));

red.RedProp = RedProp;
cjs.define("red_prop", function(options) {
	var prop = new RedProp(options);
	var constraint = cjs(function() {
		return prop.get();
	});
	constraint.get_value = _.bind(prop.get_value, prop);
	constraint.set_value = _.bind(prop.set_value, prop);
	constraint.set_name = _.bind(prop.set_name, prop);
	constraint.get_name = _.bind(prop.get_name, prop);
	constraint.get_parent = _.bind(prop.get_parent, prop);
	constraint.set_parent = _.bind(prop.set_parent, prop);
	constraint.is_inherited = _.bind(prop.is_inherited, prop);
	constraint.inherits_from = _.bind(prop.inherits_from, prop);
	constraint.type = "red_prop";
	return constraint;
});

}(red));
