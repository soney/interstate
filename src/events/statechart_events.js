(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

(function(proto) {
	proto.on_create = function(statechart) {
		this._statechart = statechart;
	};
	proto.on_ready = function() {
		this._statechart._on("run", _.bind(this.do_transition, this));
	};
	proto.do_transition = function() {
		var event = {
			type: "init"
		};

		this.transition.run(event);
	};
}(red._create_event_type("init").prototype));

}(red));
