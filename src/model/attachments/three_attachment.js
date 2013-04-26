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

	red.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
								window.webkitRequestAnimationFrame || window.msRequestAnimationFrame ||
								function(callback) {
									window.setTimeout(callback, 1000 / 60);
								};

	var cop_props = function(from, to, prop_names) {
		_.each(prop_names, function(prop_name) {
			to[prop_name] = from[prop_name];
		});
	};

	var copy_geometry = function(from, to) {
			to.vertices.length = 0;
			var vertices = from.vertices;
			i = 0; il = vertices.length;
			for (; i < il; i ++ ) {
				to.vertices.push(vertices[i].clone());
			}

			this.geometry.faces.length = 0;
			var faces = from.faces;
			i = 0; il = faces.length;
			for (; i < il; i ++ ) {
				to.faces.push(faces[i].clone());
			}

			to.faceVertexUvs[0].length = 0;
			var uvs = from.faceVertexUvs[0];
			i = 0; il = uvs.length;
			for (; i < il; i ++ ) {
				var uv = uvs[i], uvCopy = [];
				for ( var j = 0, jl = uv.length; j < jl; j ++ ) {
					uvCopy.push(new THREE.Vector2( uv[j].x, uv[j].y ) );
				}
				to.faceVertexUvs[0].push(uvCopy);
			}

	};

	red.register_attachments({
		"point_light": {
			ready: function() {
				this.point_light = new THREE.PointLight(0xFFFFFF);
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
					this.point_light.color.set(color);
				}
			},
			proto_props: {
				get_three_obj: function() {
					return this.point_light;
				}
			}
		},
		"lambert_material": {
			ready: function() {
				this.material = new THREE.MeshLambertMaterial();
			},
			parameters: {
				color: function(contextual_object) {
					var color = contextual_object.prop_val("color");
					this.material.color.set(color);
				}
			},
			proto_props: {
				get_material: function() {
					return this.material;
				}
			}
		},
		"sphere_geometry": {
			ready: function() {
				this.geometry = new THREE.SphereGeometry(undefined, 16, 16);
				this.geometry.dynamic = true;
			},
			parameters: {
				radius: function(contextual_object) {
					var i, il;
					var radius = contextual_object.prop_val("radius");
					var reference_geometry = new THREE.SphereGeometry(radius, 16, 16);
					copy_geometry(reference_geometry, this.geometry);
					reference_geometry.dispose();

					this.geometry.verticesNeedUpdate = true;
					this.geometry.elementsNeedUpdate = true;
					this.geometry.morphTargetsNeedUpdate = true;
					this.geometry.uvsNeedUpdate = true;
					this.geometry.normalsNeedUpdate = true;
					this.geometry.colorsNeedUpdate = true;
					this.geometry.tangentsNeedUpdate = true;
				}
			},
			proto_props: {
				get_geometry: function() {
					return this.geometry;
				}
			}
		},

		"mesh": {
			ready: function() {
				this.mesh = new THREE.Mesh();
			},
			parameters: {
				geometry: function(contextual_object) {
					var geometry_prop = contextual_object.prop_val("geometry");
					var attachments = _.compact(_.map(["sphere_geometry"], function(attachment_name) {
						return geometry_prop.get_attachment_instance(attachment_name);
					}));
					var geometries = _.map(attachments, function(attachment) {
						return attachment.get_geometry();
					});
					var geometry = geometries[0];
					if(geometry) {
						this.mesh.geometry = geometry;
					}
				},
				material: function(contextual_object) {
					var material_prop = contextual_object.prop_val("material");
					var attachments = _.compact(_.map(["lambert_material"], function(attachment_name) {
						return material_prop.get_attachment_instance(attachment_name);
					}));
					var materials = _.map(attachments, function(attachment) {
						return attachment.get_material();
					});
					var material = materials[0];
					this.mesh.material = material;
				}
			},
			proto_props: {
				get_three_obj: function() {
					return this.mesh;
				}
			}
		},

		"three_scene": {
			ready: function() {
				this.renderer = new THREE.WebGLRenderer();
				this.camera = new THREE.PerspectiveCamera(DEFAULT_VIEW_ANGLE, DEFAULT_ASPECT, DEFAULT_NEAR, DEFAULT_FAR);
				this.scene = new THREE.Scene();

				this.scene.add(this.camera);
				this.$render = _.bind(this.render, this);
				this.render();
				window.scene = this.scene;
			},
			
			parameters: {
				size: function(contextual_object) {
					var width = contextual_object.prop_val("width");
					var height = contextual_object.prop_val("height");
					this.renderer.setSize(width, height);
				},
				camera_position: function(contextual_object) {
					var camera = contextual_object.prop_val("camera");
					var x = camera.prop_val("x"),
						y = camera.prop_val("y"),
						z = camera.prop_val("z");
					this.camera.position.set(x, y, z);
					this.camera.updateProjectionMatrix();
				},
				camera_fov_near_far_aspect: function(contextual_object) {
					var camera = contextual_object.prop_val("camera");
					var fov = camera.prop_val("fov"),
						aspect = camera.prop_val("aspect"),
						near = camera.prop_val("near"),
						far = camera.prop_val("far");

					this.camera.fov = fov;
					this.camera.aspect = aspect;
					this.camera.near = near;
					this.camera.far = far;
					this.camera.updateProjectionMatrix();
				},

				clear_color: function(contextual_object) {
					var clear_color = contextual_object.prop_val("clear_color");
					this.renderer.setClearColor(clear_color);
				},

				objects: {
					type: "list",
					add: function(item, index) {
						this.scene.add(item);
						if(item instanceof THREE.Light )  {
							this.scene.traverse(function(node) {
								if(node.material) {
									node.material.needsUpdate = true;
									if ( node.material instanceof THREE.MeshFaceMaterial ) {
										for ( var i = 0; i < node.material.materials.length; i++) {
											node.material.materials[i].needsUpdate = true;
										}
									}
								}
							});
						}
					},
					remove: function(item) {
						this.scene.remove(item);
					},
					move: function(item, from_index, to_index) {
					},
					getter: function(contextual_object) {
						var objects = contextual_object.prop_val("objects");
						var object_children = _.pluck(objects.children(), "value");

						var rv = [];
						_.each(object_children, function(child) {
							var attachments = _.compact(_.map(["point_light", "mesh"], function(attachment_name) {
								return child.get_attachment_instance(attachment_name);
							}));
							var objects = _.map(attachments, function(attachment) {
								return attachment.get_three_obj();
							});
							rv.push.apply(rv, objects);
						});
						return rv;
					}
				}
			},

			proto_props: {
				render: function() {
					red.requestAnimationFrame.call(window, this.$render);
					this.renderer.render(this.scene, this.camera);
				},
				get_dom_obj: function() {
					if(this.renderer) {
						return this.renderer.domElement;
					} else {
						return false;
					}
				}
			}
		}
	});
}(red, jQuery));
