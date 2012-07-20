(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var parse_event = function(str) {
};

(function(proto) {
	proto.on_create = function(str) {
		this.str = str;
		this.parse_tree = parse_event(str);
		var tree = jsep(str, { });
	};
	proto.clone = function(context) {
		return red.create_event("parsed", this.str);
	};
}(red._create_event_type("parsed").prototype));
}(red));
