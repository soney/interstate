(function(ist) {
	module("State Machine");
	var _ = ist._;

	test("Inactive transitions are deactivated", function() {
		var statechart = new ist.State(),
			active_state_names;
		statechart.addSubstate("state1");
		statechart.addSubstate("state1");
		statechart.addSubstate("state2");

		var fwd = new ist.ManualEvent(),
			bak = new ist.ManualEvent();

		statechart.addTransition("state1", "state2", fwd);
		statechart.addTransition("state2", "state1", bak);

		var contextualStatechart = new ist.Pointer({stack: [statechart]}).getContextualObject();

		contextualStatechart.print();

		/*

		var state1 = statechart.find_state("state1"),
			state2 = statechart.find_state("state2"),

			fwd = new ist.ManualEvent(),
			bak = new ist.ManualEvent();

		statechart.add_transition("state1", "state2", fwd);
		var forward_transition = statechart._last_transition;

		statechart.add_transition("state2", "state1", bak);
		var backward_transition = statechart._last_transition;

		active_state_names = _.map(statechart.get_active_states(), function(x) { return x.get_name(); });
		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.is_enabled());
		ok(!backward_transition.is_enabled());

		fwd.fire();
		active_state_names = _.map(statechart.get_active_states(), function(x) { return x.get_name(); });
		deepEqual(active_state_names, ["state2", "state2.(start)"]);

		ok(!forward_transition.is_enabled());
		ok(backward_transition.is_enabled());

		bak.fire();

		active_state_names = _.map(statechart.get_active_states(), function(x) { return x.get_name(); });
		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.is_enabled());
		ok(!backward_transition.is_enabled());


		forward_transition.setFrom(state2);
		forward_transition.setTo(state1);

		backward_transition.setFrom(state1);
		backward_transition.setTo(state2);

		var tmp = forward_transition;
		forward_transition = backward_transition;
		backward_transition = tmp;

		tmp = fwd;
		fwd = bak;
		bak = tmp;
		
		ok(forward_transition.is_enabled());
		ok(!backward_transition.is_enabled());

		fwd.fire();
		active_state_names = _.map(statechart.get_active_states(), function(x) { return x.get_name(); });
		deepEqual(active_state_names, ["state2", "state2.(start)"]);

		ok(!forward_transition.is_enabled());
		ok(backward_transition.is_enabled());

		bak.fire();

		active_state_names = _.map(statechart.get_active_states(), function(x) { return x.get_name(); });
		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.is_enabled());
		ok(!backward_transition.is_enabled());

		statechart.destroy();
		*/
	});

	test("Transitions amongst substates", function() {
		var statechart = new ist.Statechart(),
			active_state_names;

		statechart	.add_state("state1")
					.starts_at("state1")
					.add_state("state2")
					.add_state("state1.sub1.substate1")

					.add_state("state2.sub1.substate1")
					.add_state("state2.sub1.substate2")

					.add_state("state2.sub2.substate1")
					.add_state("state2.sub2.substate2")

		var state1 = statechart.find_state("state1"),
			state1_sub1 = state1.find_state("sub1"),
			state1_sub1_substate1 = state1_sub1.find_state("substate1"),

			state2 = statechart.find_state("state2"),
			state2_sub1 = state2.find_state("sub1"),
			state2_sub1_substate1 = state2_sub1.find_state("substate1"),
			state2_sub1_substate2 = state2_sub1.find_state("substate2"),
			state2_sub2 = state2.find_state("sub2"),
			state2_sub2_substate1 = state2_sub2.find_state("substate1"),
			state2_sub2_substate2 = state2_sub2.find_state("substate2");

		state1.starts_at("sub1");
		state1_sub1.starts_at("substate1");

		state2.starts_at("sub1");
		state2_sub1.starts_at("substate1");
		state2_sub2.starts_at("substate1");


		deepEqual(_.map(statechart.get_active_states(), function(x) { return x.get_name(); }),
			["state1", "state1.sub1", "state1.sub1.substate1", "state1.sub1.substate1.(start)"]);


		var state1_state2_sub2 = new ist.ManualEvent();

		statechart.add_transition("state1", "state2.sub2", state1_state2_sub2);

		state1_state2_sub2.fire();
		deepEqual(_.map(statechart.get_active_states(), function(x) { return x.get_name(); }),
			["state2", "state2.sub2", "state2.sub2.substate1", "state2.sub2.substate1.(start)"]);

		statechart.destroy();
	});

/**/
}(interstate));
