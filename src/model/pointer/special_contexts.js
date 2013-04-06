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

red.CopyContext = function(owner, my_copy, copy_num, options) {
	red.CopyContext.superclass.constructor.apply(this, arguments);
	this.my_copy = my_copy;
	this.copy_num = copy_num;
	this.context_obj = {
		my_copy: _.extend({
					value: my_copy
		//			literal: true
				}, options),
		copy_num: _.extend({
						value: copy_num
						//literal: true
					}, options)
	};
	this._owner = owner;
};
(function(my) {
	_.proto_extend(my, red.SpecialContext);
	var proto = my.prototype;
	proto.get_copy_num = function() {
		return this.copy_num;
	};
}(red.CopyContext));

}(red));