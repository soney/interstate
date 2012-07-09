(function(root) {
	var red_call = function() {
	};

	var red = function() {
		return red_call.apply(root, arguments);
	};
	red.cjs = cjs.noConflict();
	red.jsep = jsep.noConflict();


	var old_red = root.red;
	root.red = red;

	red.noConflict = function() {
		root.red = old_red;
		return red;
	};

}(this));
