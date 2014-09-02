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
			this._live_statechart_child_updater = cjs.liven(function() {
				this.update_statecharts();
			}, {
				context: this,
				priority: 1,
				pause_while_running: true
			});
			if(this.constructor === My) { this.shout_initialization(); }
		};

		proto.get_own_statechart = function () {
			return this.get_statechart_for_proto(this.get_object());
		};

		proto.get_statechart_for_proto = function (proto) {
			cjs.wait();
			var must_initialize = false;
			var sc = this.statecharts_per_proto.get_or_put(proto, function () {
				var super_sc = proto.get_own_statechart();
				var shadow_sc = super_sc.create_shadow({
					context: this.get_pointer(),
					running: true,
					basis: super_sc,
					concurrent: super_sc.is_concurrent(),
					set_basis_as_root: true
				}, true);
				must_initialize = super_sc;
				return shadow_sc;
			}, this);
			if(must_initialize) {
				var super_sc = must_initialize;
				sc.initialize();
			}
			cjs.signal();
			return sc;
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
			return this.get_statecharts();
		};

		proto.get_statecharts = function () {
			if(this.is_template()) {
				return [];
			}

			var contextual_protos = this.get_all_protos();
			var proto_statecharts = _	.chain(contextual_protos)
										.map(function (x) {
											if (x instanceof ist.ContextualStatefulObj) {
												return this.get_statechart_for_proto(x.get_object());
											} else {
												return false;
											}
										}, this)
										.compact()
										.value();

			return ([this.get_own_statechart()]).concat(proto_statecharts);
		};

		proto.reset = function () {
			var statecharts = this.get_statecharts();
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

			var statecharts = this.get_statecharts();
			_.each(statecharts, function(statechart) {
				statechart.pause();
			});
		};
		proto.resume = function(recursive) {
			My.superclass.resume.apply(this, arguments);

			var statecharts = this.get_statecharts();
			_.each(statecharts, function(statechart) {
				statechart.resume();
			});
		};
		proto._get_valid_cobj_children = function() {
			var dict_children = My.superclass._get_valid_cobj_children.apply(this, arguments),
				statecharts = this.get_statecharts(),
				sc_children = _	.chain(statecharts)
								.map(function(statechart) {
									var transitions = statechart.get_all_transitions(),
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
