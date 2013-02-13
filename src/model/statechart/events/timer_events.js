(function(red) {
var cjs = red.cjs, _ = red._;

(function(proto) {
	proto.on_create = function(time) {
		this.time = time;
		var creation_time = (new Date()).getTime();
		var time_diff = this.time - creation_time;

		window.setTimeout(function() {
			self.fire({
				type: "time"
				, time: time
				, current_time: (new Date()).getTime()
				, created_at: creation_time
			});
		}, time_diff);
	};
}(red._create_event_type("time").prototype));

(function(proto) {
	proto.on_create = function(delay) {
		this.delay = delay;
		this.created_at = (new Date()).getTime();
	};
	proto.set_transition = function(transition) {
		this._transition = transition;
		if(transition) {
			var from = transition.from();
			var timeout;
			var enter_listener = _.bind(function() {
				if(!_.isUndefined(timeout)) {
					window.clearTimeout(timeout);
					timeout = undefined;
				}
				timeout = window.setTimeout(_.bind(this.notify, this), this.delay);
			}, this);

			var leave_listener = _.bind(function() {
				if(!_.isUndefined(timeout)) {
					window.clearTimeout(timeout);
					timeout = undefined;
				}
			}, this);

			from.on("active", enter_listener);
			from.on("inactive", leave_listener);

			_.defer(function() {
				if(from.is_active()) {
					enter_listener();
				}
			});
		}
	};
	proto.notify = function() {
		red.event_queue.wait();
		this.fire({
			type: "timeout"
			, delay: this.delay
			, current_time: (new Date()).getTime()
			, created_at: this.created_at
		});
		red.event_queue.signal();
	};
}(red._create_event_type("timeout").prototype));

}(red));
