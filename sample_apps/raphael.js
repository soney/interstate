/*global red */

(function(red) {
	"use strict";

	var env = red.create("environment");
env
.cd("child_nodes")
	.set("paper", "<stateful>")
	.cd("paper")
		.set("rtype", "(start)", "'paper'")
		.set("rattr", "<dict>")
		.cd("rattr")
			.set("width", "500")
			.set("height", "500")
		.up()
	.set("ball", "<stateful>")
	.cd("ball")
		.set("(protos)", "(start)", "[raphael]")

	red.on_sample_app_ready(env.get_root());
}(red));
