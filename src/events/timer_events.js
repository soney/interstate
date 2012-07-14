(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var absolute_time_event = red._create_event_type("at_time");
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
}(absolute_time_event.prototype));

var timeout_event = red._create_event_type("timeout");
(function(proto) {
	proto.on_create = function(time) {
		this.time = time;
		this.created_at = (new Date()).getTime();
	};
	proto.on_ready = function() {
		var self = this;
		var from_state = this.transition.from_state;
		var enter_listener = from_state.once_enter(_.bind(this.notify, this));

		from_stace.on_exit(function() {
			from_state.off(enter_listener);
		});
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
			type: "timeout"
			, time: this.time
			, current_time: (new Date()).getTime()
			, created_at: this.created_at
		};

		this.transition.run(event);
	};
}(timeout_event.prototype));

}(red));
