/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var scid = 0;

	ist.SpecialContext = function () {
		this._id = "c" + (scid += 1);
		this.context_obj = {};
	};
	(function (My) {
		var proto = My.prototype;
		proto.id = proto.hash = function () {
			return this._id;
		};
		proto.get_context_obj = function () {
			return this.context_obj;
		};
		proto.eq = function (other_context) {
			return this === other_context;
		};
	}(ist.SpecialContext));

	ist.ProvisionalContext = function (values) {
		this.values = values || {};
	};
	(function (My) {
		_.proto_extend(My, ist.SpecialContext);
		var proto = My.prototype;
		proto.has = function (name) {
			return this.values.hasOwnProperty(name);
		};
		proto.get = function (name) {
			return this.values[name];
		};
		proto.set = function (name, value) {
			this.values[name] = value;
		};
		proto.eq = function(other_context) {
			return other_context instanceof My;
		};
	}(ist.ProvisionalContext));

	var ec_counter = 1;
	ist.EventContext = function (event) {
		ist.EventContext.superclass.constructor.apply(this, arguments);
		this.event = event;
		this.context_obj = {
			event: { value: event }
		};
	};

	(function (My) {
		_.proto_extend(My, ist.SpecialContext);
		var proto = My.prototype;
		proto.get_event = function () {
			return this.event;
		};
	}(ist.EventContext));

	ist.StateContext = function (state) {
		ist.StateContext.superclass.constructor.apply(this, arguments);
		this.state = state;
		this.context_obj = {
			event: { value: state._last_run_event }
		};
	};

	(function (My) {
		_.proto_extend(My, ist.SpecialContext);
		var proto = My.prototype;
		proto.get_state = function () {
			return this.state;
		};
		proto.get_event = function () {
			var state = this.get_state();
			return state.get_event();
		};
		proto.eq = function(other_context) {
			return other_context instanceof My && other_context.state === this.state;
		};
		proto.hash = function() {
			return this.state.hash();
		};
	}(ist.StateContext));

	ist.CopyContext = function (owner, my_copy, copy_num, options) {
		ist.CopyContext.superclass.constructor.apply(this, arguments);
		this.my_copy = my_copy;
		this.copy_num = copy_num;
		this.context_obj = {
			my_copy: _.extend({
				value: my_copy
			}, options),
			copy_num: _.extend({
				value: copy_num
			}, options)
		};
		this._owner = owner;
	};
	(function (My) {
		_.proto_extend(My, ist.SpecialContext);
		var proto = My.prototype;
		proto.get_copy_num = function () {
			return this.copy_num;
		};
		proto.hash = function () {
			return this.copy_num+1;
		};
	}(ist.CopyContext));
}(interstate));
