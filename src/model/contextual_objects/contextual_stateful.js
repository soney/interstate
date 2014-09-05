/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,RedMap */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualStatefulObj = function (options) {
		this.statecharts_per_proto = new RedMap({
			hash: "hash"
		});
		ist.ContextualStatefulObj.superclass.constructor.apply(this, arguments);
		this._type = "stateful";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualDict);
		var proto = My.prototype;

		proto.initialize = function() {
			if(this.constructor === My) { this.flag_as_initialized(); }
			My.superclass.initialize.apply(this, arguments);
			if(!this.inert) {
				this._live_statechart_child_updater = cjs.liven(function() {
					this.update_statecharts();
				}, {
					context: this,
					priority: 1,
					pause_while_running: true
				});
			}
			if(this.constructor === My) { this.shout_initialization(); }
		};

		proto.getOwnStatechart = function () {
			return this.getStatechartForProto(this.get_object());
		};

		proto.getStatechartParent = function () {
			var context = this.get_pointer(),
				contextual_object,
				popped_item, last;
				
			while (!context.is_empty()) {
				last = context.pointsAt();
				if (last instanceof ist.StatefulObj) {
					contextual_object = ist.find_or_put_contextual_obj(last, context);
					return contextual_object;
				}
				popped_item = last;
				context = context.pop();
			}
			return undefined;
		};

		proto.getStatechartForProto = function (proto) {
			var statechart = proto.get_own_statechart(),
				pointer = this.get_pointer();
			if(statechart === "parent") {
				var obj = this.get_object();
				if(obj === proto) {
					var context = this.get_pointer(),
						popped_item, last;
						
					while (!context.is_empty()) {
						last = context.pointsAt();
						if (last instanceof ist.StatefulObj) {
							contextual_object = context.getContextualObject();
							return contextual_object;
						}
						popped_item = last;
						context = context.pop();
					}
				}
			} else if(statechart instanceof ist.State) {
				return this.getStateContextualObject(statechart);
			}

			return false;
		};

		proto.update_statecharts = function() {
			var valid_statecharts = this.get_valid_statecharts(),
				current_statecharts = this.statecharts_per_proto.values(),
				to_destroy = {};

			this.statecharts_per_proto.forEach(function(sc, proto_obj) {
				to_destroy[sc.id()] = {key: proto_obj, sc: sc};
			});
			_.each(valid_statecharts, function(sc) {
				to_destroy[sc.id()] = false;
			});

			var to_destroy_arr = _.compact(_.values(to_destroy));
			_.each(to_destroy_arr, function(info) {
				var sc = info.sc,
					key = info.key;
				this.statecharts_per_proto.remove(key);
				sc.destroy(true);
			}, this);
		};

		proto.get_valid_statecharts = function() {
			return this.getStatecharts();
		};

		proto.getStatecharts = function () {
			if(this.is_template()) {
				return [];
			}

			var contextual_protos = this.get_all_protos();
			var proto_statecharts = _	.chain(contextual_protos)
										.map(function (x) {
											if (x instanceof ist.ContextualStatefulObj) {
												return this.getStatechartForProto(x.get_object());
											} else {
												return false;
											}
										}, this)
										.compact()
										.value();

			return ([this.getOwnStatechart()]).concat(proto_statecharts);
		};

		proto.reset = function () {
			var statecharts = this.getStatecharts();
			_.each(statecharts, function(statechart) {
				statechart.reset();
			}, this);
		};

		proto.begin_destroy = function() {
			if(this._live_statechart_child_updater) {
				this._live_statechart_child_updater.destroy(true);
				delete this._live_statechart_child_updater;
			}

			this.statecharts_per_proto.forEach(function(statechart) {
				statechart.destroy(true);
			});

			this.statecharts_per_proto.destroy(true);
			delete this.statecharts_per_proto;

			My.superclass.begin_destroy.apply(this, arguments);
		};

		proto.destroy = function (avoid_begin_destroy) {
			cjs.wait();
			if(this.constructor === My && !avoid_begin_destroy) { this.begin_destroy(true); }

			My.superclass.destroy.apply(this, arguments);
			cjs.signal();
		};

		proto.pause  = function(recursive) {
			My.superclass.pause.apply(this, arguments);

			var statecharts = this.getStatecharts();
			_.each(statecharts, function(statechart) {
				statechart.pause();
			});
		};
		proto.resume = function(recursive) {
			My.superclass.resume.apply(this, arguments);

			var statecharts = this.getStatecharts();
			_.each(statecharts, function(statechart) {
				statechart.resume();
			});
		};
		proto.getStateContextualObject = function(state) {
			var pointer = this.get_pointer(),
				state_pointer = pointer.push(state);
			return state_pointer.getContextualObject();
		};
		proto._get_valid_cobj_children = function() {
			var dict_children = My.superclass._get_valid_cobj_children.apply(this, arguments),
				statecharts = this.getStatecharts(),
				sc_children = _	.chain(statecharts)
								.map(function(statechart) {
									var transitions = statechart.getAllTransitions(),
										infos = _	.chain(transitions)
													.map(function(transition) {
														var event = transition.event();
														if(event instanceof ist.ParsedEvent) {
															var obj = event.get_obj();
															if(obj) {
																var ptr = transition.context().push(obj);
																return {
																	obj: obj,
																	pointer: ptr
																};
															}
														}
													}, this)
													.compact()
													.value();
									return infos;
								}, this)
								.flatten(true)
								.value();


			return dict_children.concat(sc_children);
		};
	}(ist.ContextualStatefulObj));
}(interstate));
