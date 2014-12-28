(function(ist) {
	module("Events");

	function simulateClick(type, elem) {
		var evt = document.createEvent("MouseEvents");
			evt.initMouseEvent(type, true, true, window,
			0, 0, 0, 0, 0, false, false, false, false, 0, null);
		elem.dispatchEvent(evt);
	}

	var _ = ist._,
		tests = [
		{
			name: "Event Priorities",
			expect: 1,
			steps: [{
				setup: function(env) {
					env	.set("A", "<stateful>")
						.cd("A")
							.add_state("s0")
							.start_at("s0")
							.set("ev1", "<stateful>")
							.cd("ev1")
								.set("(prototypes)", "(start)", "mouse.click")
								.set("priority", "(start)", "1")
								.up()
							.set("ev3", "<stateful>")
							.cd("ev3")
								.set("(prototypes)", "(start)", "mouse.click")
								.set("priority", "(start)", "3")
								.up()
							.set("ev2", "<stateful>")
							.cd("ev2")
								.set("(prototypes)", "(start)", "mouse.click")
								.set("priority", "(start)", "2")
								.up()
							.add_state("s1")
							.add_state("s2")
							.add_state("s3")
							.add_transition("s0", "s1", "ev1")
							.add_transition("s0", "s3", "ev3")
							.add_transition("s0", "s2", "ev2")

							.set("x")
							.set("x", "s1", "'x1'")
							.set("x", "s2", "'x2'")
							.set("x", "s3", "'x3'")
							.up()
							;
				},
				test: function(env, runtime) {
					simulateClick("click", document.body);
					//simulateClick("click", document.body);
					env.top().cd("A");
					var A = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);

					equal(A.prop_val("x"), 'x3');
				}
			}]
		}
		/**/
	];
	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
