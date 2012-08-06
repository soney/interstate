(function(red) {
var cjs = red.cjs, _ = cjs._;

var do_shadow = function(statechart, shadow) {
	var substate_names = statechart.get_substate_names();
	_.forEach(substate_names, function(substate_name) {
		var substate = statechart.get_state_with_name(substate_name);
		var shadow_substate;
		if(shadow.has_state(substate_name)) {
			shadow_substate = shadow.get_state_with_name(substate_name);
		} else {
			shadow_substate = substate.clone();
			shadow.add_state(substate_name, shadow_substate);
		}

		do_shadow(substate, shadow_substate);
	});
	statechart	._on("state_added", function(event) {
					var substate_name = event.state_name
						, substate = event.state;

					if(shadow.has_state(substate_name)) {
						shadow_substate = shadow.get_state_with_name(substate_name);
					} else {
						shadow_substate = substate.clone();
						shadow.add_state(substate_name, shadow_substate);
					}

					do_shadow(substate, shadow_substate);
				})
				._on("state_removed", function(event) {
					var substate_name = event.state_name
						, substate = event.state;

					if(shadow.has_state(substate_name)) {
						shadow.remove_state(substate_name);
					}
				})
				._on("transition_added", function(event) {
					console.log("transition added", event);
				})
				._on("transition_removed", function(event) {
					console.log("transition removed", event);
				})
				._on("destroy", function(event) {
					console.log("destroyed");
				});
};

red._shadow_statechart = function(statechart) {
	var shadow = statechart.clone();
	do_shadow(statechart, shadow);
	return shadow;
};
}(red));
