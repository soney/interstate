/*global red */

(function(red) {
	"use strict";

	var env = red.create("environment");
	env	.cd("child_nodes")
		.set("obj", "<stateful>")
		.cd("obj")
		.set("tag", "<stateful_prop>")
		.set("text", "<stateful_prop>")
		.add_state("idle")
		.start_at("idle")
		.add_state("hover")
		.add_transition("idle", "hover", "on('mouseover', this)")
		.add_transition("hover", "idle", "on('mouseout', this)")
		.set("(prototypes)", "idle", "dom")
		.set("tag", "idle", "'div'")
		.set("text", "idle", "'out'")
		.set("text", "hover", "'over'")
		;

	red.on_sample_app_ready(env.get_root());
}(red));
