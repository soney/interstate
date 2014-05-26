(function(ist) {
	module("State Machine");
	var _ = ist._;
	/*

	test("Inactive transitions are deactivated", function() {
		var statechart = new ist.Statechart();
		statechart.add_state("state1");
		statechart.starts_at("state1")
		var active_states = statechart.get_active_states(),
			active_state_names = _.map(active_states, function(x) { return x.get_name(); });
		statechart.add_state("state2");

		var state1 = statechart.find_state("state1"),
			state2 = statechart.find_state("state2");
		var fwd = new ist.ManualEvent(),
			bak = new ist.ManualEvent();
		statechart.add_transition("state1", "state2", fwd);
		var forward_transition = statechart._last_transition;
		statechart.add_transition("state2", "state1", bak);
		var backward_transition = statechart._last_transition;

		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.is_active());
		ok(!backward_transition.is_active());

		fwd.fire();
		deepEqual(active_state_names, ["state2", "state2.(start)"]);

		ok(!forward_transition.is_active());
		ok(backward_transition.is_active());

		bak.fire();

		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.is_active());
		ok(!backward_transition.is_active());


		forward_transition.set_from(state_2);
		forward_transition.set_to(state_1);

		backward_transition.set_from(state_1);
		backward_transition.set_to(state_2);

		var tmp = forward_transition;
		forward_transition = backward_transition;
		backward_transition = tmp;
		
		ok(forward_transition.is_active());
		ok(!backward_transition.is_active());

		fwd.fire();
		deepEqual(active_state_names, ["state2", "state2.(start)"]);

		ok(!forward_transition.is_active());
		ok(backward_transition.is_active());

		bak.fire();

		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.is_active());
		ok(!backward_transition.is_active());

		statechart.destroy();
	});

	test("Transitions amongs substates", function() {
		var statechart = new ist.Statechart();
		statechart.add_state("state1");
		statechart.add_state("state1.substate1");
		statechart.starts_at("state1")
		var active_states = statechart.get_active_states(),
			active_state_names = _.map(active_states, function(x) { return x.get_name(); });
		statechart.add_state("state2");
		statechart.add_state("state2.substate2");

		var state1 = statechart.find_state("state1.substate1"),
			state2 = statechart.find_state("state2.substate2");
		var fwd = new ist.ManualEvent(),
			bak = new ist.ManualEvent(),
			out = new ist.ManualEvent();
		statechart.add_transition("state1.substate1", "state2.substate2", fwd);
		var forward_transition = statechart._last_transition;
		statechart.add_transition("state2.substate2", "state1.substate1", bak);
		var backward_transition = statechart._last_transition;
		statechart.add_transition("state2.substate2", "state2", bak);

		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.is_active());
		ok(!backward_transition.is_active());

		fwd.fire();
		deepEqual(active_state_names, ["state2", "state2.(start)"]);

		ok(!forward_transition.is_active());
		ok(backward_transition.is_active());

		bak.fire();

		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.is_active());
		ok(!backward_transition.is_active());


		forward_transition.set_from(state_2);
		forward_transition.set_to(state_1);

		backward_transition.set_from(state_1);
		backward_transition.set_to(state_2);

		var tmp = forward_transition;
		forward_transition = backward_transition;
		backward_transition = tmp;
		
		ok(forward_transition.is_active());
		ok(!backward_transition.is_active());

		fwd.fire();
		deepEqual(active_state_names, ["state2", "state2.(start)"]);

		ok(!forward_transition.is_active());
		ok(backward_transition.is_active());

		bak.fire();

		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.is_active());
		ok(!backward_transition.is_active());

		out.fire();

		statechart.destroy();
	});
	*/
}(interstate));
