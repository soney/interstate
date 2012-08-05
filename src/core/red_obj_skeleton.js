(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedSkeleton = function() {
	this._properties = red._create_map();
};
(function(my) {
	var proto = my.prototype;

	proto.set_statechart = function(statechart) {
		this._statechart = statechart;
		return this;
	};
	proto.get_statechart = function() { return this._statechart; };

	proto._create_prop = function(prop_name) {
		var prop = new RedProperty(this);
		return prop;
	};
	proto.add_prop = function(prop_name) {
		var prop = this._create_prop();
		this._properties.set(prop_name, prop);
		return this;
	};
	proto.remove_prop = function(prop_name) {
		this._properties.unset(prop_name);
		return this;
	};
	proto.find_prop = function(prop_name) {
		return this._properties.get(prop_name);
	};
}(RedSkeleton));

red.RedSkeleton = RedSkeleton;

}(red));
