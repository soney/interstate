(function(red) {
var cjs = red.cjs, _ = cjs._;
var Context = function(options) {
	_options = _.extend({
		thisable: true
		, parent: null
		, props: cjs.create("map")
	});
	this._thisable = cjs(_options.thisable);
	this._parent = cjs(_options.parent);
	this._props = _options.map;
	this._listeners = {};
};
(function(my) {
	var proto = my.prototype;
	proto.make_thisable = function(thisable) {
		this._thisable.set(thisable);
		return this;
	};
	proto.is_thisable = function() {
		return !!this._thisable.get();
	};
	proto.parent = function() {
		return this._parent.get();
	};
	proto.set_parent = function(parent) {
		this._parent.set(parent);
		return this;
	};
	proto._get_this = function() {
		if(this.is_thisable()) {
			return this;
		} else {
			var parent = this.parent();
			if(parent) {
				return parent.get_this();
			}
			return null;
		}
	};

	proto._has_prop = function(prop_name) {
		return _.has(this._props.has_key(prop_name), prop_name);
	};

	proto._get_prop = function(prop_name) {
		return this._props.get(prop_name);
	};

	proto.set_prop = function(prop_name, value) {
		this._props.set(prop_name, value);
		return this;
	};
	proto.unset_prop = function(prop_name) {
		this._props.unset(prop_name);
		return this;
	};

	proto.get_parent_constraint = function() {
		var constraint = cjs(function() {
			return self._get_parent();
		});
		return constraint;
	};

	proto.get_prop_constraint = function(prop_name) {
		var self = this;
		var constraint = cjs(function() {
			var pn = cjs.get(prop_name);
			if(self._has_prop(pn)) {
				return self._get_prop(cjs.get(prop_name));
			} else {
				var parent = this._get_parent();
				if(parent) {
					return parent._get_prop(pn);
				} else {
					return undefined;
				}
			}
		});
		return constraint;
	};

	proto.get_this_constraint = function() {
		var self = this;
		var constraint = cjs(function() {
			return self._get_this();
		});
		return constraint;
	};

	proto._on = function(event_type, func) {
		var listeners;
		if(_.has(this._listeners, event_type)) {
			listeners = this._listeners[event_type];
		} else {
			this._listeners[event_type] = listeners = [];
		}
		listeners.push(func);
		return this;
	};

	proto._off = function(event_type, func) {
		var listeners = this._listeners[event_type];
		this._listeners[event_type] = _.without(this._listeners[event_type], func);
		if(_.isEmpty(this._listeners[event_type])) {
			delete this._listeners[event_type];
		}
		return this;
	};

	proto._notify = function(event_type, event) {
		var listeners = this._listeners[event_type];
		_.forEach(listeners, function(func) {
			func(event);
		});
		return this;
	};
	proto.is = function(x) { return x === "context"; };
}(Context));

cjs.define("red_context", function(options) {
	return new Context(options);
});
}(red));
