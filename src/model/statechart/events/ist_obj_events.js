/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,RedMap,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
		
	var listener_map = new RedMap({
		equals: ist.check_contextual_object_equality,
		hash: function(obj) {
			if(obj.hash) {
				return obj.hash();
			} else {
				return obj.toString();
			}
		}
	});

	ist.emit = function (type, target) {
		target = target || window;
		var target_listeners = listener_map.get(target);
		if (target_listeners) {
			var listeners = target_listeners[type];
			if(listeners && listeners.length > 0) {
				var args = _.rest(arguments, 2);
				if(args.length === 0) { // no event object
					args = [{
						target: target,
						timestamp: (new Date()).getTime()
					}];
				}
				ist.event_queue.wait();
				_.each(listeners, function (listener) {
					listener.fire.apply(listener, args);
				});
				ist.event_queue.signal();
			}
		}
	};
	ist.register_serializable_type("ist_emit_func",
		function (x) {
			return x === ist.emit;
		},
		function () {
			return {};
		},
		function (obj) {
			return ist.emit;
		});

	ist.IstObjEvent = function() {
		ist.Event.apply(this, arguments);
		this._initialize();
		this._type = "ist_obj_event";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (specified_type, specified_targets) {
			this.specified_type = specified_type;
			this.specified_targets = specified_targets;
			this.targets = [];

			this.live_fn = cjs.liven(function () {
				var type = cjs.get(this.specified_type);
				var st = cjs.get(this.specified_targets);
				if(!_.isArray(st)) {
					st = [st];
				}
				
				var targets = _	.chain(st)
								.map(function(target) {
									if(target instanceof ist.Query) {
										return target.value();
									} else {
										return target;
									}
								})
								.flatten(true)
								.map(function(cobj) {
									if(cobj instanceof ist.ContextualDict) {
										if(cobj.is_template()) {
											return cobj.instances();
										} else {
											return cobj;
										}
									} else if(cobj === window) {
										return cobj;
									} else {
										return false;
									}
								})
								.flatten(true)
								.compact()
								.map(function(target) {
									return {
										cobj: target,
										type: type
									};
								})
								.value();

				var diff = _.diff(this.targets, targets, function(a, b) {
					return a.cobj === b.cobj && a.type === b.type;
				});

				_.each(diff.removed, function(x) { this.remove_listener(x.from_item); }, this);
				_.each(diff.added, function(x) { this.add_listener(x.item); }, this);

				this.targets = targets;
			}, {
				context: this,
				run_on_create: false
			});
			//if(this.is_enabled()) {
				//console.log("enable");
			this.live_fn.run(false);
			//}
			/*
			if (!_.isArray(targets)) {
				targets = [targets];
			}
			this.targets = _.chain(targets)
			this.add_listeners();
			*/
		};

		proto.add_listeners = function () {
			_.each(this.targets, this.add_listener, this);
		};
		proto.add_listener = function(target_info) {
			var target = target_info.cobj,
				type = target_info.type;

			if(target instanceof ist.ContextualObject) {
				target.on("begin_destroy", this.remove_listener, this, target_info);
			}
			var must_add = true;
			var target_listeners = listener_map.get_or_put(target, function () {
				must_add = false;
				var event_types = {};
				event_types[type] = [this];
				return event_types;
			}, this);

			if (must_add) {
				var type_listeners = target_listeners[type];
				if (type_listeners) {
					type_listeners.push(this);
				} else {
					target_listeners[type] = [this];
				}
			}
		};
		proto.remove_listener = function(target_info) {
			var target = target_info.cobj,
				type = target_info.type;

			var target_listeners = listener_map.get(target);
			if(target_listeners) {
				var listeners = target_listeners[type];
				if (_.isArray(listeners)) {
					var listener_index = _.indexOf(listeners, this);
					if(listener_index >= 0) {
						listeners.splice(listener_index, 1);
						if(target instanceof ist.ContextualObject) {
							target.off("begin_destroy", this.remove_listener, this);
						}
						var len = listeners.length;
						if (len === 0) {
							delete target_listeners[type];
							if (_.size(target_listeners) === 0) {
								listener_map.remove(target);
							}
						}
					}
				}
			}
		};

		proto.remove_listeners = function () {
			_.each(this.targets, this.remove_listener, this);
		};

		proto.create_shadow = function (parent_statechart, context) {
			var shadow = new My();
			this.on_fire(function () {
				//ist.event_queue.wait();
				shadow.fire();
				//ist.event_queue.signal();
			});
			return shadow;
		};
		proto.destroy = function () {
			//listener_map.clear();
			this.live_fn.destroy(true);
			this.remove_listeners();
			delete this.targets;
			My.superclass.destroy.apply(this, arguments);
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			if(!this.is_enabled()) {
				this.add_listeners();
				if(this.live_fn.resume()) {
					this.live_fn.run();
				}
			}
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
			if(this.is_enabled()) {
				this.live_fn.pause();
				this.remove_listeners();
			}
		};
	}(ist.IstObjEvent));
}(interstate));
