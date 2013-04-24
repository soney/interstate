/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var b2Vec2 = Box2D.Common.Math.b2Vec2,
		b2AABB = Box2D.Collision.b2AABB,
		b2BodyDef = Box2D.Dynamics.b2BodyDef,
		b2Body = Box2D.Dynamics.b2Body,
		b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
		b2Fixture = Box2D.Dynamics.b2Fixture,
		b2World = Box2D.Dynamics.b2World,
		b2MassData = Box2D.Collision.Shapes.b2MassData,
		b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
		b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
		b2DebugDraw = Box2D.Dynamics.b2DebugDraw,
		b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef;

	var worlds = {};

	red.Box2DAttachmentInstance = function (options) {
		red.Box2DAttachmentInstance.superclass.constructor.apply(this, arguments);

		this.type = "box2d";
		this.on_ready();
	};

	(function (my) {
		_.proto_extend(my, red.AttachmentInstance);
		var proto = my.prototype;
		proto.on_ready = function() {
		};
		proto.destroy = function () {
		};
	}(red.Box2DAttachmentInstance));


	red.Box2DAttachment = function (options) {
		options = _.extend({
			instance_class: red.Box2DAttachmentInstance
		}, options);
		red.Box2DAttachment.superclass.constructor.call(this, options);
		this.type = "box2d";
	};
	(function (My) {
		_.proto_extend(My, red.Attachment);
		var proto = My.prototype;

		red.register_serializable_type("three_attachment",
			function (x) {
				return x instanceof My;
			},
			function () {
				return {
					instance_options: red.serialize(this.instance_options)
				};
			},
			function (obj) {
				return new My({
					instance_options: red.deserialize(obj.instance_options)
				});
			});
	}(red.Box2DAttachment));

	red.define("box2d_attachment", function (options) {
		return new red.Box2DAttachment(options);
	});

}(red, jQuery));
