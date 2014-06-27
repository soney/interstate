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

		proto.get_statecharts = function () {
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
	}(ist.ContextualStatefulObj));
}(interstate));
