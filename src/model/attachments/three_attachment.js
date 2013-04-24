/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,THREE,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var DEFAULT_VIEW_ANGLE = 45,
		DEFAULT_ASPECT = 1,
		DEFAULT_NEAR = 0.1,
		DEFAULT_FAR = 10000;

	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
								window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

	var object_types = {
		"point_light": {
			objects: {
				point_light: function() {
					return new THREE.PointLight(0xFFFFFF);
				}
			},
			parameters: {
				position: function(contextual_object) {
					var x = contextual_object.prop_val("x"),
						y = contextual_object.prop_val("y"),
						z = contextual_object.prop_val("z");
					this.point_light.position.set(x, y, z);
				},
				color: function(contextual_object) {
					var color = contextual_object.prop_val("color");
					this.point_light.color = color;
				}
			}
		}
	};

_.each(object_types, function(attachment_specs, attachment_name) {
	var InstanceType = function(options) {
		InstanceType.superclass.constructor.apply(this, arguments);

		this.type = attachment_name;
		this.on_ready();
	};
	(function(My) {
		_.proto_extend(My, red.AttachmentInstance);
		var proto = My.prototype;
		proto.on_ready = function() {
			_.each(attachment_specs.objects, function(obj_spec, obj_name) {
				this[obj_name] = obj_spec.call(this);
			}, this);

			this._listeners = {};
			var contextual_object = this.get_contextual_object();
			_.each(attachment_specs.parameters, function(parameter_spec, parameter_name) {
				this._listeners[parameter_name] = cjs.liven(function() {
					parameter_spec.call(this, contextual_object);
				}, {
					context: this
				});
			}, this);
		};
	}(InstanceType));

	var AttachmentType = function(options) {
		options = _.extend({
			instance_class: InstanceType
		}, options);
		AttachmentType.superclass.constructor.call(this, options);
		this.type = attachment_name;
	};
	(function(My) {
		_.proto_extend(My, red.Attachment);
		var proto = My.prototype;
		red.register_serializable_type(attachment_name,
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
	}(AttachmentType));

	red.define(attachment_name, function (options) {
		return new AttachmentType(options);
	});
});

	red.ThreeSceneAttachmentInstance = function (options) {
		red.ThreeSceneAttachmentInstance.superclass.constructor.apply(this, arguments);

		this.type = "three_scene";
		this.on_ready();
	};
	(function (my) {
		_.proto_extend(my, red.AttachmentInstance);
		var proto = my.prototype;
		proto.on_ready = function() {
			this.renderer = new THREE.WebGLRenderer();
			this.camera = new THREE.PerspectiveCamera(DEFAULT_VIEW_ANGLE, DEFAULT_ASPECT, DEFAULT_NEAR, DEFAULT_FAR);
			this.scene = new THREE.Scene();


// set up the sphere vars
var radius = 50,
	segments = 16,
	rings = 16;

var sphereMaterial = new THREE.MeshLambertMaterial( { color: 0xCC0000 });
// create a new mesh with
// sphere geometry - we will cover
// the sphereMaterial next!
var sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, rings), sphereMaterial);

// add the sphere to the scene
this.scene.add(sphere);

this.scene.add(this.camera);
this.camera.position.z = 300;

// create a point light
var pointLight =
  new THREE.PointLight(0xFFFFFF);

// set its position
pointLight.position.x = 10;
pointLight.position.y = 50;
pointLight.position.z = 130;

// add to the scene
this.scene.add(pointLight);

			this.add_camera_listener();
			this.add_clear_color_listener();
			this.add_size_listener();
			this.$render = _.bind(this.render, this);
			this.render();
		};
		proto.add_camera_listener = function() {
			var contextual_object = this.get_contextual_object();
			cjs.liven(function() {
				var camera = contextual_object.prop_val("camera");
				var x = camera.prop_val("x"),
					y = camera.prop_val("y"),
					z = camera.prop_val("z"),
					fov = camera.prop_val("fov"),
					aspect = camera.prop_val("aspect"),
					near = camera.prop_val("near"),
					far = camera.prop_val("far");

				this.camera.position.set(x, y, z);
				this.camera.fov = fov;
				this.camera.aspect = aspect;
				this.camera.near = near;
				this.camera.far = far;
				this.camera.updateProjectionMatrix();
			}, {
				context: this
			});
		};
		proto.add_size_listener = function() {
			var contextual_object = this.get_contextual_object();
			cjs.liven(function() {
				var width = contextual_object.prop_val("width");
				var height = contextual_object.prop_val("height");
				this.renderer.setSize(width, height);
			}, {
				context: this
			});
		};
		proto.add_clear_color_listener = function() {
			var contextual_object = this.get_contextual_object();
			cjs.liven(function() {
				var clear_color = contextual_object.prop_val("clear_color");
				this.renderer.setClearColor(clear_color);
			}, {
				context: this
			});
		};

		proto.get_dom_obj = function() {
			if(this.renderer) {
				return this.renderer.domElement;
			} else {
				return false;
			}
		};

		proto.render = function() {
			requestAnimationFrame(this.$render);
			this.renderer.render(this.scene, this.camera);
		};

		proto.destroy = function () {
		};
	}(red.ThreeSceneAttachmentInstance));

	red.ThreeSceneAttachment = function (options) {
		options = _.extend({
			instance_class: red.ThreeSceneAttachmentInstance
		}, options);
		red.ThreeSceneAttachment.superclass.constructor.call(this, options);
		this.type = "three_scene";
	};
	(function (My) {
		_.proto_extend(My, red.Attachment);
		var proto = My.prototype;

		red.register_serializable_type("three_scene_attachment",
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
	}(red.ThreeSceneAttachment));

	red.define("three_scene_attachment", function (options) {
		return new red.ThreeSceneAttachment(options);
	});

}(red, jQuery));
