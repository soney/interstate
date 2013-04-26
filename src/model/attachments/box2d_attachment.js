/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,window,Box2D */

(function (red, $) {
	"use strict";

	if(!window.Box2D) { return; }

	var cjs = red.cjs,
		_ = red._;

	var PIXELS_PER_METER = 30;

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
		"box2d_world": {
			ready: function() {
				this.world = new b2World(new Box2D.Common.Math.b2Vec2(0, 0), true);

				var update_world = _.bind(function() {
					this.world.Step(1 / 60, 10, 10);
					red.requestAnimationFrame.call(window, update_world);
				}, this);
				red.requestAnimationFrame.call(window, update_world);
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

				this.b2x = cjs.$();
				this.b2y = cjs.$();
				this.b2vx = cjs.$();
				this.b2vy= cjs.$();
				this.b2t = cjs.$();
				this.b2vt = cjs.$();
				this.body = cjs.$();
				this.shape = cjs.$();

				window.setInterval(_.bind(function() {
					var body = this.body.get();
					if(body) {
						var position = body.GetPosition();
						var angle = body.GetAngle();
						var linearVelocity = body.GetLinearVelocity();
						var angularVelocity = body.GetAngularVelocity();

						cjs.wait();
						this.b2x.set(position.x * PIXELS_PER_METER);
						this.b2y.set(position.y * PIXELS_PER_METER);

						this.b2vx.set(linearVelocity.x);
						this.b2vy.set(linearVelocity.y);

						this.b2t.set(angle);

						this.b2vt.set(angularVelocity);

						cjs.signal();
					}
				}, this), 1000 / 60);
			},
			parameters: {
				radius: function(contextual_object) {
					var radius = contextual_object.prop_val("r");
					var shape = this.shape.get();
					if(shape) {
						shape.SetRadius(radius/PIXELS_PER_METER);
					}
				}, fixed: function(contextual_object) {
					var fixed = contextual_object.prop_val("fixed");
					var body = this.body.get();

					if(body) {
						if(fixed) {
							var x = contextual_object.prop_val("x") / PIXELS_PER_METER;
							var y = contextual_object.prop_val("y") / PIXELS_PER_METER;
							body.SetType(b2Body.b2_fixedBody);
							body.SetPosition(new b2Vec2(x, y));
						} else {
							body.SetType(b2Body.b2_dynamicBody);
							body.SetAwake(true);
						}
					}
				}, world: function(contextual_object) {
					var world_val = contextual_object.prop_val("world");

					if(world_val) {
						var world_attachment = world_val.get_attachment_instance("box2d_world");
						var world = world_attachment.get_world();
						if(this.world !== world) {
							var x = contextual_object.prop_val("x") || 50;
							var y = contextual_object.prop_val("y") || 50;
							var radius = contextual_object.prop_val("r") || 50;

							bodyDef.position.x = x / PIXELS_PER_METER;
							bodyDef.position.y = y / PIXELS_PER_METER;
							fixDef.shape = new Box2D.Collision.Shapes.b2CircleShape(radius/PIXELS_PER_METER);

							this.world = world;
							this.fixture = this.world.CreateBody(bodyDef).CreateFixture(fixDef);
							this.body.set(this.fixture.GetBody());
							this.shape.set(this.fixture.GetShape());
						}
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
