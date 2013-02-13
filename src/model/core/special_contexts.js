(function(red) {
var cjs = red.cjs, _ = red._;

var scid = 0;

red.SpecialContext = function() {
	this._id = "c"+scid++;
	this.context_obj = {};
};
(function(my) {
	var proto = my.prototype;
	proto.id = proto.hash = function() {
		return this._id;
	};
	proto.get_context_obj = function() {
		return this.context_obj;
	};
}(red.SpecialContext));

var context_counter = 1;

var ec_counter = 1;
red.EventContext = function(event) {
	red.EventContext.superclass.constructor.apply(this, arguments);
	this.context_obj = {
		event: event
	};
};

(function(my) {
	_.proto_extend(my, red.SpecialContext);
	var proto = my.prototype;
}(red.EventContext));

red.ManifestationContext = function(owner, basis, basis_index) {
	red.EventContext.superclass.constructor.apply(this, arguments);
	this.context_obj = {
		basis: basis,
		basis_index: basis_index
	};
	this._owner = owner;
};
(function(my) {
	_.proto_extend(my, red.SpecialContext);
	var proto = my.prototype;
}(red.ManifestationContext));

}(red));
