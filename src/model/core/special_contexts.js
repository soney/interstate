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
	proto.eq = function(other_context) {
		return this === other_context;
	};
}(red.SpecialContext));

red.StateContext = function(state) {
	red.StateContext.superclass.constructor.apply(this, arguments);
	this.state = state;
	this.context_obj = {
	};
};

(function(my) {
	_.proto_extend(my, red.SpecialContext);
	var proto = my.prototype;
	proto.get_state = function() {
		return this.state;
	};
	proto.get_event = function() {
		var state = this.get_state();
		return state.get_event();
	};
}(red.StateContext));

red.ManifestationContext = function(owner, basis, basis_index, options) {
	red.EventContext.superclass.constructor.apply(this, arguments);
	this.basis = basis;
	this.basis_index = basis_index;
	this.context_obj = {
		basis: _.extend({
					value: basis
		//			literal: true
				}, options),
		basis_index: _.extend({
						value: basis_index
						//literal: true
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
