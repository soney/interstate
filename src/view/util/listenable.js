(function(red) {
var cjs = red.cjs, _ = red._;

red.make_this_listenable = function(instance) {
	instance._listeners = {};
};
red.make_proto_listenable = function(proto) {
	proto.on = function(event_type, callback, context) {
		var listeners = this._listeners[event_type];
		if(!_.isArray(listeners)) {
			listeners = this._listeners[event_type] = [];
		}
		listeners.push({callback: callback, context: context});
		return this;
	};
	proto.off = function(event_type, callback) {
		var listeners = this._listeners[event_type];
		if(_.isArray(listeners)) {
			this._listeners[event_type] = _.filter(listeners, function(listener) {
				return listener.callback === callback;
			});
		}
		return this;
	};
	proto._emit = function(event_type) {
		var args = _.rest(arguments);
		_.each(this._listeners[event_type], function(listener) {
			var context = listener.context || this;
			listener.callback.apply(context, args);
		});
	};
};

}(red));
