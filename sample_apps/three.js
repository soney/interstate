/*global red */

(function(red) {
	"use strict";

	var env = red.create("environment");
env
.cd("child_nodes")
.set("obj", "<stateful>")
.cd("obj")
	.set("(prototypes)", "(start)", "[three.scene]")
	.set("width", "(start)", "400")
	.set("height", "(start)", "400")
	.set("clear_color", "(start)", "'black'")
	.set("objects", "<dict>")
	.cd("objects")
		.set("light", "<stateful>")
		.cd("light")
			.set("(prototypes)", "(start)", "three.point_light")
			.set("color", "(start)", "'white'")
			.set("x", "(start)", "10")
			.set("y", "(start)", "50")
			.set("z", "(start)", "130")
			.up()
		.set("sphere", "<stateful>")
		.cd("sphere")
			.set("(prototypes)", "(start)", "three.mesh")
			.set("geometry", "<stateful>")
			.cd("geometry")
				.set("(prototypes)", "(start)", "three.sphere_geometry")
				.set("radius", "(start)", "50")
				.up()
			.set("material", "<stateful>")
			.cd("material")
				.set("(prototypes)", "(start)", "three.lambert_material")
				.set("color", "(start)", "'red'")
				.up()
			.up()
		.up()
	.set("camera", "<dict>")
	.cd("camera")
		.set("x", "0")
		.set("y", "0")
		.set("z", "300")
		.set("fov", "45")
		.set("aspect", "width/height")
		.set("near", "0.1")
		.set("far", "1000")
		.up();

	red.on_sample_app_ready(env.get_root());
}(red));
