/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,window,Box2D */

(function (red, $) {
	"use strict";

	if(!window.Box2D) { return; }

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
		b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef;

	red.register_attachments({
		"box2d": {
			ready: function() {
				this.world = new b2World(new Box2D.Common.Math.b2Vec2(0, 0), true);
			},
			parameters: {
				gravity: function(contextual_object) {
					var gravity_x = contextual_object.prop_val("gx"),
						gravity_y = contextual_object.prop_val("gy");

					var gravity_vector = new b2Vec2(gravity_x, gravity_y)
					this.world.SetGravity(gravity_vector);
					var body_list = this.world.GetBodyList();
					var body_len = this.world.GetBodyCount();
					for(var i = 0; i<body_len; i++) {
						body_list.SetAwake(true);
						body_list = body_list.GetNext();
					}
				}
			},
			proto_props: {
				get_world: function() {
					return this.world;
				}
			}
		},
	});
}(red, jQuery));
