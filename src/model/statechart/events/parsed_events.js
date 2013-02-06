(function(red) {
var cjs = red.cjs, _ = red._;
var on_event = red.on_event = function(event_type) {
	var targets;
	if(arguments.length <= 1) { // Ex: mouseup() <-> mouseup(window)
		targets = window;
	} else {
		targets = _.rest(arguments);
	}
	return red.create_event("dom_event", event_type, targets);
};

var get_event = function(tree, options) {
	var event_constraint = red.get_parsed_$(tree, options);
	event_constraint.setOption("auto_add_outgoing_dependencies", false);

	var got_value = event_constraint.get();
	if(got_value instanceof red.Event) {
		return got_value;
	} else {
		return red.create_event("constraint", event_constraint, got_value);
	}
};

var ParsedEvent = red._create_event_type("parsed");
red.ParsedEvent = ParsedEvent;
var id  = 0;
(function(my) {
	var proto = my.prototype;
	proto.on_create = function(options) {
		this.id = id++;
		this.options = options;
		this._str = cjs.is_constraint(options.str) ? options.str : cjs(options.str);
		if(options.inert_super_event !== true) {
			var SOandC = red.find_stateful_obj_and_context(options.context);
			var context = SOandC.context;
			var parent = SOandC.stateful_obj;

			var self = this;
			this._tree = cjs(function() {
				return esprima.parse(self.get_str());
			});

			this.$child_fired = _.bind(this.child_fired, this);

			this._old_event = null;
			this._live_event_creator = cjs.liven(function() {
				if(this._old_event) {
					this._old_event.off_fire(this.$child_fired);
					this._old_event.destroy();
				}

				var tree = this._tree.get();
				cjs.wait();
				var event = get_event(tree, {
						parent: parent,
						context: context
					});
				cjs.signal();

				if(event) {
					event.on_fire(this.$child_fired);
				}

				this._old_event = event;
			}, {
				context: this
			});
		}
	};
	proto.child_fired = function() { this.fire.apply(this, arguments); };
	proto.get_str = function() { return this._str.get(); };
	proto.set_str = function(str) { this._str.set(str); };
	proto.create_shadow = function(parent_statechart, context) {
		return red.create_event("parsed", {str: this._str, context: context});
	};
	proto.destroy = function() {
		if(this._old_event) {
			this._old_event.off_fire(this.$child_fired);
			this._old_event.destroy();
		}
		if(this._live_event_creator) {
			this._live_event_creator.destroy();
		}
	};
	proto.stringify = function() { return "'" + this.get_str() + "'"; };
	proto.serialize = function() { return { str: this.get_str() }; };
	my.deserialize = function(obj) { return red.create_event("parsed", obj.str); };
}(ParsedEvent));
}(red));
