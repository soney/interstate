(function(ist) {
	module("Stateful Props");

	var _ = ist._;
	var tests = [
		{
			name: "Sub-States override superstates",
			expect: 1,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.add_state("state")
							.add_state("state.inner_state")
							.add_state("state.inner_state.inner_inner_state")
							.start_at("state")
							.start_at("state.inner_state")
							.start_at("state.inner_state.inner_inner_state")
							.set("x", "state", "1")
							.set("x", "state.inner_state", "2")
							.set("x", "state.inner_state.inner_inner_state", "3")
						;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 3);
				}
			}]
		},
		{
			name: "Adding start state values after the fact override previous values",
			expect: 1,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.add_state("state")
							.start_at("state")
							.set("x")
							.set("x", "(start)", "1");
						;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 1);
				}
			}]
		},
		{
			name: "Start state value does not override concurrent values",
			expect: 2,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.cd("obj")
							.add_state("state")
							.add_state("state.substate")
							.start_at("state")
							.start_at("state.substate")
							.set("x")
							.set("y")
							.set("y", "(start)", "1")
							.make_concurrent()
							.set("x", "(start)", "1")
							.set("x", "state.substate", "2")
							.set("y", "state.substate", "2")
						;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 2);
					equal(cobj.prop_val("y"), 2);
				}
			}]
		},
		{
			name: "Prioritize own state machine over inherited state machines",
			expect: 1,
			builtins: false,
			steps: [{
				setup: function(env) {
					env	.set("obj", "<stateful>")
						.set("proto_obj", "<stateful>")
						.cd("proto_obj")
							.add_state("proto_state")
							.start_at("proto_state")
							.up()
						.cd("obj")
							.set("(prototypes)", "(start)", "proto_obj")
							.add_state("state")
							.start_at("state")
							.set("x")
							.set("x", "proto_state", "2")
							.set("x", "state", "1")
						;
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("x"), 1);
				}
			}]
		},
		{
			name: "Simultaneous events across multiple objects",
			expect: 3,
			builtins: ["functions"],
			steps: [{
				setup: function(env) {
					env	.set("obj1", "<stateful>")
						.cd("obj1")
							.add_state("pre_click")
							.start_at("pre_click")
							.add_state("post_click")
							.add_transition("pre_click", "post_click", "on('click')")
							.set("x", "pre_click", "1")
							.set("x", "pre_click->post_click", "2")
							.set("x", "post_click", "3")
							.up()
						.set("obj2", "<stateful>")
						.cd("obj2")
							.add_state("pre_click")
							.start_at("pre_click")
							.add_state("post_click")
							.add_transition("pre_click", "post_click", "on('click')")
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
					var ev = document.createEvent("MouseEvent");
					ev.initMouseEvent("click");

					window.dispatchEvent(ev);
					_.defer(function() {
						equal(obj2.prop_val("x"), 3);
						equal(obj2.prop_val("y"), 2);
						callback();
					}, 10);
				}
			}]
		},
		{
			name: "Transition timing: continuous in start,states / one-time in transitions",
			expect: 17,
			builtins: ["functions"],
			steps: [{
				setup: function(env) {
					env.set("dynamic_obj", "<stateful>")
						.cd("dynamic_obj")
							.add_state("state1")
							.start_at("state1")
							.add_state("state2")
							.add_transition("state1", "state2", "on('dynamic_fwd')")
							.add_transition("state2", "state1", "on('dynamic_back')")
							.set("x", "state1", "1")
							.set("x", "state2", "2")
							.up()
						.set("obj", "<stateful>")
						.cd("obj")
							.add_state("s1")
							.start_at("s1")
							.add_state("s2")
							.add_transition("s1", "s2", "on('forward')")
							.add_transition("s2", "s1", "on('back')")
							.set("x", "(start)", "dynamic_obj.x")
							.set("y", "s1", "dynamic_obj.x")
							.set("z", "s1->s2", "dynamic_obj.x")

				},
				test: function(env, runtime, signal_async) {
					var obj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					
					equal(obj.prop_val("x"), 1);
					equal(obj.prop_val("y"), 1);
					ist.emit("forward");
					equal(obj.prop_val("x"), 1);
					equal(obj.prop_val("y"), 1);
					equal(obj.prop_val("z"), 1);
					ist.emit("dynamic_fwd")
					equal(obj.prop_val("x"), 2);
					equal(obj.prop_val("y"), 2);
					equal(obj.prop_val("z"), 1);
					ist.emit("back");
					equal(obj.prop_val("x"), 2);
					equal(obj.prop_val("y"), 2);
					equal(obj.prop_val("z"), 1);
					ist.emit("forward");
					equal(obj.prop_val("x"), 2);
					equal(obj.prop_val("y"), 2);
					equal(obj.prop_val("z"), 2);
					ist.emit("dynamic_back");
					equal(obj.prop_val("x"), 1);
					equal(obj.prop_val("y"), 1);
					equal(obj.prop_val("z"), 2);
				}
			}]
		},
		/**/
	];
	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
