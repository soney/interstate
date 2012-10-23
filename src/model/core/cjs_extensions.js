(function(red) {
var cjs = red.cjs, _ = red._;

var define_map_func = function(name, func, context) {
	cjs.$.extend(name, function() {
		var self = this;
		var args = _.toArray(arguments);
		var call_context = context || this;
		return cjs.$(function() {
			var my_val = self.get();
			return func.apply(call_context, ([my_val]).concat(args));
		});
	});
};

define_map_func("pluck", _.pluck, _);
define_map_func("flatten", _.flatten, _);

}(red));
