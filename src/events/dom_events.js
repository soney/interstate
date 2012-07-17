(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

(function(proto) {
	proto.on_create = function(type, target) {
		target.addEventListener(type, _.bind(this.fire, this));
	};
}(red._create_event_type("dom_event").prototype));
}(red));
