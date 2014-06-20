/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var get_event = function (tree, options, live_event_creator) {
		//debugger;
		var event_constraint = ist.get_parsed_$(tree, options);
		var got_event, actions, first_event;
		if(event_constraint instanceof ist.MultiExpression) {
			actions = event_constraint.rest();
			event_constraint = event_constraint.first();
			got_event = cjs.get(event_constraint);
		} else {
			first_event = event_constraint;
			got_event = cjs.get(event_constraint);
			actions = [];
		}
		//var got_value = cjs.get(event_constraint, false);
		//console.log(got_value);
		if (got_event instanceof ist.Event) {
			//event_constraint.destroy(true);
			return {event: got_event, actions: actions};
		} else {
			if(cjs.isConstraint(event_constraint)) {
				cjs.removeDependency(event_constraint, live_event_creator._constraint);
			}
			var event = new ist.ConstraintEvent(event_constraint, got_event);
			return {event: event/*.throttle(10)*/, actions: actions};
		}
	};

	ist.ParsedEvent = function () {
		ist.Event.apply(this, arguments);
		//this._initialize();
		this._type = "parsed_event";
		this._has_errors = false;
	};
	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.set_transition = function (transition) {
			My.superclass.set_transition.apply(this, arguments);
			if (this._old_event) {
				this._old_event.set_transition(this.get_transition());
			}
		};

		proto.on_create = function (options) {
			this.$errors = new cjs.Constraint([]);
			this._id = uid();
			ist.register_uid(this._id, this);

			this.options = options;
			this._str = cjs.isConstraint(options.str) ? options.str : cjs(options.str);
			if (options.inert !== true) {
				var SOandC = ist.find_stateful_obj_and_context(options.context);

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
					if(ist.__debug) {
						tree = this._tree.get();
						if(tree instanceof ist.Error) {
							//console.log("no event");
							event = null;
						} else {
							event_info = get_event(tree, {
								parent: parent,
								context: context,
								only_parse_first: true
							}, this._live_event_creator);
							event = event_info.event;
						}
						cjs.signal();
					} else {
						try {
							tree = this._tree.get();
							if(tree instanceof ist.Error) {
								//console.log("no event");
								event = null;
							} else {
								event_info = get_event(tree, {
									parent: parent,
									context: context,
									only_parse_first: true
								}, this._live_event_creator);
								event = event_info.event;
								if(this._has_errors) {
									this.$errors.set([]);
									this._has_errors = false;
								}
							}
						} catch(e) {
							var message = e.hasOwnProperty("message") ? e.message : e.description;
							this.$errors.set([message]);
							this._has_errors = true;
						} finally {
							cjs.signal();
						}
					}

					if (event) {
						event.set_transition(this.get_transition());
						event.on_fire(this.child_fired, this, event_info.actions, parent, context);
						if (this.is_enabled()) {
							event.enable();
						}
					}

					this._old_event = event;
				}, {
					context: this,
					run_on_create: false
				});
				/*
				//cjs.signal();
				_.delay(_.bind(function () {
					//Delay it because parsed events can run up the dictionary tree and create all sorts of contextual objects that they shouldn't
					//Delay it because if an event relies on an object's inherited property while the object is still being created, we're all fucked
					this.on_ready();
				}, this));
				*/
					//console.log(this);
				if(this.is_enabled()) {
					this._live_event_creator.run(false);
				} else {
					this._live_event_creator.pause();
				}
			}
		};
		/*
		proto.on_ready = function() {
			if(this._live_event_creator && this.is_enabled()) {
				this._live_event_creator.run(false);
			}
		};
		*/
		proto.get_errors = function() {
			return this.$errors.get();
		};
		proto.id = function () { return this._id; };
		proto.sid = function() { return parseInt(uid.strip_prefix(this.id()), 10); };
		proto.child_fired = function (actions, parent, context, event) {
			this.fire.apply(this, _.rest(arguments, 3));
			
			if(actions.length > 0) {
				var eventified_context = context.push(new ist.ProvisionalContext(), new ist.EventContext(event));
				//console.log(eventified_context);
				_.each(actions, function(expression_tree) {
					if(ist.__debug) {
						ist.get_parsed_$(expression_tree, {
							parent: parent,
							context: eventified_context,
							get_constraint: false,
							auto_add_dependency: false
						});
					} else {
						try {
							//ist.dbg = true;
							ist.get_parsed_$(expression_tree, {
								parent: parent,
								context: eventified_context,
								get_constraint: false,
								auto_add_dependency: false
							});
							//ist.dbg = false;
						} catch(e) {
							console.error(e);
						}
					}
				/*
					if(expression.invalidate) {
						expression.invalidate();
					}
					cjs.get(expression, false);
					*/
				});
			}
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
			this.$errors.destroy(true);
			delete this.$errors;
			ist.unregister_uid(this.id());
			My.superclass.destroy.apply(this, arguments);
		};
		proto.clone = function () {
		};
		proto.stringify = function () {
			return this._str.get();
		};
		ist.register_serializable_type("parsed_event",
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
	}(ist.ParsedEvent));
}(interstate));
