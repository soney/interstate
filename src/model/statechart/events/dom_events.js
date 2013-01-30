(function(red) {
var cjs = red.cjs, _ = red._;

(function(proto) {
	proto.on_create = function(type, targets) {
		this.type = type;
		if(!_.isArray(targets)) {
			targets = [targets];
		}
		this.targets = targets;

		this._bubble_listener = _.bind(function(event) {
			event.preventDefault();
			red.event_queue.wait();
			if(event.target && event.target.__red_owner__) {
				event = _.extend({}, event, {
					target: event.target.__red_owner__
				});
			}
			this.fire.apply(this, arguments);
			_.defer(function() {
				red.event_queue.signal();
			});
		}, this);

		this.add_listeners();
	};
	proto.clone = function() {
		return red.create_event("dom_event", this.type, this.targets);
	};
	proto.set_type = function(type) {
		this.remove_listeners();
		this.type = type;
		this.add_listeners();
	};
	proto.set_targets = function(targets) {
		this.remove_listeners();
		if(!_.isArray(targets)) {
			targets = [targets];
		}
		this.targets = targets;
		this.add_listeners();
	};
	proto.add_listeners = function() {
		_.each(this.targets, function(target) {
			target.addEventListener(this.type, this._bubble_listener, false); // Bubble
		}, this);
	};
	proto.remove_listeners = function() {
		_.each(this.targets, function(target) {
			target.removeEventListener(this.type, this._bubble_listener, false); // Bubble
		}, this);
	};
	proto.destroy = function() {
		this.remove_listeners();
	};
}(red._create_event_type("dom_event").prototype));
}(red));
