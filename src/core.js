(function(root) {
	var red_call = function() {
	};

	var red = function() {
		return red_call.apply(root, arguments);
	};
	red._debug = true;
	red.cjs = cjs.noConflict();
	red.esprima = esprima;


	var old_red = root.red;
	root.red = red;

	red.noConflict = function() {
		root.red = old_red;
		return red;
	};

}(this));
