(function(red) {
var cjs = red.cjs, _ = red._;

var statecharts = {};

red.create_remote_statechart = function(wrapper_client) {
	var id = wrapper_client.cobj_id;
	var statechart = red.find_uid(id);
	if(!statechart) {
		if(statecharts.hasOwnProperty(id)) {
			statechart = statecharts[id];
		} else {
			statechart = new red.Statechart();
			statecharts[id] = statechart;
			statechart.add_state("INIT");
			statechart.starts_at("INIT");
			statechart.run();

			var substates = [];

			cjs.liven(function() {
				var new_substates = wrapper_client.get('get_substates') || [];
				if(new_substates) {
					new_substates = _.map(new_substates, function(subst) {
						return red.create_remote_statechart(subst);
					});
				}

				console.log(substates);
			});
		}
	}
	return statechart;
};

}(red));
