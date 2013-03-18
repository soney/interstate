(function(red) {
var cjs = red.cjs, _ = red._;


red.StatefulObj = function(options, defer_initialization) {
	options = options || {};
	red.StatefulObj.superclass.constructor.apply(this, arguments);

	this.type = "red_stateful_obj";

	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
};
(function(my) {
	_.proto_extend(my, red.Dict);
	var proto = my.prototype;

	proto.do_initialize = function(options) {
		my.superclass.do_initialize.apply(this, arguments);
		red.install_instance_builtins(this, options, my);
	};

	my.builtins = {
		"direct_statechart": {
			default: function() { return red.create("statechart"); }
			, getter_name: "get_own_statechart"
			, settable: false
		}
	};
	red.install_proto_builtins(proto, my.builtins);
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
		var own_statechart = this.get_own_statechart();
		own_statechart.destroy();
	};

	red.register_serializable_type("stateful_obj",
									function(x) { 
										return x instanceof my;
									},
									my.superclass.serialize,
									function(obj) {
										var rest_args = _.rest(arguments);
										var builtins = _.extend({}, my.builtins, my.superclass.constructor.builtins);

										var serialized_options = {};
										_.each(builtins, function(builtin, name) {
											serialized_options[name] = obj[name];
										});

										var rv = new my({uid: obj.uid}, true);
										rv.initialize = function() {
											var options = {};
											_.each(serialized_options, function(serialized_option, name) {
												options[name] = red.deserialize.apply(red, ([serialized_option]).concat(rest_args));
											});
											this.do_initialize(options);
										};

										return rv;
									});
}(red.StatefulObj));

red.define("stateful_obj", function(options, defer_init) {
	var dict = new red.StatefulObj(options, defer_init);
	return dict;
});

}(red));
