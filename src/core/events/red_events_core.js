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
};

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
	proto.on_create = function() {};
	proto.on_fire = proto.add_listener = function(listener) {
		this.listeners.push(listener);
	};
	proto.off_fire = proto.remove_listener = function(listener) {
		this.listeners = _.without(listener);
	};
	proto.fire = proto.notify = function() {
		var args = arguments;
		_.forEach(this.listeners, function(listener) {
			listener.apply(this, args);
		});
	};
	proto.guard = function(func) {
		var new_transition = new RedEvent();
		this.on_fire(function() {
			if(func.apply(this, arguments)) {
				new_transition.fire.apply(new_transition, arguments);
			}
		});
		return new_transition;
	};
	proto.clone = function() {
		return new RedEvent();
	};
}(RedEvent));

var event_types = {};

red.create_event = function(event_type) {
	var Constructor = event_types[event_type];

	var rv = new Constructor();
	rv.on_create.apply(rv, _.rest(arguments));
	rv.type = event_type;
	return rv;
};

red._create_event_type = function(name) {
	var Constructor = function() {
		this._initialize();
	};
	extend(Constructor, RedEvent);
	event_types[name] = Constructor;
	return Constructor;
};

}(red));
