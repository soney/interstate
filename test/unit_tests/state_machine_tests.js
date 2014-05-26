(function(ist) {
	module("State Machine");
	var _ = ist._;

	test("Inactive transitions are deactivated", function() {
		var statechart = new ist.Statechart();
		statechart.add_state("state1");
		statechart.starts_at("state1")
		var active_states = statechart.get_active_states(),
			active_state_names = _.map(active_states, function(x) { return x.get_name(); });
		deepEqual(active_state_names, ["state1", "state1.(start)"]);
		statechart.add_state("state2");
		var fwd = new ist.Event(),
			bak = new ist.Event(),
			forward_transition = statechart.add_transition("state1", "state2", fwd),
			backward_transition = statechart.add_transition("state2", "state1", bak);
		//fwd.fire();

		statechart.destroy();
	});

	var tests = [
	/*
		{
			name: "Inactive transitions are deactivated",
			expect: 0,
			create_builtins: false,
			steps: [{
				test: function() {
					var statechart = new ist.Statechart();
					console.log(statechart);
				}
			}]
		},
		{
			name: "Transitions are activated/deactivated when their from/to value changes",
			expect: 0,
			create_builtins: false,
			steps: [{
				setup: function(env) {
				},
				test: function(env, runtime) {
				}
			}]
		},
		{
			name: "Transitions into substates",
			expect: 0,
			create_builtins: false,
			steps: [{
				setup: function(env) {
				},
				test: function(env, runtime) {
				}
			}]
		},
		{
			name: "Transitions from one substate into another substate",
			expect: 0,
			create_builtins: false,
			steps: [{
				setup: function(env) {
				},
				test: function(env, runtime) {
				}
			}]
		},
		{
			name: "Transition from a substate into a parent state",
			expect: 0,
			create_builtins: false,
			steps: [{
				setup: function(env) {
				},
				test: function(env, runtime) {
				}
			}]
		}
		/**/
	];

	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
