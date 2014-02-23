/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var get_box2d_shape = function(instance) {
		var fixture_attachment = this.get_attachment_instance("box2d_fixture");

		if(fixture_attachment) {
			var shape = fixture_attachment.get_dom_obj();
			if (shape) {
				return shape;
			}
		}

		return false;
	};
	/*
		ist.get_instance_targs = function(instance) {
			var dom_objs = instance.get_dom_object();
			if(dom_objs) {
				if(_.isArray(dom_objs)) {
					return _.map(dom_objs, function(dom_obj) {
						return {dom_obj: dom_obj, cobj: instance};
					});
				} else {
					return {dom_obj: dom_objs, cobj: instance};
				}
			} else {
				return false;
			}
		};
		*/

	ist.CollisionEvent = function () {
		ist.Event.apply(this, arguments);
		this._initialize();
		this._type = "collision";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (specified_targets) {
		};
		proto.set_transition = function (transition) {
			this._transition = transition;
			if (transition) {
				var from = transition.from();

				from.on("active", this.enter_listener, this);
				from.on("inactive", this.leave_listener, this);
			}
		};
		proto.enter_listener = function() {
		};
		proto.leave_listener = function() {
		};
		proto.notify = function () {
			ist.event_queue.wait();
			this.fire({
				type: "collision"
			});
			ist.event_queue.signal();
		};
		proto.destroy = function () {
			if(this._transition) {
			}
			My.superclass.destroy.apply(this, arguments);
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
		};
	}(ist.CollisionEvent));
}(interstate));
