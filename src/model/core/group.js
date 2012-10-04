(function(red) {
var cjs = red.cjs, _ = red._;

var RedGroup = function(options) {
	options = options || {};

	this.type = "red_group";
	this.id = _.uniqueId();

/*
	this._default_context = cjs(options.default_context, true);
	this._template = cjs.$();
	this._basis = cjs.$();
	*/
	red.install_instance_builtins(this, options, arguments.callee);
};
(function(my) {
	var proto = my.prototype;
	my.builtins = {
		"template": {
			start_with: function() { return cjs.$(); }
			, setter: function(me, val) { me.set(val); }
			, getter: function(me) { return me.get(); }
			, env_visible: true
		}

		, "basis": {
			start_with: function() { return cjs.$(); }
			, setter: function(me, val) { me.set(val); }
			, getter: function(me) { return me.get(); }
			, env_visible: true
		}
		, "default_context": {
			start_with: function() { return cjs.$(); }
			, getter: function(me) { return me.get(); }
			, setter: function(me, val) { me.set(val); }
		}
	};

	red.install_proto_builtins(proto, my.builtins);

	//
	// === GETTER ===
	//
	
	proto.get = function(context) {
		var basis = this.get_basis();
		basis = red.get_contextualizable(basis, context);
		var template = this.get_template();

		if(this._last_basis === basis && this._last_template === template) {
			return this._last_rv;
		} else {
			_.forEach(this._last_rv, function(dict) {
				dict.destroy();
			});
			this._last_rv = undefined;
		}

		var rv;
		if(_.isNumber(basis)) {
			rv = [];
			_.times(basis, function(index) {
				var dict = red.create("stateful_obj", {defer_statechart_invalidation: true, direct_protos: template});
				dict.set_prop("basis", index);
				rv.push(dict);
			});
		} else if(_.isArray(basis)) {
			rv = _.map(basis, function(basis_obj) {
				var dict = red.create("stateful_obj", {defer_statechart_invalidation: true, direct_protos: template});
				dict.set_prop("basis", basis_obj);
				return dict;
			});
		} else {
			rv = [];
		}
		this._last_basis = basis;
		this._last_template  = template;
		this._last_rv = rv;
		return rv;
	};

	proto.is_inherited = function() { return false; };

}(RedGroup));

red.RedGroup = RedGroup;

red.define("group", function(options) {
	var group = new RedGroup(options);
	return group;
});

}(red));
