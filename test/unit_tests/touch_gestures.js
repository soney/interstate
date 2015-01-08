(function(ist) {
	module("Touch Gestures");

	var _ = ist._,
		tests = [
		{
			name: "Two then one",
			expect: 2,
			filename: "../saved_programs/two_then_one_finger.ist",
			steps: [{
				test: function(env, runtime, make_async) {
					env.top().cd("gesture");

					var gesture = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer),
						callback = make_async();

					equal(gesture.prop_val("x"), "init");
					replayTouches("../touch_recordings/press/two finger press.txt", function() {
						equal(gesture.prop_val("x"), "twoDown");
						replayTouches("../touch_recordings/press/two finger up.txt", function() {
							callback();
						});
					});
				}
			}]
		},
		{
			name: "Two then one",
			expect: 1,
			steps: [{
				setup: function(env) {
					env	.set("gesture")
						.cd("gesture")
							.set("t1", "<stateful>")
							.cd("t1")
								.set("(prototypes)", "(start)", "touch")
								.set("debugDraw", "(start)", "true")
								.set("numFingers", "(start)", "1")
								.set("delay", "(start)", "1000")
								.set("priority", "(start)", "1")
								.up()
							.set("t2", "<stateful>")
							.cd("t2")
								.set("(prototypes)", "(start)", "touch")
								.set("debugDraw", "(start)", "true")
								.set("numFingers", "(start)", "2")
								.set("delay", "(start)", "1000")
								.set("priority", "(start)", "2")
								.up()
							.add_state("init")
							.add_state("one_finger_down")
							.add_state("two_fingers_down")
							.start_at("init")
							.add_transition("init", "one_finger_down", "t1")
							.add_transition("init", "two_fingers_down", "t2")
							.set("x")
							.set("x", "one_finger_down", "'t1'")
							.set("x", "two_fingers_down", "'t2'")

				},
				test: function(env, runtime, make_async) {
					env.top().cd("gesture");

					var gesture = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer),
						callback = make_async();

					replayTouches("../touch_recordings/press/delayedTwoFingerPress.txt", function() {
						setTimeout(function() {
							equal(gesture.prop_val("x"), "t2");
							callback();
						}, 1000);
					});
				}
			}]
		}
		/**/
	];
	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
