(function(red) {
var cjs = red.cjs, _ = red._;


red.RootStatechartView = function(statechart, layout_engine, paper) {
	this.statechart = statechart;
	this.layout_engine = layout_engine;
	this.object_views = new Map({
		hash: "hash"
	});
	this.paper = paper;
};

(function(my) {
	var proto = my.prototype;
	proto.get_view = function(obj) {
		return this.object_views.get_or_put(obj, function() {
			if(obj instanceof red.StatechartTransition) {
				if(obj.from() instanceof red.StartState) {
					return new red.StartTransitionView({
							paper: this.paper,
							transition: obj
						});
				} else {
					return new red.TransitionView({
							paper: this.paper,
							transition: obj
						});
				}
			} else {
				return new red.StateView({
						paper: this.paper,
						state: obj
					});
			}
		}, this);
	};
}(red.RootStatechartView));


red.StateView = function(paper, options) {
	able.make_this_optionable(this, {
	}, options);
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_optionable(proto);
}(red.StateView));

red.TransitionView = function(paper, options) {
	able.make_this_optionable(this, {
	}, options);
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_optionable(proto);
}(red.TransitionView));

red.StartTransitionView = function(paper, options) {
	able.make_this_optionable(this, {
	}, options);
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_optionable(proto);
}(red.StartTransitionView));

}(red));
