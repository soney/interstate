(function(red) {
var cjs = red.cjs, _ = red._;


red.RootStatechartView = function(statechart, layout_engine, paper) {
	this.statechart = statechart;
	this.layout_engine = layout_engine;
	this.object_views = new Map({
		hash: "hash"
	});
	this.paper = paper;
	var layout = this.layout_engine._compute_layout();
	layout.each(function(layout_info, state) {
		console.log(layout_info);
		if(state instanceof red.Statechart) {
			var pts = [layout_info.left_wing_start, layout_info.left_wing_end, layout_info.right_wing_start, layout_info.right_wing_end];
			var path_str = "M" + _.map(pts, function(pt) {
				return pt.x+","+pt.y
			}).join("L");
			this.paper.path(path_str).attr("stroke", "green");
			this.paper.circle(layout_info.center.x, layout_info.center.y, 10).attr("stroke", "red");
		} else {
			if(layout_info.from && layout_info.to) {
				var pts = [layout_info.from, layout_info.to];
				var path_str = "M" + _.map(pts, function(pt) {
					return pt.x+","+pt.y
				}).join("L");
				this.paper.path(path_str).attr("stroke", "blue");
				this.paper.circle(layout_info.from.x, layout_info.from.y, 10).attr("stroke", "orange");
			}
		}
	}, this);
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
