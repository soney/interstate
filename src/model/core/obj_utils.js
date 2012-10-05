(function(red) {
var cjs = red.cjs, _ = red._;

red.install_proto_builtins = function(proto, builtins) {
	_.each(builtins, function(builtin, name) {
		var getter_name = builtin.getter_name || "get_" + name;
		if(_.isFunction(builtin.getter)) {
			proto[getter_name] = function() {
				return builtin.getter.apply(this, ([this._builtins[name]]).concat(_.toArray(arguments)));
			};
		} else if(builtin.gettable !== false) {
			proto[getter_name] = function() {
				return this._builtins[name];
			};
		}

		var setter_name = builtin.setter_name || "set_" + name;
		if(_.isFunction(builtin.setter)) {
			proto[setter_name] = function() {
				return builtin.setter.apply(this, ([this._builtins[name]]).concat(_.toArray(arguments)));
			};
		} else if(builtin.settable !== false) {
			proto[setter_name] = function(set_to) {
				this._builtins[name] = set_to;
			};
		}
	});
};

red.install_instance_builtins = function(obj, options, constructor) {
	var builtins = constructor.builtins;

	obj._builtins = obj._builtins || {};
	_.each(builtins, function(builtin, name) {
		var setter_name = builtin.setter_name || "set_" + name;
		if(_.isFunction(builtin.start_with)) {
			obj._builtins[name] = builtin.start_with();
		}
		if(builtin.settable === false) { 
			if(!_.isFunction(builtin.start_with)) {
				if(options && _.has(options, name)) {
					obj._builtins[name] = options[name];
				} else if(_.isFunction(builtin.default)) {
					obj._builtins[name] = builtin.default();
				}
			}
		} else {
			if(options && _.has(options, name)) {
				obj[setter_name](options[name]);
			} else if(_.isFunction(builtin.default)) {
				obj[setter_name](builtin.default());
			}
		}
	});
};

}(red));
