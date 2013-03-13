(function(red) {
var cjs = red.cjs, _ = red._;

(function(proto) {
	proto.on_create = function(type, targets) {
		var self = this;
		this.get_target_listener = cjs.memoize(_.bind(function(specified_target) {
			var listener = _.bind(function(event) {
				//event.preventDefault();
				red.event_queue.wait();

				event = _.extend({}, event, {
					specified_target: specified_target
				});

				if(specified_target.__red_pointer__) {
					var red_target = new red.PointerValue({ pointer: specified_target.__red_pointer__ });
					event.red_target = red_target;
				}
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
							.map(function(target_pointer) {
								if(_.isElement(target_pointer) || target_pointer === window) {
									return target_pointer;
								} else if(target_pointer instanceof red.PointerValue) {
									var ptr = target_pointer.get_pointer();
									var dict;
									var targ = ptr.points_at();

									var manifestation_pointers;

									if(targ instanceof red.Dict) {
										dict = targ;
										manifestation_pointers = dict.get_manifestation_pointers(ptr);
									} else {
										throw new Error("Unknown target");
									}

									if(_.isArray(manifestation_pointers)) {
										var dom_objs = _.map(manifestation_pointers, function(manifestation_pointer) {
											var dom_attachment = dict.get_attachment_instance("dom", manifestation_pointer);
											if(dom_attachment) {
												return dom_attachment.get_dom_obj();
											} else {
												return false;
											}
										});
										return dom_objs;
									} else {
										var dom_attachment = dict.get_attachment_instance("dom", ptr);
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
}(red._create_event_type("dom").prototype));
}(red));
