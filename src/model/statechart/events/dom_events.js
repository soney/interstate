(function(red) {
var cjs = red.cjs, _ = red._;

(function(proto) {
	proto.on_create = function(type, target) {
		this.type = type;
		this.target = target;
		this.add_listener();
	};
	proto.clone = function() {
		return red.create_event("dom_event", this.type, this.target);
	};
	proto.set_type = function(type) {
		this.remove_listener();
		this.type = type;
		this.add_listener();
	};
	proto.set_target = function(target) {
		this.remove_listener();
		this.target = target;
		this.add_listener();
	};
	proto.add_listener = function() {
		this.target.addEventListener(this.type, red.RedEvent.wait, true); // Capture
		this.target.addEventListener(this.type, this.$fire_and_signal, false); // Bubble
	};
	proto.remove_listener = function() {
		this.target.removeEventListener(this.type, red.RedEvent.wait, true); // Capture
		this.target.removeEventListener(this.type, this.$fire_and_signal, false); // Bubble
	};
	proto.destroy = function() {
		this.remove_listener();
	};
}(red._create_event_type("dom_event").prototype));
}(red));
