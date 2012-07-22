(function(red) {
var cjs = red.cjs, _ = cjs._;
var esprima = window.esprima;

(function(proto) {
	proto.on_create = function(str) {
		this.set_str(str);
	};
	proto.clone = function() {
		return red.create_event("parsed", this.str);
	};
	proto.set_str = function(str) {
		this._str = str;
		this.update_tree();
		return this;
	};
	proto.get_str = function() { return this._str; };
	proto.update_tree = function() {
		this._tree = esprima.parse(this.get_str());
	};
	proto.update_value = function() {
	};
}(red._create_event_type("parsed").prototype));
}(red));
