(function(red) {
var cjs = red.cjs, _ = red._;

var id = 0;
var RedEvent = function() {
	this._initialize();
	this._transition = undefined;
	this.on_create.apply(this, arguments);
	this.id = id++;
};

(function(my) {
	var proto = my.prototype;
	proto._initialize = function() {
		this.listeners = [];
		this.fire = _.bind(this._fire, this);
	};
	proto.on_create = function() {};
	proto.on_fire = proto.add_listener = function(listener) { this.listeners.push(listener); };
	proto.off_fire = proto.remove_listener = function(listener) { this.listeners = _.without(listener); };
	proto.set_transition = function(transition) { this._transition = transition; };
	proto.get_transition = function() { return this._transition; };
	proto._fire = function() {
		var args = arguments;
		_.forEach(this.listeners, function(listener) {
			listener.apply(this, args);
		});
	};
	proto.guard = function(func) {
		var new_event = new RedEvent();
		this.on_fire(function() {
			if(func.apply(this, arguments)) {
				new_event.fire.apply(new_event, arguments);
			}
		});
		return new_transition;
	};
	proto.destroy = function(){};
	proto.shadow = function() { return new RedEvent(); };
	proto.stringify = function() {
		return "" + this.id;
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
	_.proto_extend(Constructor, RedEvent);
	event_types[name] = Constructor;
	return Constructor;
};

}(red));
