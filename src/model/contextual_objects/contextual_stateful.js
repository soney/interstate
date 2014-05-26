/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,RedMap */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.ContextualStatefulObj = function (options) {
		ist.ContextualStatefulObj.superclass.constructor.apply(this, arguments);
		this._type = "stateful";
	};

	(function (My) {
		_.proto_extend(My, ist.ContextualDict);
		var proto = My.prototype;

		proto.initialize = function() {
			this.statecharts_per_proto = new RedMap({
				hash: "hash"
			});
			My.superclass.initialize.apply(this, arguments);
		};

		proto.get_own_statechart = function () {
			return this.get_statechart_for_proto(this.get_object());
		};

		proto.get_statechart_for_proto = function (proto) {
			cjs.wait();
			var must_initialize = false;
			var sc = this.statecharts_per_proto.get_or_put(proto, function () {
				var super_sc = proto.get_own_statechart();
				var shadow_sc = super_sc.create_shadow({}, true);
				must_initialize = super_sc;
				return shadow_sc;
			}, this);
			if(must_initialize) {
				var super_sc = must_initialize;
				sc.do_initialize({
					context: this.get_pointer(),
					running: true,
					basis: super_sc,
					concurrent: super_sc.is_concurrent(),
					set_basis_as_root: true
				});
			}
			cjs.signal();
			return sc;
		};

		proto.get_statecharts = function () {
			var contextual_protos = this.get_all_protos();
			var proto_statecharts = _	.chain(contextual_protos)
										.map(function (x) {
											if (x instanceof ist.StatefulObj) {
												return this.get_statechart_for_proto(x);
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

		proto.destroy = function () {
			cjs.wait();
			if(this.constructor === My) { this.begin_destroy(true); }

			this.statecharts_per_proto.forEach(function(statechart) {
				statechart.destroy(true);
			});

			this.statecharts_per_proto.destroy(true);
			delete this.statecharts_per_proto;
			My.superclass.destroy.apply(this, arguments);
			cjs.signal();
		};
	}(ist.ContextualStatefulObj));
}(interstate));
