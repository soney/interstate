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
	this.event = event;
	this.context_obj = {
		event: { value: event }
	};
};

(function(my) {
	_.proto_extend(my, red.SpecialContext);
	var proto = my.prototype;
	proto.get_event = function() {
		return this.event;
	};
}(red.EventContext));

red.ManifestationContext = function(owner, basis, basis_index, options) {
	red.EventContext.superclass.constructor.apply(this, arguments);
	this.basis = basis;
	this.basis_index = basis_index;
	this.context_obj = {
		basis: _.extend({
					value: basis,
					literal: true
				}, options),
		basis_index: _.extend({
						value: basis_index,
						literal: true
					}, options)
	};
	this._owner = owner;
};
(function(my) {
	_.proto_extend(my, red.SpecialContext);
	var proto = my.prototype;
	proto.get_basis_index = function() {
		return this.basis_index;
	};
}(red.ManifestationContext));

}(red));
