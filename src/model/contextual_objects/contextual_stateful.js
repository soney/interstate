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
			/*
			this._live_statechart_child_updater = cjs.liven(function() {
				this.update_statecharts();
			}, {
				context: this,
				priority: 1,
				pause_while_running: true
			});
			*/
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

		proto.getOwnContextualStatechart = function() { 
			return this.getContextualStatechartForProto(this.get_object());
		};
		proto.getContextualStatechartForProto = function(proto) {
			var sc = this.getStatechartForProto(proto);
			if(sc instanceof ist.State) {
				return this.getStateContextualObject(sc);
			} else {
				return false;
			}
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
				return statechart;
				return this.getStateContextualObject(statechart);
			}

			return false;
		};


		proto.getContextualStatecharts = function() { 
			var statecharts = this.getStatecharts();
			return _.map(statecharts, this.getStateContextualObject, this);
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

		proto.usesState = function(state) {
			return _.any(this.children(), function(child_info) {
				var child = child_info.value;
				return child instanceof ist.ContextualStatefulProp && child.usesState(state);
			});
		};

		proto.reset = function () {
			var statecharts = this.getContextualStatecharts();
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

		proto.pause = function(recursive) {
			My.superclass.pause.apply(this, arguments);

			var statecharts = this.getContextualStatecharts();
			_.each(statecharts, function(statechart) {
				statechart.stop();
			});
		};
		proto.resume = function(recursive) {
			My.superclass.resume.apply(this, arguments);

			var statecharts = this.getContextualStatecharts();
			_.each(statecharts, function(statechart) {
				statechart.run();
			});
		};
		proto.getStatePointer = function(state) {
			var pointer = this.get_pointer(),
				state_pointer = pointer;
			_.each(state.getLineage(), function(s) {
				state_pointer = state_pointer.push(s);
			});
			return state_pointer;
		};
		proto.getStateContextualObject = function(state) {
			var state_pointer = this.getStatePointer(state);
			return state_pointer.getContextualObject();
		};
		proto._get_valid_cobj_children = function() {
			var dict_children = My.superclass._get_valid_cobj_children.apply(this, arguments),
				statecharts = this.getStatecharts(),
				pointer = this.get_pointer(),
				sc_children = _.chain(statecharts)
								.map(function(statechart) {
									var contextualState = this.getStateContextualObject(statechart);
									return {
										obj: statechart,
										pointer: pointer.push(statechart)
									};
								}, this)
								.value();

			return dict_children.concat(sc_children);
		};
	}(ist.ContextualStatefulObj));
}(interstate));
