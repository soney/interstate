(function(red) {
var cjs = red.cjs, _ = cjs._;
var Context = function(options) {
	this._options = _.extend({
		thisable: true
		, parent: undefined
	}, options);
	this._props = {};
	this._listeners = {};
};
(function(my) {
	var proto = my.prototype;
	proto.make_thisable = function(thisable) {
		this._options.thisable = thisable;
		this._notify("thisable_changed", {
			prop_name: prop_name
		});
		return this;
	};
	proto.is_thisable = function() {
		return !!this._options.thisable;
	};
	proto.parent = function() {
		return this._options.parent;
	};
	proto.set_parent = function(parent) {
		this._options.parent = parent;
		this._notify("parent_changed");
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

	proto._get_prop = function(prop_name) {
		return this._props[prop_name];
	};

	proto.set_prop = function(prop_name, value) {
		this._props[prop_name] = value;
		this._notify("prop_changed", {
			prop_name: prop_name
		});
		return this;
	};

	proto.get_parent_constraint = function() {
		var constraint = cjs(function() {
			return self._get_this();
		});
		this._on("parent_changed", constraint.nullify);
		return constraint;
	};

	proto.get_prop_constraint = function(prop_name) {
		var self = this;
		var constraint = cjs(function() {
			return self.get_prop(cjs.get(prop_name));
		});
		this._on("prop_changed", constraint.nullify);
		return constraint;
	};

	proto.get_this_constraint = function() {
		var self = this;
		var constraint = cjs(function() {
			return self._get_this();
		});
		this._on("parent_changed", constraint.nullify);
		this._on("thisable_changed", constraint.nullify);
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
}(Context));

red.create_context = function(options) {
	return new Context(options);
};
}(red));
