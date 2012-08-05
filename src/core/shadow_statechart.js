(function(red) {
var cjs = red.cjs, _ = cjs._;

red._shadow_statechart = function(statechart) {
	var shadow = statechart.clone();

	shadow.equivalent_state = function(state) {
	};

	statechart	._on("state_added", function(event) {
					console.log("state added", event);
				})
				._on("state_removed", function(event) {
					console.log("state removed", event);
				})
				._on("transition_added", function(event) {
					console.log("transition added", event);
				})
				._on("transition_removed", function(event) {
					console.log("transition removed", event);
				});

	return shadow;
};
}(red));
