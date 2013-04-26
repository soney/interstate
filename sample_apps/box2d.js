/*global red */

(function(red) {
	"use strict";

	var env = red.create("environment");
env
.set("my_world", "<stateful>")
.cd("my_world")
	.set("(prototypes)", "(start)", "box2d.world")
	.set("gy", "(start)", "10")
	.set("gx", "(start)", "0")
	.up()
.cd("child_nodes")
	.set("my_block", "<stateful>")
	.cd("my_block")
		.set("(prototypes)", "(start)", "[box2d.fixture, dom]")
		.set("(copies)", "10")
		.set("tag", "(start)", "'span'")
		.set("world", "(start)", "my_world")
		.set("r", "(start)", "50")
		.set("x", "(start)", "Math.random()*200 + 200")
		.set("y", "(start)", "Math.random()*200")
		.set("x_val", "(start)", "this.get_x()")
		.set("y_val", "(start)", "this.get_y()")
		.set("fixed", "(start)", "false")
		.set("css", "<dict>")
		.cd("css")
			.set("width", "2*r+'px'")
			.set("height", "2*r+'px'")
			.set("position", "'absolute'")
			.set("left", "x_val+'px'")
			.set("top", "y_val+'px'")
			.set("backgroundColor", "'rgb('+Math.floor(x_val)%255+',0,0)'")
			.set("borderRadius", "r+'px'")
			.up()
		.up()
	.set("my_floor", "<stateful>")
	.cd("my_floor")
		.set("(prototypes)", "(start)", "[box2d.fixture, dom]")
		.set("tag", "(start)", "'span'")
		.set("world", "(start)", "my_world")
		.set("r", "(start)", "50")
		.set("x", "(start)", "401")
		.set("y", "(start)", "800")
		.set("x_val", "(start)", "this.get_x()")
		.set("y_val", "(start)", "this.get_y()")
		.set("fixed", "(start)", "true")
		.set("css", "<dict>")
		.cd("css")
			.set("width", "2*r+'px'")
			.set("height", "2*r+'px'")
			.set("position", "'absolute'")
			.set("left", "x_val+'px'")
			.set("top", "y_val+'px'")
			.set("backgroundColor", "'black'")
			.set("borderRadius", "r+'px'")
			.up()
		.up()

	red.on_sample_app_ready(env.get_root());
}(red));
