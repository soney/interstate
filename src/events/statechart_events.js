(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

(function(proto) {
	proto.on_create = function(statechart) {
		statechart._on("run", _.bind(this.do_transition, this));
	};
	proto.do_transition = function() {
		this.fire({
			type: "init"
		});
	};
}(red._create_event_type("init").prototype));

}(red));
