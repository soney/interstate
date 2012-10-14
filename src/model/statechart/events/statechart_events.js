(function(red) {
var cjs = red.cjs, _ = red._;

(function(proto) {
	proto.on_create = function(statecharts, spec) {
		if(!_.isArray(statecharts)) { statecharts = [statecharts]; }
		this.statecharts = statecharts;
		this.spec = spec;
		this.$on_change = _.bind(this.on_change, this);
		_.each(this.statecharts, function(statechart) {
			statechart.on(this.spec, this.$on_change);
		}, this);
	};
	proto.destroy = function() {
		_.each(this.statecharts, function(statechart) {
			statechart.off(this.spec, this.$on_change);
		}, this);
	};
	proto.on_change = function(event, to_state_name, from_state_name, statechart) {
		event.owner = statechart.owner;
		this.fire(event);
	};
}(red._create_event_type("statechart").prototype));

}(red));
