(function(red) {
var cjs = red.cjs, _ = cjs._;

(function(proto) {
	proto.clone = function() {
		return red.create_event("manual");
	};
}(red._create_event_type("manual").prototype));
}(red));
