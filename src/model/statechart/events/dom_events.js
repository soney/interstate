(function(red) {
var cjs = red.cjs, _ = red._;

(function(my) {
	var proto = my.prototype;
	proto.on_create = function(type, targets) {
		var self = this;
		this.get_target_listener = cjs.memoize(_.bind(function(specified_target) {
			var listener = _.bind(function(event) {
				red.event_queue.wait();

				event = _.extend({}, event, {
					specified_target: specified_target
				});

				this.fire(event);
				_.defer(function() {
					red.event_queue.signal();
				});
			}, this);
			return listener;
		}, this));


		this.live_fn = cjs.liven(function() {
			this.remove_listeners();
			this.type = cjs.get(type);
			var targs = cjs.get(targets);
			if(!_.isArray(targs)) {
				targs = [targs];
			}
			this.targets = _.chain(targs)
							.map(function(target_cobj) {
								if(_.isElement(target_cobj) || target_cobj === window) {
									return target_cobj;
								} else if(target_cobj instanceof red.ContextualDict) {
									if(target_cobj.is_template()) {
										var instances = target_cobj.instances();
										return _.map(instances, function(instance) {
											var dom_attachment = instance.get_attachment_instance("dom");
											if(dom_attachment) {
												return instance.get_dom_obj();
											}
											return false;
										});
									} else {
										var dom_attachment = target_cobj.get_attachment_instance("dom");
										if(dom_attachment) {
											return dom_attachment.get_dom_obj();
										}
									}
								}
								return false;
							})
							.flatten(true)
							.compact()
							.value();
			this.add_listeners();
		}, {
			context: this
		});
	};
	proto.clone = function() {
		return red.create_event("dom", this.type, this.targets);
	};
	proto.add_listeners = function() {
		_.each(this.targets, function(target) {
			target.addEventListener(this.type, this.get_target_listener(target), false); // Bubble
		}, this);
	};
	proto.remove_listeners = function() {
		_.each(this.targets, function(target) {
			target.removeEventListener(this.type, this.get_target_listener(target), false); // Bubble
		}, this);
	};
	proto.destroy = function() {
		this.live_fn.destroy();
		this.remove_listeners();
	};

	proto.enable = function() {
		my.superclass.enable.apply(this, arguments);
	};
	proto.disable = function() {
		my.superclass.disable.apply(this, arguments);
	};
}(red._create_event_type("dom")));
}(red));
