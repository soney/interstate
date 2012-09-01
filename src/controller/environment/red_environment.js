(function(red) {
var cjs = red.cjs, _ = cjs._;
var Env = function(dom_container_parent) {
	this._root = cjs.create("red_dict", {direct_attachments: [cjs.create("red_dom_attachment")]});
	this._root_context = cjs.create("red_context");

	// Undo stack
	this._command_stack = cjs.create("command_stack");

	this.initialize_props();
};

(function(my) {
	var proto = my.prototype;

	proto.initialize_props = function() {
	};

	proto._do = function(command) { this._command_stack._do(command); };
	proto.undo = function() { this._command_stack._undo(); };
	proto.redo = function() { this._command_stack._redo(); };

	proto.get_root = function() { return this._root; };
	proto.get_root_context = function() { return this._root_context; };
}(Env));

red.create_environment = function(dom_container_parent) {
	var env = new Env(dom_container_parent);
	return env;
};
}(red));
