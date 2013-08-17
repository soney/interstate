/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
		
	var listener_map = new RedMap({
		equals: red.check_contextual_object_equality,
		hash: function(obj) {
			if(_.has(obj, "hash")) {
				return obj.hash();
			} else {
				return obj.toString();
			}
		}
	});

	red.emit = function (type, target) {
		target = target || window;
		var target_listeners = listener_map.get(target);
		if (target_listeners) {
			var listeners = target_listeners[type];
			var args = _.rest(arguments, 2);
			red.event_queue.wait();
			_.each(listeners, function (listener) {
				listener.fire.apply(listener, args);
			});
			red.event_queue.signal();
		}
	};

	red.RedObjEvent = function() {
		red.Event.apply(this, arguments);
		this._initialize();
		this._type = "red_obj_event";
	};

	(function (My) {
		_.proto_extend(My, red.Event);
		var proto = My.prototype;
		proto.on_create = function (type, targets) {
			this.type = type;
			if (!_.isArray(targets)) {
				targets = [targets];
			}
			this.targets = _.flatten(targets);
			this.add_listeners();
		};

		proto.destroy = function () {
			My.superclass.destroy.apply(this, arguments);
			this.remove_listeners();
		};

		proto.add_listeners = function () {
			_.each(this.targets, function (target) {
				var must_add = true;
				var target_listeners = listener_map.get_or_put(target, function () {
					must_add = false;
					var event_types = {};
					event_types[this.type] = [this];
					return event_types;
				}, this);

				if (must_add) {
					var type_listeners = target_listeners[this.type];
					if (type_listeners) {
						type_listeners.push(this);
					} else {
						target_listeners[this.type] = [this];
					}
				}
				//console.log("Add", target, this.type);
				//debugger;
			}, this);
		};

		proto.remove_listeners = function () {
			_.each(this.targets, function (target) {
				//console.log("REMOVE", target, this.type);
				//debugger;
				var target_listeners = listener_map.get(target);
				if (target_listeners) {
					var listeners = target_listeners[this.type];
					if (_.isArray(listeners)) {
						var listener_index = _.indexOf(listeners, this);
						if(listener_index >= 0) {
							listeners.splice(listener_index, 1);
							var len = listeners.length;
							if (len === 0) {
								delete target_listeners[this.type];
								if (_.size(target_listeners) === 0) {
									listener_map.remove(target);
								}
							}
						}
					}
				}
			}, this);
		};
		proto.create_shadow = function (parent_statechart, context) {
			var shadow = new My();
			this.on_fire(function () {
				red.event_queue.wait();
				shadow.fire();
				red.event_queue.signal();
			});
			return shadow;
		};
		proto.destroy = function () {
			//listener_map.clear();
			this.remove_listeners();
			delete this.targets;
			My.superclass.destroy.apply(this, arguments);
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			if(!this.is_enabled()) {
				this.add_listeners();
			}
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
			if(this.is_enabled()) {
				this.remove_listeners();
			}
		};
	}(red.RedObjEvent));
}(red));
