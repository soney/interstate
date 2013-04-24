/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,THREE,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var VIEW_ANGLE = 45,
		ASPECT = 1,
		NEAR = 0.1,
		FAR = 10000;

	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
								window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

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
			this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
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

			this.add_size_listener();
			this.$render = _.bind(this.render, this);
			this.render();
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
