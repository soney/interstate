/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var scid = 0;

	red.SpecialContext = function () {
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
	}(red.SpecialContext));

	red.ProvisionalContext = function (values) {
		this.values = values || {};
	};
	(function (My) {
		_.proto_extend(My, red.SpecialContext);
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
	}(red.ProvisionalContext));


	red.StateContext = function (state) {
		red.StateContext.superclass.constructor.apply(this, arguments);
		this.state = state;
		this.context_obj = {
		};
	};

	(function (My) {
		_.proto_extend(My, red.SpecialContext);
		var proto = My.prototype;
		proto.get_state = function () {
			return this.state;
		};
		proto.get_event = function () {
			var state = this.get_state();
			return state.get_event();
		};
	}(red.StateContext));

	var ec_counter = 1;
	red.EventContext = function (event) {
		red.EventContext.superclass.constructor.apply(this, arguments);
		this.event = event;
		this.context_obj = {
			event: { value: event }
		};
	};

	(function (My) {
		_.proto_extend(My, red.SpecialContext);
		var proto = My.prototype;
		proto.get_event = function () {
			return this.event;
		};
	}(red.EventContext));

	red.CopyContext = function (owner, my_copy, copy_num, options) {
		red.CopyContext.superclass.constructor.apply(this, arguments);
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
		_.proto_extend(My, red.SpecialContext);
		var proto = My.prototype;
		proto.get_copy_num = function () {
			return this.copy_num;
		};
	}(red.CopyContext));
}(red));
