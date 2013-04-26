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

	var fixDef = new Box2D.Dynamics.b2FixtureDef();
	fixDef.density = 1.0;
	fixDef.friction = 0.5;
	fixDef.restitution = 0.2;

	var bodyDef = new Box2D.Dynamics.b2BodyDef();
	bodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
	
	red.register_attachments({
		"box2d": {
			ready: function() {
				this.world = new b2World(new Box2D.Common.Math.b2Vec2(0, 0), true);
				var co = this.get_contextual_object();
				var dict = co.get_object();
				var custom_fixture = red.create("dict", {has_protos: false, direct_attachments: [red.create("box2d_fixture_attachment", {
						instance_options: {
							world: this.world
						}
					})]});
				dict.set("fixture", custom_fixture);
				custom_fixture.set("get_x", function() {
					var fixture_attachment = this.get_attachment_instance("box2d_fixture");
					return fixture_attachment.b2x.get();
				});
				custom_fixture.set("get_y", function() {
					var fixture_attachment = this.get_attachment_instance("box2d_fixture");
					return fixture_attachment.b2y.get();
				});
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
		"box2d_fixture": {
			ready: function() {
				var contextual_object = this.get_contextual_object();
				fixDef.shape = new Box2D.Collision.Shapes.b2CircleShape(50/30);
				var x = contextual_object.prop_val("x");
				var y = contextual_object.prop_val("y");
				bodyDef.position.x = x ? x/30 : 5;
				bodyDef.position.y = y ? y/30 : 5;

				this.world = this.options.world;
				this.fixture = this.world.CreateBody(bodyDef).CreateFixture(fixDef);
				this.body = this.fixture.GetBody();
				this.shape = this.fixture.GetShape();

				this.b2x = cjs.$();
				this.b2y = cjs.$();
				this.b2vx = cjs.$();
				this.b2vy= cjs.$();
				this.b2t = cjs.$();
				this.b2vt = cjs.$();

				window.setInterval(_.bind(function() {
					var position = this.body.GetPosition();
					cjs.wait();
					this.b2x.set(position.x);
					this.b2y.set(position.y);
					/*
					var angle = this.body.GetAngle();
					var linearVelocity = this.body.GetLinearVelocity();
					var angularVelocity = this.body.GetAngularVelocity();
					this.b2vx.set(linearVelocity.x);
					this.b2vy.set(linearVelocity.y);
					this.b2t.set(angle);
					this.b2vt.set(angularVelocity);
					*/
					cjs.signal();
				}, this), 1000 / 60);
			},
			parameters: {
				radius: function(contextual_object) {
					var radius = contextual_object.prop_val("r");
					this.shape.SetRadius(radius/30);
				}, fixed: function(contextual_object) {
					var fixed = contextual_object.prop_val("fixed");
					if(fixed) {
						var x = contextual_object.prop_val("x");
						var y = contextual_object.prop_val("y");
						this.body.SetType(b2Body.b2_fixedBody);
						this.body.SetPosition(new b2Vec2(x/30,y/30));
					} else {
						this.body.SetType(b2Body.b2_dynamicBody);
						this.body.SetAwake(true);
					}
				}
			},
			proto_props: {
				get_fixture: function() {
					return this.fixture;
				},
				get_body: function() {
					return this.body;
				},
				get_shape: function() {
					return this.shape;
				}
			}
		}
	});
}(red, jQuery));
