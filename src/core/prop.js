(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedProp = function(parent, name, value) {
	this._parent = cjs(parent);
	this._name = cjs(name);
	this._value = cjs(value);
};

(function(my) {
	var proto = my.prototype;
	proto.get = function() {
		return this._value.get();
	};
	proto.set = function(value) {
		this._value.set(value);
	};
	proto.set_name = function(name) {
		this._name.set(name);
	};
	proto.get_name = function() {
		this._name.get();
	};
	proto.set_parent = function(parent) {
		this._parent.set(parent);
	};
	proto.get_parent = function() {
		return this._parent.get();
	};
}(RedProp));

red.RedProp = RedProp;
cjs.define("red_prop", function(parent, name, value) {
	var prop = new RedProp(parent, name, value);
	var constraint = cjs(function() {
		return prop.get();
	});
	constraint.set_value = _.bind(prop.set, prop);
	constraint.set_name = _.bind(prop.set_name, prop);
	constraint.get_name = _.bind(prop.get_name, prop);
	constraint.get_parent = _.bind(prop.get_parent, prop);
	constraint.set_parent = _.bind(prop.set_parent, prop);
	constraint.type = "red_prop";
	return constraint;
});

}(red));
