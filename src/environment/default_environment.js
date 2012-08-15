(function(red) {
var cjs = red.cjs, _ = cjs._;

var Env = function() {
	this.root = cjs.create("red_dict");
	this._command_stack = [];
	this._command_index = -1;

	this.initialize_protos();
};

(function(my) {
	var proto = my.prototype;

	proto.initialize_protos = function() {
		var dom_obj = red.blueprints.dom_obj();
		this.root.set_prop("dom", dom_obj);

		var sample_obj = cjs.create("red_stateful_obj");
		sample_obj.set_protos([dom_obj]);
		sample_obj.set_prop("tag", "div");
		sample_obj.set_prop("backgroundColor", "orange");
		sample_obj.set_prop("width", "50px");
		sample_obj.set_prop("height", "50px");
	};

	proto._do = function(command) {
	};
	proto._undo = function() {
	};
	proto._redo = function() {
	};
	
}(Env));

red.create_environment = function() {
	var env = new Env();
	return env;
};
}(red));
