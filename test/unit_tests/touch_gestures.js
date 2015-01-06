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
		}
		/**/
	];
	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
