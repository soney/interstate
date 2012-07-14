(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var extend = function(subClass, superClass) {
    var F = function() {};
    F.prototype = superClass.prototype;
    subClass.prototype = new F();
    subClass.prototype.constructor = subClass;

    subClass.superclass = superClass.prototype;
    if(superClass.prototype.constructor == Object.prototype.constructor) {
        superClass.prototype.constructor = superClass;
    }
}

var RedEvent = function() {
	this._initialize();
	this.on_create.apply(this, arguments);
};

(function(my) {
	var proto = my.prototype;
	proto._initialize = function() {
		this.transition = undefined;
		this.listeners = [];
	};
	proto.on_create = function() {
	};
	proto.add_listener = function(listener) {
		this.listeners.push(listener);
	};
	proto.remove_listener = function(listener) {
		this.listeners = _.without(listener);
	};
	proto.notify = function() {
		var args = arguments;
		_.forEach(this.listeners, function(listener) {
			listener.apply(this, args);
		});
	};
	proto.set_transition = function(transition) {
		this.transition = transition;
		this.on_ready();
	};
	proto.on_ready = function() {};
}(RedEvent));

var event_types = {};

red.create_event = function(event_type) {
	var Constructor = event_types[event_type];

	var rv = new Constructor();
	rv.on_create.apply(rv, _.rest(arguments));
	return rv;
};

red._create_event_type = function(name) {
	var Constructor = function() {
		this._initialize();
		this.on_create.apply(this, arguments);
	};
	extend(Constructor, RedEvent);
	event_types[name] = Constructor;
	return Constructor;
};

}(red));
