(function(red) {
var cjs = red.cjs, _ = red._;

red.install_proto_builtins = function(proto, builtins) {
	console.log(proto, builtins);
};

red.install_instance_builtins = function(obj, options, constructor) {
	var builtins = constructor.builtins;

	obj._builtins = {};
	_.each(builtins, function(builtin, name) {
		obj._builtins[name] = builtin.default();
	});
};

}(red));
