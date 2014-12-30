(function(ist) {
	module("State Machine");
	var _ = ist._;

	test("Inactive transitions are deactivated", function() {
		var statechart = new ist.State(),
			active_state_names;
		statechart.addSubstate("state1");
		statechart.addSubstate("state2");
		statechart.startsAt("state1");

		var fwd = new ist.Event(),
			bak = new ist.Event(),
			fwd_t = statechart.addTransition("state1", "state2", fwd),
			bak_t = statechart.addTransition("state2", "state1", bak),
			s1 = statechart.getSubstate("state1"),
			s2 = statechart.getSubstate("state2");

		var contextualStatechart = new ist.Pointer({stack: [statechart]}).getContextualObject();


		active_state_names = _.map(contextualStatechart.getActiveSubstates(), function(x) { return x.getName(); });
		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		var state1 = contextualStatechart.getSubstate("state1"),
			state2 = contextualStatechart.getSubstate("state2"),
			forward_transition = state1.getOutgoingTransitions()[0],
			backward_transition = state1.getIncomingTransitions()[1];


		ok(forward_transition.isEnabled());
		ok(!backward_transition.isEnabled());

		fwd.fire();

		active_state_names = _.map(contextualStatechart.getActiveSubstates(), function(x) { return x.getName(); });
		deepEqual(active_state_names, ["state2", "state2.(start)"]);

		ok(!forward_transition.isEnabled());
		ok(backward_transition.isEnabled());

		bak.fire();

		active_state_names = _.map(contextualStatechart.getActiveSubstates(), function(x) { return x.getName(); });
		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.isEnabled());
		ok(!backward_transition.isEnabled());


		fwd_t.setFrom(s2);
		fwd_t.setTo(s1);

		bak_t.setFrom(s1);
		bak_t.setTo(s2);


		var tmp = fwd_t;
		fwd_t = bak_t;
		bak_t = tmp;

		tmp = bak;
		bak = fwd;
		fwd = tmp;

		forward_transition = state1.getOutgoingTransitions()[0];
		backward_transition = state1.getIncomingTransitions()[1];

		ok(forward_transition.isEnabled());
		ok(!backward_transition.isEnabled());

		fwd.fire();

		active_state_names = _.map(contextualStatechart.getActiveSubstates(), function(x) { return x.getName(); });
		deepEqual(active_state_names, ["state2", "state2.(start)"]);

		ok(!forward_transition.isEnabled());
		ok(backward_transition.isEnabled());

		bak.fire();

		active_state_names = _.map(contextualStatechart.getActiveSubstates(), function(x) { return x.getName(); });
		deepEqual(active_state_names, ["state1", "state1.(start)"]);

		ok(forward_transition.isEnabled());
		ok(!backward_transition.isEnabled());
		statechart.destroy();
		/**/
	});

	test("Transitions amongst substates", function() {
		var statechart = new ist.State(),
			active_state_names;

		var state1 = statechart.addSubstate("state1"),
			state2 = statechart.addSubstate("state2"),
			state1_sub1 = state1.addSubstate("sub1"),
			state2_sub2 = state2.addSubstate("sub2"),
			state1_sub1_substate1 = state1_sub1.addSubstate("substate1"),
			state1_sub1_substate2 = state1_sub1.addSubstate("substate2"),
			state2_sub2_substate1 = state2_sub2.addSubstate("substate1"),
			state2_sub2_substate2 = state2_sub2.addSubstate("substate2");
		statechart.startsAt("state1");
		state1.startsAt("sub1");
		state2.startsAt("sub2");
		state1_sub1.startsAt("substate1");
		state2_sub2.startsAt("substate1");

		var contextualStatechart = new ist.Pointer({stack: [statechart]}).getContextualObject();
		var active_state_names = _.map(contextualStatechart.getActiveSubstates(), function(x) { return x.getName(); });
		deepEqual(active_state_names,
			["state1", "state1.sub1", "state1.sub1.substate1", "state1.sub1.substate1.(start)"]);


		var state1_state2_sub2 = new ist.Event();
		statechart.addTransition("state1", "state2.sub2", state1_state2_sub2);
		state1_state2_sub2.fire();


		var active_state_names = _.map(contextualStatechart.getActiveSubstates(), function(x) { return x.getName(); });
		deepEqual(active_state_names,
			["state2", "state2.sub2", "state2.sub2.substate1", "state2.sub2.substate1.(start)"]);

		statechart.destroy();
	});

/**/
}(interstate));
