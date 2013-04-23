/*global red */

(function(red) {
	"use strict";

	var env = red.create("environment");
env
.cd("child_nodes")
	.set("ball", "<stateful>")
	.cd("ball")
		.set("(protos)", "(start)", "[raphael]")

	red.on_sample_app_ready(env.get_root());
}(red));
