(function(red) {
var cjs = red.cjs, _ = red._;

(function(proto) {
	proto.on_create = function(statechart, event) {
	/*
		this.time = time;
		var creation_time = (new Date()).getTime();
		var time_diff = this.time - creation_time;

		window.setTimeout(function() {
			self.fire({
				type: "at_time"
				, time: time
				, current_time: (new Date()).getTime()
				, created_at: creation_time
			});
		}, time_diff);
		*/
	};
}(red._create_event_type("statechart").prototype));

}(red));
