(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

(function(proto) {
	proto.on_create = function(time) {
		this.time = time;
		this.created_at = (new Date()).getTime();
	};
	proto.on_ready = function() {
		var curr_time = (new Date()).getTime();
		var time_diff = this.time - curr_time;
		if(time_diff <= 0) {
			this.notify();
		} else {
			window.setTimeout(_.bind(this.notify, this), time_diff);
		}
	};
	proto.notify = function() {
		var event = {
			type: "at_time"
			, time: this.time
			, current_time: (new Date()).getTime()
			, created_at: this.created_at
		};

		this.transition.run(event);
	};
}(red._create_event_type("at_time").prototype));

(function(proto) {
	proto.on_create = function(delay) {
		this.delay = delay;
		this.created_at = (new Date()).getTime();
	};
	proto.on_ready = function() {
		var self = this;
		var from_state = this.transition.from_state;
		var timeout;
		var enter_listener = from_state.once_enter(function() {
			if(!_.isUndefined(timeout)) {
				window.clearTimeout(timeout);
				timeout = undefined;
			}
			timeout = window.setTimeout(_.bind(self.notify, self), self.delay);
		});

		from_state.on_exit(function() {
			if(!_.isUndefined(timeout)) {
				window.clearTimeout(timeout);
				timeout = undefined;
			}
			from_state.off(enter_listener);
		});
	};
	proto.notify = function() {
		var event = {
			type: "timeout"
			, delay: this.delay
			, current_time: (new Date()).getTime()
			, created_at: this.created_at
		};

		this.transition.run(event);
	};
}(red._create_event_type("timeout").prototype));

}(red));
