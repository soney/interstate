/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var get_event = function (tree, options, live_event_creator) {
		var event_constraint = red.get_parsed_$(tree, options);
		var got_event, actions;
		if(event_constraint instanceof red.MultiExpression) {
			got_event = cjs.get(event_constraint.first());
			actions = event_constraint.rest();
			/*


			var got_value = cjs.get(event_constraint);
			event = got_value.first();
			actions = got_value.rest();
			*/
		} else {
			got_event = cjs.get(event_constraint);
			actions = [];
			/*
			//got_value = cjs.get(event_constraint);
			event = cjs.get(event_constraint);
			actions = [];
			*/
		}
		//var got_value = cjs.get(event_constraint, false);
		//console.log(got_value);
		if (got_event instanceof red.Event) {
			return {event: got_event, actions: actions};
		} else {
			if(cjs.is_$(event_constraint)) {
				cjs.removeDependency(event_constraint, live_event_creator);
			}
			var event = new red.ConstraintEvent(event_constraint, got_event);
			return {event: event, actions: actions};
		}
	};

	red.ParsedEvent = function () {
		red.Event.apply(this, arguments);
		this._initialize();
		this._type = "parsed_event";
	};
	(function (My) {
		_.proto_extend(My, red.Event);
		var proto = My.prototype;
		proto.set_transition = function (transition) {
			My.superclass.set_transition.apply(this, arguments);
			if (this._old_event) {
				this._old_event.set_transition(this.get_transition());
			}
		};

		proto.on_create = function (options) {
			this._id = uid();
			red.register_uid(this._id, this);

			this.options = options;
			this._str = cjs.is_constraint(options.str) ? options.str : cjs(options.str);
			if (options.inert !== true) {
				var SOandC = red.find_stateful_obj_and_context(options.context);

				var context;
				var parent;

				if (SOandC) {
					context = SOandC.context;
					parent = SOandC.stateful_obj;
				} else {
					context = options.context;
					parent = options.context.points_at();
				}

				this._tree = cjs(function () {
					return esprima.parse(this.get_str());
				}, {
					context: this
				});

				this._old_event = null;
				//cjs.wait(); // ensure our live event creator isn't immediately run
				this._live_event_creator = cjs.liven(function () {
					if (this._old_event) {
						this._old_event.off_fire(this.child_fired, this);
						this._old_event.destroy(true); //destroy silently (without nullifying)
					}

					var tree, event_info = false, event = false;
					cjs.wait();
					try {
						tree = this._tree.get();
						if(tree instanceof red.Error) {
							//console.log("no event");
							event = null;
						} else {
							event_info = get_event(tree, {
								parent: parent,
								context: context
							}, this._live_event_creator);
							event = event_info.event;
						}
					} catch(e) {
						console.error(e);
					} finally {
						cjs.signal();
					}

					if (event) {
						event.set_transition(this.get_transition());
						event.on_fire(this.child_fired, this, event_info.actions);
						if (this.is_enabled()) {
							event.enable();
						}
					}

					this._old_event = event;
				}, {
					context: this,
					run_on_create: false
				});
				//cjs.signal();
				_.delay(_.bind(function () {
					//Delay it because parsed events can run up the dictionary tree and create all sorts of contextual objects that they shouldn't
					//Delay it because if an event relies on an object's inherited property while the object is still being created, we're all fucked
					this.on_ready();
				}, this));
			}
		};
		proto.on_ready = function() {
				if(this._live_event_creator && this.is_enabled()) {
				this._live_event_creator.run(false);
			}
		};
		proto.id = function () { return this._id; };
		proto.child_fired = function (actions) {
			var fire_args = _.rest(arguments);
			_.each(actions, function(expression) {
				if(expression.invalidate) {
					expression.invalidate();
				}
				cjs.get(expression, false);
			});
			this.fire.apply(this, fire_args);
		};
		proto.get_str = function () { return this._str.get(); };
		proto.set_str = function (str) {
			this._str.set(str);
			this._emit("setString", {
				to: str
			});
		};
		proto.create_shadow = function (parent_statechart, context) {
			var rv = new My({str: this.get_str(), context: context, inert_shadows: this.options.inert_shadows, inert: this.options.inert_shadows});
			this.on("setString", function (e) {
				rv.set_str(e.to);
			});
			return rv;
		};
		proto.destroy = function () {
			if (this._old_event) {
				this._old_event.off_fire(this.$child_fired);
				this._old_event.destroy();
				delete this._old_event;
			}
			if (this._live_event_creator) {
				this._live_event_creator.destroy(true);
				delete this._live_event_creator;
			}
			if(this._str) {
				this._str.destroy();
				delete this._str;
			}
			red.unregister_uid(this.id());
			My.superclass.destroy.apply(this, arguments);
		};
		proto.clone = function () {
		};
		proto.stringify = function () {
			return this._str.get();
		};
		red.register_serializable_type("parsed_event",
			function (x) {
				return x instanceof My;
			},
			function () {
				return {
					str: this.get_str(),
					inert: this.options.inert
				};
			},
			function (obj) {
				return new My({
					str: obj.str,
					inert: obj.inert
				});
			});
		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
			if (this._old_event) {
				this._old_event.enable();
			}
			if(this._live_event_creator && this._live_event_creator.resume()) {
				this._live_event_creator.run();
			}
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
			if (this._old_event) {
				this._old_event.disable();
			}
			if(this._live_event_creator) {
				this._live_event_creator.pause();
			}
		};
	}(red.ParsedEvent));
}(red));
