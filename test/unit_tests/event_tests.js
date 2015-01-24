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
			name: "Simultaneous events across multiple objects",
			expect: 3,
			builtins: true,
			steps: [{
				setup: function(env) {
					env	.set("obj1", "<stateful>")
						.cd("obj1")
							.add_state("pre_click")
							.start_at("pre_click")
							.add_state("post_click")
							.add_transition("pre_click", "post_click", "mouse.click()")
							.set("x", "pre_click", "1")
							.set("x", "pre_click->post_click", "2")
							.set("x", "post_click", "3")
							.up()
						.set("obj2", "<stateful>")
						.cd("obj2")
							.add_state("pre_click")
							.start_at("pre_click")
							.add_state("post_click")
							.add_transition("pre_click", "post_click", "mouse.click()")
							.set("x", "pre_click", "obj1.x")
							.set("y", "pre_click->post_click", "obj1.x")
							.up()
						;
				},
				test: function(env, runtime, signal_async) {
					var callback = signal_async();

					env.cd("obj2")
					var obj2 = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(obj2.prop_val("x"), 1);
					//click!
					var evt = document.createEvent("MouseEvent"); 
					evt.initMouseEvent("click", true, true, document.body, 
						0, 0, 0, 0, 0, false, false, false, false, 0, null); 
					document.body.dispatchEvent(evt);

					equal(obj2.prop_val("x"), 3);
					equal(obj2.prop_val("y"), 2);
					callback();
				}
			}]
		},
		{
			name: "Event Priorities",
			expect: 8,
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
								.set("eventGroup", "(start)", "'g1'")
								.up()
							.set("ev3", "<stateful>")
							.cd("ev3")
								.set("(prototypes)", "(start)", "mouse.click")
								.set("priority", "(start)", "3")
								.set("eventGroup", "(start)", "'g1'")
								.up()
							.set("ev2", "<stateful>")
							.cd("ev2")
								.set("(prototypes)", "(start)", "mouse.click")
								.set("priority", "(start)", "2")
								.set("eventGroup", "(start)", "'g1'")
								.up()
							.add_state("s1")
							.add_state("s2")
							.add_state("s3")
							.add_transition("s0", "s1", "ev1")
							.add_transition("s0", "s3", "ev3")
							.add_transition("s0", "s2", "ev2")
							.add_transition("s3", "s0", "ev2")

							.set("x")
							.set("x", "s0", "'x0'")
							.set("x", "s1", "'x1'")
							.set("x", "s2", "'x2'")
							.set("x", "s3", "'x3'")
							.up()
						.set("B", "<stateful>")
						.cd("B")
							.add_state("s0")
							.add_state("e2blocked")
							.add_state("e2blocked_again")
							.start_at("s0")
							.add_transition("s0", "e2blocked", "A.ev2.blocked")
							.add_transition("e2blocked", "e2blocked_again", "A.ev2.blocked")
							.set("x")
							.set("x", "s0", "'x1'")
							.set("x", "e2blocked", "'e2blocked'")
							.set("x", "e2blocked_again", "'e2blockedagain'")
							;
				},
				test: function(env, runtime) {
					//simulateClick("click", document.body);
					env.top().cd("A");
					var A = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					env.top().cd("B");
					var B = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					env.top();

					equal(B.prop_val("x"), 'x1');

					simulateClick("click", document.body);

					equal(A.prop_val("x"), 'x3');
					equal(B.prop_val("x"), 'e2blocked');

					simulateClick("click", document.body);

					equal(A.prop_val("x"), 'x3');
					equal(B.prop_val("x"), 'e2blockedagain');

					B.reset();

					env.cd("A")
						.cd("ev3")
							.set("eventGroup", "(start)", "'g2'");

					equal(B.prop_val("x"), 'x1');
					simulateClick("click", document.body);

					equal(A.prop_val("x"), 'x0');
					equal(B.prop_val("x"), 'x1');
				}
			}]
		},
		{
			name: "Custom Event Fire",
			expect: 12,
			steps: [{
				setup: function(env) {
					env	.set("on", ist.on_event)
						.set("customGesture", "<stateful>")
						.cd("customGesture")
							.set("(prototypes)", "(start)", "event")
							.set("ev1name", "(start)", "'ev1'")
							.add_state("s0")
							.start_at("s0")
							.add_state("s1")
							.add_state("disabled")
							.add_transition("s0", "s1", "on(ev1name)")
							.add_transition("s1", "s0", "on('ev2');this.fire()")
							.add_transition("s0", "disabled", "this.disabled")
							.add_transition("s1", "disabled", "this.disabled")
							.add_transition("disabled", "s0", "this.enabled")
							.up()
						.set("A")
						.cd("A")
							.add_state("s0")
							.start_at("s0")
							.add_state("s1")
							.set("x", "s0", "'s0'")
							.set("x", "s1", "'s1'")
							.add_transition("s0", "s1", "customGesture()")
							.add_transition("s0", "s1", "on('ev3_A')")
							.up()
						.set("B")
						.cd("B")
							.add_state("s0")
							.start_at("s0")
							.add_state("s1")
							.set("x", "s0", "'s0'")
							.set("x", "s1", "'s1'")
							.add_transition("s0", "s1", "customGesture(ev1name='customEv1')")
							.add_transition("s0", "s1", "on('ev3_B')")
							;
				},
				test: function(env, runtime) {
					env.top().cd("A");
					var A = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					env.top().cd("B");
					var B = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					env.top();

					equal(A.prop_val("x"), "s0");
					equal(B.prop_val("x"), "s0");
					ist.emit('ev1');
					equal(A.prop_val("x"), "s0");
					equal(B.prop_val("x"), "s0");
					ist.emit('ev2');
					equal(A.prop_val("x"), "s1");
					equal(B.prop_val("x"), "s0");
					ist.emit("ev3_B");
					equal(A.prop_val("x"), "s1");
					equal(B.prop_val("x"), "s1");
					B.reset();
					equal(A.prop_val("x"), "s1");
					equal(B.prop_val("x"), "s0");
					ist.emit('customEv1');
					ist.emit('ev2');
					equal(A.prop_val("x"), "s1");
					equal(B.prop_val("x"), "s1");
				}
			}]
		}
		/**/
	];
	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
