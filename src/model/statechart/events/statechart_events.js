(function(red) {
var cjs = red.cjs, _ = red._;

var StatechartEvent = red._create_event_type("statechart");
red.StatechartEvent = StatechartEvent;

(function(my) {
	var proto = my.prototype;
	proto.on_create = function(statecharts, spec) {
		if(!_.isArray(statecharts)) { statecharts = [statecharts]; }
		this.statecharts = statecharts;
		this._spec = spec;
		this.$on_change = _.bind(this.on_change, this);
		_.each(this.statecharts, function(statechart) {
			statechart.on(this._spec, this.$on_change);
		}, this);
	};
	proto.destroy = function() {
		_.each(this.statecharts, function(statechart) {
			statechart.off(this._spec, this.$on_change);
		}, this);
	};
	proto.on_change = function(event, to_state_name, from_state_name, statechart) {
		this.fire(event);
	};
	proto.serialize = function() {
		return {
			spec: this._spec,
			statecharts: red.serialize(this.statecharts)
		};
	};
	my.deserialize = function(obj) {
		return red.create_event("statechart", red.deserialize(obj.statecharts), obj.spec);
	};
	proto.create_shadow = function(parent_statechart, context) {
		return red.create_event("statechart", parent_statechart, this._spec);
	};
	proto.stringify = function() { return "" + this.statecharts[0].id() + ":" + this._spec + ""; };
}(StatechartEvent));

}(red));