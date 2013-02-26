(function(red) {
var cjs = red.cjs, _ = red._;

(function(proto) {
	proto.on_create = function(events) {
		this.events = events;
		_.each(this.events, function(event) {
			event.on_fire(_.bind(function() {
				this.fire.apply(this, arguments);
			}, this));
		}, this);
	};

	proto.destroy = function() {
		var args = arguments;
		_.each(this.events, function(event) {
			event.destroy.apply(event, args);
		});
	};
}(red._create_event_type("combination").prototype));
}(red));
