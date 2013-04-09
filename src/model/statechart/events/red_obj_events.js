/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
		
	var listener_map = new RedMap({
		equals: red.check_contextual_object_equality,
		hash: "hash"
	});

	red.emit = function (type, target) {
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


	(function (my) {
		var proto = my.prototype;
		proto.on_create = function (type, targets) {
			this.type = type;
			this.targets = _.flatten(targets);
		};

		proto.destroy = function () {
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
			}, this);
		};

		proto.remove_listeners = function () {
			_.each(this.targets, function (target) {
				var target_listeners = listener_map.get(target);
				if (_.isArray(target_listeners)) {
					var listeners = target_listeners[this.type];
					if (_.isArray(listeners)) {
						var listener_index = _.indexOf(listeners, this);
						listeners.splice(listener_index, 1);
						var len = listeners.length;
						if (len === 0) {
							delete target_listeners[this.type];
							if (_.size(listeners) === 0) {
								listener_map.unset(target);
							}
						}
					}
				}
			}, this);
		};
		proto.create_shadow = function (parent_statechart, context) {
			var shadow = red.create_event("red_obj");
			this.on_fire(function () {
				red.event_queue.wait();
				shadow.fire();
				red.event_queue.signal();
			});
			return shadow;
		};
		proto.destroy = function () {
			my.superclass.destroy.apply(this, arguments);
		};

		proto.enable = function () {
			my.superclass.enable.apply(this, arguments);
			this.add_listeners();
		};
		proto.disable = function () {
			my.superclass.disable.apply(this, arguments);
			this.remove_listeners();
		};
	}(red._create_event_type("red_obj")));
}(red));
