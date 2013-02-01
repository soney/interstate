(function(red) {
var cjs = red.cjs, _ = red._;

(function(proto) {
	proto.on_create = function(type, targets) {
		this._bubble_listener = _.bind(function(event) {
			event.preventDefault();
			red.event_queue.wait();
			if(event.target && event.target.__red_owner__) {
				event = _.extend({}, event, {
					target: event.target.__red_owner__
				});
			}
			this.fire.apply(this, arguments);
			_.defer(function() {
				red.event_queue.signal();
			});
		}, this);

		this.live_fn = cjs.liven(function() {
			this.remove_listeners();
			this.type = cjs.get(type);
			var targs = cjs.get(targets);
			if(!_.isArray(targs)) {
				targs = [targs];
			}
			this.targets = _.chain(targs)
							.map(function(targ) {
								if(_.isElement(targ) || targ === window) {
									return targ;
								} else if(targ instanceof red.RedDict) {
									var targ_context = targ.get_default_context();
									var manifestations = targ.get_manifestation_objs(targ_context);
									var dom_attachments;

									if(_.isArray(manifestations)) {
										return _.map(manifestations, function(manifestation) {
											var manifestation_context = targ_context.push(manifestation);
											var dom_attachment = parent.get_attachment_instance("dom", manifestation_context);
											if(dom_attachment) {
												return dom_attachment.get_dom_obj();
											} else {
												return false;
											}
										});
									} else {
										var dom_attachment = targ.get_attachment_instance("dom", targ_context);
										if(dom_attachment) {
											return dom_attachment.get_dom_obj();
										}
									}
								}
								return false;
							})
							.flatten(true)
							.compact()
							.tap(function() {
								console.log(arguments);
							})
							.value();
			this.add_listeners();
		}, {
			context: this
		});
	};
	proto.clone = function() {
		return red.create_event("dom_event", this.type, this.targets);
	};
	proto.add_listeners = function() {
		_.each(this.targets, function(target) {
			target.addEventListener(this.type, this._bubble_listener, false); // Bubble
		}, this);
	};
	proto.remove_listeners = function() {
		_.each(this.targets, function(target) {
			target.removeEventListener(this.type, this._bubble_listener, false); // Bubble
		}, this);
	};
	proto.destroy = function() {
		this.live_fn.destroy();
		this.remove_listeners();
	};
}(red._create_event_type("dom_event").prototype));
}(red));
