(function(red) {
var cjs = red.cjs, _ = red._;

red.install_proto_builtins = function(proto, builtins) {
	_.each(builtins, function(builtin, name) {
		var getter_name = builtin.getter_name || "get_" + name;
		builtin._get_getter_name = function() { return getter_name; }
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
		builtin._get_setter_name = function() { return setter_name; }
		if(_.isFunction(builtin.setter)) {
			proto[setter_name] = function() {
				return builtin.setter.apply(this, ([this._builtins[name]]).concat(_.toArray(arguments)));
			};
		} else if(builtin.settable !== false) {
			proto[setter_name] = function(set_to) {
				this._builtins[name] = set_to;
			};
		}

		var env_name = builtin.env_name || name;
		builtin._get_env_name = function() { return env_name; }
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
					obj._builtins[name] = builtin.default.call(obj);
				}
			}
		} else {
			if(options && _.has(options, name)) {
				obj[setter_name](options[name]);
			} else if(_.isFunction(builtin.default)) {
				obj[setter_name](builtin.default.call(obj));
			}
		}
	});
};

var default_hash = function() {
	var rv = "";
	for(var i = 0; i<arguments.length; i++) {
		rv += "" + arguments[i];
	}
	return rv;
};
var default_equals = function(args1, args2) {
	if(args1.length === args2.length) {
		for(var i = 0; i<args1.length; i++) {
			var arg1 = args1[i],
				arg2 = args2[i];
			if(arg1 !== arg2) {
				return false;
			}
		}
		return true;
	} else {
		return false;
	}
};

}(red));
