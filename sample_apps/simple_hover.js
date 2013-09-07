/*global interstate */

(function(ist) {
	"use strict";

	var env = new ist.Environment();
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

	ist.on_sample_app_ready(env.get_root());
}(interstate));
