(function(red) {
var cjs = red.cjs, _ = red._;

red.make_this_optionable = function(instance) {
	instance.options = _.extend.apply(_, [{}].concat(_.rest(arguments)));
};

red.make_proto_optionable = function(proto) {
	proto._get_option = function(key) {
		var value = this.options[key];
		if(_.isFunction(value)) {
			return value.call(this);
		} else {
			return value;
		}
	};
	proto._set_option = function(key, value) {
		this.options[key] = value;
	};

	proto._on_option_set = function(key, value) { };
	proto._on_options_set = function(values) { };

	proto.option = function(key) {
		if(arguments.length === 0) {
			return this;
		} else if(_.isString(key)) {
			if(arguments.length === 1) {
				return this._get_option(key);
			} else {
				var args = _.rest(arguments);
				this._set_option.apply(this, [key].concat(args));
				this._on_option_set.apply(this, [key].concat(args));

				var keys_val = {};
				keys_val[key] = arguments[1];
				this._on_options_set.apply(this, [keys_val].concat(args));

				return this;
			}
		} else {
			var args = _.rest(arguments);
			_.each(key, function(v, k) {
				this._set_option.apply(this, [k, v].concat(args));
				this._on_option_set.apply(this, [k, v].concat(args));
			}, this);
			this._on_options_set.apply(this, [key].concat(args));
			return this;
		}
	};
};

}(red));
