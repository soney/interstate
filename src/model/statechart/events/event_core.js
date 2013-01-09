(function(red) {
var cjs = red.cjs, _ = red._;

var EventQueue = function() {
	able.make_this_listenable(this);
	this.semaphore = 0;
};
(function(my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);
	proto.wait = function() {
		this.semaphore--;
	};
	proto.signal = function() {
		this.semaphore++;
		if(this.semaphore > 0) {
		}
	};
}(EventQueue));

red.event_queue = new EventQueue();

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
		this.$fire_and_signal = _.bind(this.fire_and_signal, this);
	};
	proto.fire_and_signal = function() {
		this.fire.apply(this, arguments);
		this.signal();
	};
	proto.on_create = function() {};
	proto.fire = function() {
		if(my.semaphore < 0) {
			my.append_event_queue(this, arguments);
		} else {
			this._fire.apply(this, arguments);
		}
	};
	proto.on_fire = proto.add_listener = function(listener) { this.listeners.push(listener); };
	proto.off_fire = proto.remove_listener = function(listener) { this.listeners = _.without(listener); };
	proto.set_transition = function(transition) { this._transition = transition; };
	proto.get_transition = function() { return this._transition; };
	proto._fire = function() {
		var args = arguments;
		_.forEach(this.listeners, function(listener) {
			listener.apply(this, args);
		}, this);
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
	proto.create_shadow = function() { return new RedEvent(); };
	proto.stringify = function() {
		return "" + this.id;
	};

	my.event_queue = [];

	my.semaphore = 0;
	my.wait = function() {
		my.semaphore--;
	};
	my.signal = function() {
		my.semaphore++;
		if(my.semaphore >= 0) {
			my.run_event_queue();
		}
	};
	my.append_event_queue = function(context, args) {
		my.event_queue.push({
			context: context,
			args: args
		});
	};
	my.run_event_queue = function() {
		var fire = proto._fire;
		while(my.event_queue.length > 0) {
			var event_info = my.event_queue.shift();
			fire.apply(event_info.context, event_info.args);
		}
	};
}(RedEvent));
red.RedEvent = RedEvent;


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
