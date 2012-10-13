(function(red) {
var cjs = red.cjs, _ = red._;

var RedGroup = function(options, defer_initialization) {
	options = options || {};

	this.type = "red_group";
	this.id = _.uniqueId();

/*
	this._default_context = cjs(options.default_context, true);
	this._template = cjs.$();
	this._basis = cjs.$();
	*/
	if(defer_initialization === true) {
		//this.initialize = _.bind(this.do_initialize, this, options);
	} else {
		this.do_initialize(options);
	}
};
(function(my) {
	var proto = my.prototype;

	proto.do_initialize = function(options) {
		red.install_instance_builtins(this, options, my);
	};

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

	proto.serialize = function() {
		var rv = {};

		var self = this;
		_.each(my.builtins, function(builtin, name) {
			if(builtin.serialize !== false) {
				var getter_name = builtin.getter_name || "get_" + name;
				rv[name] = red.serialize(self[getter_name]());
			}
		});

		return rv;
	};
	my.deserialize = function(obj) {
		var serialized_options = {};
		_.each(my.builtins, function(builtin, name) {
			if(builtin.serialize !== false) {
				serialized_options[name] = obj[name];
			}
		});

		var rv = new RedGroup(undefined, true);
		rv.initialize = function() {
			var options = {};
			_.each(serialized_options, function(serialized_option, name) {
				options[name] = red.deserialize(serialized_option);
			});
			this.do_initialize(options);
		};

		return rv;
	};

}(RedGroup));

red.RedGroup = RedGroup;

red.define("group", function(options) {
	var group = new RedGroup(options);
	return group;
});

}(red));
