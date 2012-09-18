var red = (function(root) {
	var red = function() { };
	red.cjs = cjs.noConflict();
	red.esprima = esprima;
	red._ = _.noConflict();
	red.__debug = true;

	var factories = {};
	red.define = function(type, factory) {
		factories[type] = factory;
	};
	red.create = function(type) {
		if(factories.hasOwnProperty(type)) {
			var factory = factories[type];
			var args = [].slice.call(arguments, 1);
			return factory.apply(root, args);
		} else {
			return undefined;
		}
	};
	return red;
}(this));
