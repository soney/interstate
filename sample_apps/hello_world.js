/*global interstate */

(function(ist) {
	"use strict";

	var env = new ist.Environment();
	env	.cd("child_nodes")
		.set("obj", "<stateful>")
		.cd("obj")
		.set("(prototypes)", "(start)", "dom")
		.set("tag", "<stateful_prop>")
		.set("text", "<stateful_prop>")
		.set("tag", "(start)", "'div'")
		.set("text", "(start)", "'hello world'")
		;

	red.on_sample_app_ready(env.get_root());
}(interstate));
