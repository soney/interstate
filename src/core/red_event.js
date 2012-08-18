(function(red) {
var cjs = red.cjs, _ = cjs._;

(function(proto) {
	proto.on_create = function(parent, str) {
		this._parent = cjs(parent);
		this._str = cjs(str);
	};
	proto.get_str = function() {
		return this._str.get();
	};
	proto.set_str = function(str) {
		this._str.set(str);
	};
	proto.get_parent = function() {
		return this._parent.get();
	};
	proto.set_parent = function(parent) {
		this._parent.set(parent);
	};
	proto.clone = function() {
		return cjs.create_event("red_event");
	};
}(cjs._create_event_type("red_event").prototype));
}(red));
